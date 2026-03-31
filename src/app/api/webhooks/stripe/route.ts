import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// Disable body parsing — Stripe needs raw body for signature verification
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await handlePaymentSucceeded(paymentIntent);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { courseId, courseSlug, userId, userEmail } = paymentIntent.metadata;

  if (!courseId || !userId) {
    console.error('Webhook missing metadata:', paymentIntent.id, paymentIntent.metadata);
    return;
  }

  try {
    // Idempotent — skip if enrollment already exists
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        source: 'stripe',
        transactionId: paymentIntent.id,
        metadata: {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          courseSlug,
          userEmail,
        },
      },
      update: {}, // already enrolled — no-op
    });

    console.log(`Enrollment created: user=${userId} course=${courseId} pi=${paymentIntent.id}`);
  } catch (error) {
    console.error('Failed to create enrollment:', error);
    throw error; // Re-throw so Stripe retries
  }
}
