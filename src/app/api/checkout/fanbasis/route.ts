import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCheckoutSession } from '@/lib/fanbasis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, guestEmail, guestName, guestPhone, promoCode, successUrl: callerSuccessUrl } = body;

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

    // Validate promo code
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

    const checkoutSession = await createCheckoutSession({
      title: course.title,
      description: `Maxxed Out University — ${course.title}`,
      amountCents: finalAmount,
      type: 'onetime_non_reusable',
      successUrl,
      webhookUrl: `${origin}/api/webhooks/fanbasis`,
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
    });

    return NextResponse.json({
      paymentLink: checkoutSession.payment_link,
      checkoutSessionId: checkoutSession.checkout_session_id,
      amount: finalAmount,
      originalAmount: course.price,
      courseTitle: course.title,
    });
  } catch (error) {
    console.error('Error creating Fanbasis checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
