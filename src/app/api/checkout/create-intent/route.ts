import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { isEffectivelyEnrolled } from '@/lib/enrollment';
import { sendAlreadyOwnedEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, guestEmail, guestName, guestPhone, promoCode } = body;
    console.log('[create-intent] Request', { courseId, guestEmail, guestName, hasPromo: !!promoCode });

    if (!courseId) {
      console.error('[create-intent] Missing courseId');
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Support both authenticated users and guests.
    // Wrap auth() in try/catch — cross-origin server calls have no session cookie.
    let session: { user?: { id?: string; email?: string | null; name?: string | null } } | null = null;
    try { session = await auth(); } catch { /* no session — treat as guest */ }
    const isGuest = !session?.user?.id;

    if (isGuest && !guestEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId, published: true },
      select: { id: true, title: true, price: true, slug: true },
    });

    if (!course) {
      console.error('[create-intent] Course not found or unpublished', { courseId });
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.price || course.price <= 0) {
      console.error('[create-intent] Course has no price', { courseId, price: course.price });
      return NextResponse.json({ error: 'Course is free' }, { status: 400 });
    }
    console.log('[create-intent] Course loaded', { courseId, title: course.title, price: course.price, isGuest });

    if (!isGuest && session?.user?.id) {
      const enrolled = await isEffectivelyEnrolled(session.user.id, course.id);
      if (enrolled) {
        console.log('[create-intent] Authenticated user already enrolled', { userId: session.user.id, courseId });
        return NextResponse.json({ error: 'You already own this course. Log in to access it.' }, { status: 409 });
      }
    }

    // Guest checkout — check if the email matches an existing user who already owns the course.
    // If so, block the charge and send them an email with a login link instead of charging again.
    if (isGuest && guestEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: guestEmail },
        select: { id: true, name: true },
      });
      if (existingUser) {
        const enrolled = await isEffectivelyEnrolled(existingUser.id, course.id);
        if (enrolled) {
          console.log('[create-intent] Guest email matches existing enrollment — blocking duplicate purchase', { email: guestEmail, userId: existingUser.id, courseId });
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
            console.error('[create-intent] Failed to send already-owned email', { error: emailErr instanceof Error ? emailErr.message : emailErr });
          }
          return NextResponse.json(
            { error: `You already own ${course.title}. We sent an email to ${guestEmail} with a link to log in.`, alreadyOwned: true },
            { status: 409 }
          );
        }
      }
    }

    // Validate promo code server-side — never trust the discounted price from the client.
    let finalAmount = course.price;
    let resolvedPromoCodeId: string | null = null;

    if (promoCode) {
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
        finalAmount = Math.max(50, course.price - discount); // Stripe minimum is 50 cents
        resolvedPromoCodeId = promo.id;
      }
      // Invalid promo codes are silently ignored — the full price is charged.
    }

    const email = isGuest ? guestEmail : (session?.user?.email ?? '');
    const name = isGuest ? (guestName ?? '') : (session?.user?.name ?? '');

    console.log('[create-intent] Creating Stripe PaymentIntent', { amount: finalAmount, originalPrice: course.price, isGuest, email });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        userId: isGuest ? '' : (session?.user?.id ?? ''),
        guestEmail: isGuest ? email : '',
        guestName: isGuest ? name : '',
        guestPhone: isGuest ? (guestPhone ?? '') : '',
        isGuest: isGuest ? 'true' : 'false',
        promoCodeId: resolvedPromoCodeId ?? '',
        originalPrice: course.price.toString(),
      },
      receipt_email: email,
      description: `Maxxed Out University — ${course.title}`,
    });
    console.log('[create-intent] PaymentIntent created', { paymentIntentId: paymentIntent.id, amount: finalAmount });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: finalAmount,
      originalAmount: course.price,
      courseTitle: course.title,
    });
  } catch (error) {
    console.error('[create-intent] Error creating payment intent', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
