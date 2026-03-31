import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail } from '@/lib/resend';
import Stripe from 'stripe';

export const runtime = 'nodejs';

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
  const {
    courseId, courseSlug, courseTitle,
    userId, guestEmail, guestName, guestPhone, isGuest,
    promoCodeId, originalPrice,
  } = paymentIntent.metadata;

  if (!courseId) {
    console.error('Webhook missing courseId:', paymentIntent.id);
    return;
  }

  try {
    let resolvedUserId = userId;
    let userEmail = '';
    let userName = guestName || 'Student';
    let isNewUser = false;

    if (isGuest === 'true' && guestEmail) {
      // Find or create user by email
      userEmail = guestEmail;
      let user = await prisma.user.findUnique({ where: { email: guestEmail } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: guestEmail,
            name: guestName || null,
            mustChangePassword: true, // prompt to set password on first login
          },
        });
        isNewUser = true;
      }

      resolvedUserId = user.id;
      userName = user.name || guestName || 'Student';
    } else if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      userEmail = user?.email ?? '';
      userName = user?.name ?? 'Student';
    }

    if (!resolvedUserId) {
      console.error('Could not resolve userId for payment:', paymentIntent.id);
      return;
    }

    // Idempotent enrollment
    await prisma.enrollment.upsert({
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

    // Increment promo code usage counter
    if (promoCodeId) {
      await prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { currentUses: { increment: 1 } },
      });
    }

    console.log(`Enrollment created: user=${resolvedUserId} course=${courseId} pi=${paymentIntent.id}`);

    // Send magic link email (for new users or guest purchases)
    console.log(`Email check: isGuest=${isGuest} isNewUser=${isNewUser} userEmail=${userEmail}`);
    if ((isGuest === 'true' || isNewUser) && userEmail) {
      const token = await createMagicLink(resolvedUserId);
      console.log(`Sending magic link email to ${userEmail}`);
      const emailResult = await sendMagicLinkEmail({
        to: userEmail,
        name: userName,
        token,
        courseName: courseTitle || 'your course',
      });
      console.log(`Resend result:`, JSON.stringify(emailResult));
    }
  } catch (error) {
    console.error('Failed to handle payment:', error);
    throw error; // Re-throw so Stripe retries
  }
}
