import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, guestEmail, guestName, guestPhone } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Support both authenticated users and guests
    // Wrap auth() in try/catch — cross-origin server calls have no session cookie
    // so auth() should return null; defensive catch ensures guest flow still works
    let session: { user?: { id?: string; email?: string | null; name?: string | null } } | null = null;
    try { session = await auth(); } catch { /* no session — treat as guest */ }
    const isGuest = !session?.user?.id;

    // Guests must provide email
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

    // For authenticated users — check not already enrolled
    if (!isGuest && session?.user?.id) {
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
      }
    }

    const email = isGuest ? guestEmail : (session?.user?.email ?? '');
    const name = isGuest ? (guestName ?? '') : (session?.user?.name ?? '');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: course.price,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        // For authenticated users
        userId: isGuest ? '' : (session?.user?.id ?? ''),
        // For guests — webhook will create the account
        guestEmail: isGuest ? email : '',
        guestName: isGuest ? name : '',
        guestPhone: isGuest ? (guestPhone ?? '') : '',
        isGuest: isGuest ? 'true' : 'false',
      },
      receipt_email: email,
      description: `Maxxed Out University — ${course.title}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: course.price,
      courseTitle: course.title,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
