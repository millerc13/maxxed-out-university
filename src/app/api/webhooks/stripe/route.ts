import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail, sendCourseAddedEmail } from '@/lib/resend';
import { enrollInBundle, enrollIncludedBundles } from '@/lib/enrollment';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  console.log('[stripe-webhook] Received request', { hasSignature: !!signature, bodyLength: rawBody.length });

  if (!signature) {
    console.error('[stripe-webhook] No stripe-signature header');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('[stripe-webhook] Signature verified', { eventType: event.type, eventId: event.id });
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log('[stripe-webhook] Processing payment_intent.succeeded', { paymentIntentId: paymentIntent.id, amount: paymentIntent.amount, metadata: paymentIntent.metadata });
    await handlePaymentSucceeded(paymentIntent);
  } else {
    console.log('[stripe-webhook] Ignoring event type', { eventType: event.type });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const {
    courseId, courseSlug, courseTitle,
    userId, guestEmail, guestName, guestPhone, isGuest,
    promoCodeId, originalPrice,
  } = paymentIntent.metadata;

  console.log('[stripe-webhook] handlePaymentSucceeded start', {
    paymentIntentId: paymentIntent.id,
    courseId, courseSlug, courseTitle,
    isGuest, guestEmail, guestName,
    userId, amount: paymentIntent.amount,
  });

  if (!courseId) {
    console.error('[stripe-webhook] Missing courseId in metadata', { paymentIntentId: paymentIntent.id, metadata: paymentIntent.metadata });
    return;
  }

  try {
    let resolvedUserId = userId;
    let userEmail = '';
    let userName = guestName || 'Student';
    let needsPasswordSetup = false;

    // If userId was passed from an authed checkout but the user no longer
    // exists (deleted since the PaymentIntent was created), treat this as
    // a guest flow so we fall back to find-or-create by email instead of
    // failing the enrollment's foreign key.
    let authedUserMissing = false;
    if (userId && isGuest !== 'true') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, passwordHash: true } });
      if (user) {
        resolvedUserId = userId;
        userEmail = user.email;
        userName = user.name || 'Student';
        needsPasswordSetup = !user.passwordHash;
        console.log('[stripe-webhook] Authenticated checkout, loaded user', { userId });
      } else {
        console.warn('[stripe-webhook] userId in metadata no longer exists — falling back to email lookup', { staleUserId: userId, guestEmail });
        authedUserMissing = true;
        resolvedUserId = '';
      }
    }

    // Authed checkouts store guestEmail: '' in metadata, so when a stale userId
    // forces the fallback, there's no guestEmail to find-or-create against.
    // paymentIntent.receipt_email has the actual buyer's email — use it as the
    // last-resort recovery address.
    const fallbackEmail = guestEmail || (authedUserMissing ? (paymentIntent.receipt_email || '') : '');

    if ((isGuest === 'true' || authedUserMissing) && fallbackEmail) {
      userEmail = fallbackEmail;
      console.log('[stripe-webhook] Email-based checkout — finding or creating user', { email: fallbackEmail, reason: authedUserMissing ? 'stale-userId-fallback' : 'guest', via: guestEmail ? 'metadata.guestEmail' : 'paymentIntent.receipt_email' });
      let user = await prisma.user.findUnique({ where: { email: fallbackEmail } });

      if (!user) {
        console.log('[stripe-webhook] Creating new user', { email: fallbackEmail, name: guestName });
        user = await prisma.user.create({
          data: {
            email: fallbackEmail,
            name: guestName || null,
            mustChangePassword: true,
          },
        });
        needsPasswordSetup = true;
      } else {
        needsPasswordSetup = !user.passwordHash;
      }

      resolvedUserId = user.id;
      userName = user.name || guestName || 'Student';
    }

    if (!resolvedUserId) {
      console.error('[stripe-webhook] Could not resolve userId', { paymentIntentId: paymentIntent.id, userId, guestEmail, isGuest });
      return;
    }

    console.log('[stripe-webhook] Upserting enrollment', { userId: resolvedUserId, courseId, transactionId: paymentIntent.id });
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: resolvedUserId, courseId } },
      create: {
        userId: resolvedUserId,
        courseId,
        source: 'stripe',
        transactionId: paymentIntent.id,
        promoCodeId: promoCodeId || null,
        originalPrice: originalPrice ? parseInt(originalPrice) : null,
        metadata: {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          courseSlug,
          userEmail,
        },
      },
      update: {},
    });
    console.log('[stripe-webhook] Enrollment upserted', { enrollmentId: enrollment.id, createdAt: enrollment.enrolledAt });

    // Link buyer to GHL contact + tag with the course they bought, so
    // /admin/messages classifies them as a Sale and the closer-side
    // GHL UI shows what was purchased.
    if (userEmail) {
      try {
        const { linkUserToGhlContactByEmail, syncCoursePurchase } = await import('@/lib/ghl');
        const contactId = await linkUserToGhlContactByEmail(resolvedUserId, userEmail);
        if (contactId && courseSlug) {
          await syncCoursePurchase(contactId, courseSlug);
        }
      } catch (err) {
        console.error('[stripe-webhook] GHL link/tag failed (non-fatal)', err);
      }
    }

    const purchasedCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: { isBundle: true, thumbnail: true, title: true },
    });
    console.log('[stripe-webhook] Loaded course', { courseId, isBundle: purchasedCourse?.isBundle, title: purchasedCourse?.title });

    if (purchasedCourse?.isBundle) {
      console.log('[stripe-webhook] Bundle detected, enrolling in child courses', { bundleId: courseId });
      await enrollInBundle(resolvedUserId, courseId, 'stripe', paymentIntent.id);
      console.log('[stripe-webhook] Bundle enrollment complete');
    }

    // Included bundles — DWY/Mentorship buyers also get the Blueprint bundle.
    await enrollIncludedBundles(resolvedUserId, courseId, 'stripe', paymentIntent.id);

    if (promoCodeId) {
      console.log('[stripe-webhook] Incrementing promo code usage', { promoCodeId });
      await prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { currentUses: { increment: 1 } },
      });
    }

    console.log('[stripe-webhook] Enrollment created', { userId: resolvedUserId, courseId, paymentIntentId: paymentIntent.id, needsPasswordSetup });

    const cName = courseTitle || 'your course';

    // High-ticket programs include the Real Estate Empire Blueprint bundle
    // for free + an onboarding call. Surface both in the welcome email.
    const HIGH_TICKET_COURSE_IDS = new Set(['ht_done_with_you', 'ht_mentorship_12mo']);
    const isHighTicket = HIGH_TICKET_COURSE_IDS.has(courseId);
    const bonusBox = isHighTicket
      ? {
          title: 'Real Estate Empire Blueprint — full course library',
          body: "You also have full access to the entire Blueprint curriculum (Wholesaling, Fix &amp; Flip, BRRRR, Property Management, Deal Analysis, and more). Start exploring the moment you set up your account.",
        }
      : null;
    const teamReachOutNote = isHighTicket;

    if (needsPasswordSetup && userEmail) {
      // User has no password yet — send magic link so they can activate + set password.
      console.log('[stripe-webhook] Creating magic link — user needs password setup', { userId: resolvedUserId, email: userEmail });
      try {
        const token = await createMagicLink(resolvedUserId);
        console.log('[stripe-webhook] Magic link created', { userId: resolvedUserId, tokenPrefix: token.slice(0, 8) + '...' });
        const emailResult = await sendMagicLinkEmail({
          to: userEmail,
          name: userName,
          token,
          courseName: cName,
          courseThumbnail: purchasedCourse?.thumbnail,
          bonusBox,
          teamReachOutNote,
        });
        console.log('[stripe-webhook] Magic link email sent', { emailId: emailResult?.data?.id, error: emailResult?.error });
      } catch (err) {
        console.error('[stripe-webhook] Magic link / email failed', { error: err instanceof Error ? err.message : err, stack: err instanceof Error ? err.stack : undefined });
        throw err;
      }
    } else if (userEmail) {
      // Returning user with password already set — course-added email with login link.
      console.log('[stripe-webhook] Sending course-added email to returning user', { to: userEmail, courseName: cName });
      try {
        const loginUrl = `${process.env.NEXTAUTH_URL || 'https://university.maxxedout.com'}/login`;
        const emailResult = await sendCourseAddedEmail({
          to: userEmail,
          name: userName,
          courseName: cName,
          loginUrl,
          courseThumbnail: purchasedCourse?.thumbnail,
          bonusBox,
          teamReachOutNote,
        });
        console.log('[stripe-webhook] Course-added email sent', { emailId: emailResult?.data?.id, error: emailResult?.error });
      } catch (err) {
        console.error('[stripe-webhook] Course-added email failed', { error: err instanceof Error ? err.message : err });
        throw err;
      }
    } else {
      console.warn('[stripe-webhook] No email sent — userEmail empty', { needsPasswordSetup, resolvedUserId });
    }
  } catch (error) {
    console.error('[stripe-webhook] Failed to handle payment', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      paymentIntentId: paymentIntent.id,
    });
    throw error;
  }
}
