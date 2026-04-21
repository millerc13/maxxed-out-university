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

    if (isGuest === 'true' && guestEmail) {
      userEmail = guestEmail;
      console.log('[stripe-webhook] Guest checkout — finding or creating user', { email: guestEmail });
      let user = await prisma.user.findUnique({ where: { email: guestEmail } });

      if (!user) {
        console.log('[stripe-webhook] Creating new user', { email: guestEmail, name: guestName });
        user = await prisma.user.create({
          data: {
            email: guestEmail,
            name: guestName || null,
            mustChangePassword: true,
          },
        });
        needsPasswordSetup = true;
        console.log('[stripe-webhook] New user created', { userId: user.id, email: user.email });
      } else {
        // Existing user record but no password yet — still needs the magic-link flow
        // to finish account setup, not a "course added" email that assumes they can log in.
        needsPasswordSetup = !user.passwordHash;
        console.log('[stripe-webhook] Existing user found', { userId: user.id, email: user.email, mustChangePassword: user.mustChangePassword });
      }

      resolvedUserId = user.id;
      userName = user.name || guestName || 'Student';
    } else if (userId) {
      console.log('[stripe-webhook] Authenticated checkout, loading user', { userId });
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      userEmail = user?.email ?? '';
      userName = user?.name ?? 'Student';
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
    if (needsPasswordSetup && userEmail) {
      // User has no password yet — send magic link so they can activate + set password.
      console.log('[stripe-webhook] Creating magic link — user needs password setup', { userId: resolvedUserId, email: userEmail });
      try {
        const token = await createMagicLink(resolvedUserId);
        console.log('[stripe-webhook] Magic link created', { userId: resolvedUserId, tokenPrefix: token.slice(0, 8) + '...' });
        const emailResult = await sendMagicLinkEmail({ to: userEmail, name: userName, token, courseName: cName, courseThumbnail: purchasedCourse?.thumbnail });
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
        const emailResult = await sendCourseAddedEmail({ to: userEmail, name: userName, courseName: cName, loginUrl, courseThumbnail: purchasedCourse?.thumbnail });
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
