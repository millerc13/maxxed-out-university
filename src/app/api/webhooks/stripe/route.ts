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
    // GHL UI shows what was purchased. The resolved contactId is hoisted
    // out so the SMS send below can reach it.
    let ghlContactId: string | null = null;
    if (userEmail) {
      try {
        const { linkUserToGhlContactByEmail, syncCoursePurchase } = await import('@/lib/ghl');
        ghlContactId = await linkUserToGhlContactByEmail(resolvedUserId, userEmail);
        if (ghlContactId && courseSlug) {
          await syncCoursePurchase(ghlContactId, courseSlug);
        }
      } catch (err) {
        console.error('[stripe-webhook] GHL link/tag failed (non-fatal)', err);
      }
    }

    const purchasedCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        isBundle: true,
        thumbnail: true,
        title: true,
        slug: true,
        checkoutAfterApply: true,
        welcomeSmsBody: true,
        welcomeEmailSubject: true,
        welcomeEmailBody: true,
        autoSendContract: true,
        metaPixelId: true,
        metaCapiAccessToken: true,
        metaTestEventCode: true,
      },
    });

    // Server-side Meta CAPI Purchase mirror. event_id is the Stripe
    // payment_intent.id so the matching browser-side Purchase fired by
    // /checkout/success (which uses the same payment_intent search
    // param as eventId) collapses to one conversion in Ads Manager.
    if (purchasedCourse?.metaPixelId) {
      const [firstName, ...rest] = (userName ?? '').trim().split(/\s+/);
      const lastName = rest.join(' ');
      const { sendCapiEvent } = await import('@/lib/meta-capi');
      sendCapiEvent({
        pixelId: purchasedCourse.metaPixelId,
        accessToken: purchasedCourse.metaCapiAccessToken,
        testEventCode: purchasedCourse.metaTestEventCode,
        eventName: 'Purchase',
        eventId: paymentIntent.id,
        userData: {
          email: userEmail || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          externalId: resolvedUserId,
        },
        customData: {
          value: paymentIntent.amount / 100,
          currency: (paymentIntent.currency || 'usd').toUpperCase(),
          content_ids: purchasedCourse.slug ? [purchasedCourse.slug] : [courseId],
          content_name: purchasedCourse.title,
          content_type: 'product',
          num_items: 1,
          order_id: paymentIntent.id,
        },
      }).then((r) => {
        if (!r.ok && !('skipped' in r)) {
          console.warn('[stripe-webhook] Meta CAPI Purchase failed:', r.error);
        }
      });
    }
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

    // Always mint a magic-link token + short code. The full token goes
    // in the setup-password email; the short code goes in the SMS for
    // one-tap login from the buyer's phone.
    let activateToken: string | null = null;
    let activateShortCode: string | null = null;
    if (userEmail) {
      try {
        const ml = await createMagicLink(resolvedUserId);
        activateToken = ml.token;
        activateShortCode = ml.shortCode;
        console.log('[stripe-webhook] Magic link created', { userId: resolvedUserId, tokenPrefix: ml.token.slice(0, 8) + '...', shortCode: ml.shortCode });
      } catch (err) {
        console.error('[stripe-webhook] Magic link create failed (non-fatal)', { error: err instanceof Error ? err.message : err });
      }
    }

    // Render admin-edited subject/body overrides (if set) using the same
    // tokens the SMS uses, so {{firstName}}/{{courseTitle}} etc. resolve
    // consistently across channels.
    const baseUrlForEmail = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');
    const firstNameForEmail = (userName || '').trim().split(/\s+/)[0] || 'there';
    const emailTokens = {
      firstName: firstNameForEmail,
      customerName: userName || firstNameForEmail,
      courseTitle: cName,
      shortUrl: activateShortCode ? `${baseUrlForEmail}/a/${activateShortCode}` : '',
      activateUrl: activateToken ? `${baseUrlForEmail}/auth/activate?token=${activateToken}` : '',
    };
    const { renderTokens: renderEmailTokens } = await import('@/lib/delivery');
    const subjectOverride = purchasedCourse?.welcomeEmailSubject
      ? renderEmailTokens(purchasedCourse.welcomeEmailSubject, emailTokens)
      : null;
    const bodyOverride = purchasedCourse?.welcomeEmailBody
      ? renderEmailTokens(purchasedCourse.welcomeEmailBody, emailTokens)
      : null;

    if (needsPasswordSetup && userEmail && activateToken) {
      // User has no password yet — send magic link so they can activate + set password.
      console.log('[stripe-webhook] Sending magic-link email — user needs password setup', { userId: resolvedUserId, email: userEmail });
      try {
        const emailResult = await sendMagicLinkEmail({
          to: userEmail,
          name: userName,
          token: activateToken,
          courseName: cName,
          courseThumbnail: purchasedCourse?.thumbnail,
          bonusBox,
          teamReachOutNote,
          subjectOverride,
          bodyOverride,
        });
        console.log('[stripe-webhook] Magic link email sent', { emailId: emailResult?.data?.id, error: emailResult?.error });
      } catch (err) {
        console.error('[stripe-webhook] Magic link email failed', { error: err instanceof Error ? err.message : err, stack: err instanceof Error ? err.stack : undefined });
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
          subjectOverride,
          bodyOverride,
        });
        console.log('[stripe-webhook] Course-added email sent', { emailId: emailResult?.data?.id, error: emailResult?.error });
      } catch (err) {
        console.error('[stripe-webhook] Course-added email failed', { error: err instanceof Error ? err.message : err });
        throw err;
      }
    } else {
      console.warn('[stripe-webhook] No email sent — userEmail empty', { needsPasswordSetup, resolvedUserId });
    }

    // Magic-link SMS via GHL. Body branches on whether the course is an
    // apply→checkout high-ticket program (team will reach out — point
    // them at Blueprint while they wait) vs self-serve (just hand them
    // the link). Sent for every buyer (new + returning) whenever we have
    // a GHL contact + short code. SMS failure never breaks the enrollment.
    if (ghlContactId && activateShortCode && activateToken) {
      try {
        const { sendGhlSms } = await import('@/lib/ghl');
        const { buildSmsBody } = await import('@/lib/delivery');
        const baseUrl = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');
        const activateShortUrl = `${baseUrl}/a/${activateShortCode}`;
        const activateUrl = `${baseUrl}/auth/activate?token=${activateToken}`;
        const firstName = (userName || '').trim().split(/\s+/)[0] || 'there';
        const smsBody = buildSmsBody(
          {
            title: cName,
            checkoutAfterApply: purchasedCourse?.checkoutAfterApply,
            isBundle: purchasedCourse?.isBundle,
            welcomeSmsBody: purchasedCourse?.welcomeSmsBody,
          },
          {
            firstName,
            customerName: userName || firstName,
            courseTitle: cName,
            shortUrl: activateShortUrl,
            activateUrl,
          },
        );
        await sendGhlSms(ghlContactId, smsBody);
        console.log('[stripe-webhook] Magic-link SMS sent', { contactId: ghlContactId });
      } catch (err) {
        console.error('[stripe-webhook] Magic-link SMS failed (non-fatal)', { error: err instanceof Error ? err.message : err });
      }
    } else {
      console.log('[stripe-webhook] Skipping magic-link SMS', { hasGhlContact: !!ghlContactId, hasShortCode: !!activateShortCode });
    }

    // E-sign contract auto-send. Only fires when the course has the
    // autoSendContract toggle on (admin enables per-course in the
    // Delivery tab). Wrapped — contract failure never breaks enrollment.
    if (purchasedCourse?.autoSendContract && userEmail) {
      try {
        const { sendStandardEnrollmentDocument } = await import('@/lib/esign-flow');
        await sendStandardEnrollmentDocument({
          userId: resolvedUserId,
          email: userEmail,
          name: userName,
          courseId,
          courseSlug: purchasedCourse.slug || courseSlug || '',
          courseTitle: cName,
          paidCents: paymentIntent.amount,
          transactionId: paymentIntent.id,
          // See fanbasis route for context — esign-flow uses this to
          // also send an SMS with the signing link.
          ghlContactId,
        });
        console.log('[stripe-webhook] E-sign contract auto-sent', { userId: resolvedUserId, courseId });
      } catch (err) {
        console.error('[stripe-webhook] E-sign auto-send failed (non-fatal)', { error: err instanceof Error ? err.message : err });
      }
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
