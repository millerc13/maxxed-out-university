import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCheckoutSession } from '@/lib/fanbasis';
import { isEffectivelyEnrolled } from '@/lib/enrollment';
import { sendAlreadyOwnedEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, guestEmail, guestName, guestPhone, promoCode, successUrl: callerSuccessUrl, eventId: callerEventId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    let session: { user?: { id?: string; email?: string | null; name?: string | null } } | null = null;
    try { session = await auth(); } catch { /* no session — treat as guest */ }
    const isGuest = !session?.user?.id;

    if (isGuest && !guestEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId, published: true },
      select: { id: true, title: true, price: true, salePrice: true, slug: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.price || course.price <= 0) {
      return NextResponse.json({ error: 'Course is free' }, { status: 400 });
    }

    if (!isGuest && session?.user?.id) {
      const enrolled = await isEffectivelyEnrolled(session.user.id, course.id);
      if (enrolled) {
        console.log('[fanbasis-checkout] Authenticated user already enrolled', { userId: session.user.id, courseId });
        return NextResponse.json({ error: 'You already own this course. Log in to access it.' }, { status: 409 });
      }
    }

    // Guest checkout — block duplicates by email and send already-owned email.
    let isExistingUser = false;
    if (isGuest && guestEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: guestEmail },
        select: { id: true, name: true },
      });
      if (existingUser) {
        isExistingUser = true;
        const enrolled = await isEffectivelyEnrolled(existingUser.id, course.id);
        if (enrolled) {
          console.log('[fanbasis-checkout] Guest email matches existing enrollment — blocking duplicate', { email: guestEmail, userId: existingUser.id, courseId });
          try {
            const loginUrl = `${process.env.NEXTAUTH_URL || 'https://university.maxxedout.com'}/login`;
            const courseFull = await prisma.course.findUnique({ where: { id: courseId }, select: { thumbnail: true } });
            await sendAlreadyOwnedEmail({
              to: guestEmail,
              name: existingUser.name || '',
              courseName: course.title,
              loginUrl,
              courseThumbnail: courseFull?.thumbnail ?? null,
            });
          } catch (emailErr) {
            console.error('[fanbasis-checkout] Failed to send already-owned email', { error: emailErr instanceof Error ? emailErr.message : emailErr });
          }
          return NextResponse.json(
            { error: `You already own ${course.title}. We sent an email to ${guestEmail} with a link to log in.`, alreadyOwned: true },
            { status: 409 }
          );
        }
      }
    }

    // A fixed salePrice override (e.g. the Blueprint "July Independence" $499)
    // IS the charge — no promo stacking on top. Only fall through to promo-code
    // discounting when there's no override.
    let finalAmount = course.salePrice ?? course.price;
    let resolvedPromoCodeId: string | null = null;

    if (course.salePrice == null && promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase().trim() },
        include: { courses: { select: { id: true } } },
      });

      const isValid =
        promo &&
        promo.active &&
        (!promo.expiresAt || promo.expiresAt > new Date()) &&
        (promo.maxUses === null || promo.currentUses < promo.maxUses) &&
        (promo.applyToAll || promo.courses.some((c) => c.id === courseId));

      if (isValid && promo) {
        const discount =
          promo.discountType === 'PERCENTAGE'
            ? Math.floor((course.price * promo.discountValue) / 100)
            : promo.discountValue;
        finalAmount = Math.max(100, course.price - discount); // Minimum $1
        resolvedPromoCodeId = promo.id;
      }
    }

    const email = isGuest ? guestEmail : (session?.user?.email ?? '');
    const name = isGuest ? (guestName ?? '') : (session?.user?.name ?? '');

    // Determine base URL for success/webhook callbacks
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://university.maxxedout.com';
    // Callers (e.g. funnel proxy) can provide their own success URL
    const successUrl = callerSuccessUrl || `${origin}/checkout/success?provider=fanbasis&courseId=${course.id}`;
    // Carry the actually-charged amount to the browser Purchase so its reported
    // value reflects the sale ($499), not the DB list price ($2,497).
    const successUrlWithAmount = `${successUrl}${successUrl.includes('?') ? '&' : '?'}amount=${finalAmount}`;

    const checkoutSession = await createCheckoutSession({
      title: course.title,
      description: `Maxxed Out University — ${course.title}`,
      amountCents: finalAmount,
      type: 'onetime_non_reusable',
      successUrl: successUrlWithAmount,
      webhookUrl: `${origin}/api/webhooks/fanbasis`,
      // Fanbasis stores api_metadata as a stringified JSON in a short varchar
      // column — anything past ~240 chars gets silently truncated, which made
      // JSON.parse fail in the webhook. Keep this to just what we can't
      // reconstruct from the webhook payload itself (buyer email/name and
      // product title are in the payload already).
      metadata: {
        courseId: course.id,
        userId: isGuest ? '' : (session?.user?.id ?? ''),
        promoCodeId: resolvedPromoCodeId ?? '',
        originalPrice: course.price.toString(),
        // Shared Meta event_id minted by the funnel at checkout. The webhook
        // reads it back and uses it as the CAPI Purchase event_id so the
        // browser-side Purchase (which carries the same id via the success
        // URL) dedupes against the server-side one. A 36-char UUID — keeps
        // the whole api_metadata blob well under Fanbasis's ~240-char cap.
        ...(callerEventId ? { eventId: String(callerEventId) } : {}),
      },
    });

    // Append buyer pre-fill query params to the Fanbasis hosted-checkout
    // URL. Per Fanbasis support (2026-05-01): they read first_name,
    // last_name, email from the URL and pre-fill the corresponding
    // fields on the hosted page. Saves the buyer from re-typing what
    // they just entered on /pay or the funnel checkout. Phone is not
    // a documented param — leaving it out.
    const buyerEmail = isGuest ? guestEmail : (session?.user?.email ?? '');
    const buyerName = isGuest ? (guestName ?? '') : (session?.user?.name ?? '');
    let prefilledLink = checkoutSession.payment_link;
    if (buyerEmail || buyerName) {
      try {
        const url = new URL(checkoutSession.payment_link);
        if (buyerEmail) url.searchParams.set('email', buyerEmail);
        if (buyerName) {
          const trimmed = buyerName.trim();
          const spaceIdx = trimmed.indexOf(' ');
          const first = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
          const last = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
          if (first) url.searchParams.set('first_name', first);
          if (last) url.searchParams.set('last_name', last);
        }
        prefilledLink = url.toString();
      } catch {
        // Malformed payment_link — fall back to the raw URL. Logged so
        // we notice if Fanbasis ever changes the URL shape.
        console.warn('[fanbasis-checkout] could not parse payment_link for prefill', {
          paymentLink: checkoutSession.payment_link,
        });
      }
    }

    return NextResponse.json({
      paymentLink: prefilledLink,
      checkoutSessionId: checkoutSession.checkout_session_id,
      amount: finalAmount,
      originalAmount: course.price,
      courseTitle: course.title,
      isExistingUser,
    });
  } catch (error) {
    console.error('Error creating Fanbasis checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
