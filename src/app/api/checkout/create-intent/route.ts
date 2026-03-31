import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, guestEmail, guestName, guestPhone, promoCode } = body;

    if (!courseId) {
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
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.price || course.price <= 0) {
      return NextResponse.json({ error: 'Course is free' }, { status: 400 });
    }

    if (!isGuest && session?.user?.id) {
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
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

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: finalAmount,
      originalAmount: course.price,
      courseTitle: course.title,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
