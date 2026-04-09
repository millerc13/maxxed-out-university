import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWebhookSignature } from '@/lib/fanbasis';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail, sendCourseAddedEmail } from '@/lib/resend';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature');

  // Validate signature if webhook secret is configured
  const webhookSecret = process.env.FANBASIS_WEBHOOK_SECRET;
  if (webhookSecret && signature) {
    if (!validateWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Fanbasis webhook signature validation failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = (payload.event_type as string) || '';

  // Log the webhook
  try {
    await prisma.webhookLog.create({
      data: {
        source: 'fanbasis',
        event: eventType,
        payload: payload as object,
        status: 'received',
      },
    });
  } catch {
    // Don't fail the webhook if logging fails
  }

  try {
    switch (eventType) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(payload);
        break;
      case 'product.purchased':
        await handleProductPurchased(payload);
        break;
      case 'payment.failed':
      case 'payment.expired':
      case 'payment.canceled':
        console.log(`Fanbasis ${eventType}:`, JSON.stringify(payload));
        break;
      case 'subscription.created':
      case 'subscription.renewed':
      case 'subscription.completed':
      case 'subscription.canceled':
        console.log(`Fanbasis ${eventType}:`, JSON.stringify(payload));
        break;
      default:
        console.log(`Fanbasis unknown event: ${eventType}`);
    }
  } catch (error) {
    console.error(`Fanbasis webhook error (${eventType}):`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(payload: Record<string, unknown>) {
  const buyer = payload.buyer as { id: number; name: string; email: string } | undefined;
  const item = payload.item as { id: number; title: string; type: string } | undefined;
  const metadata = (payload.api_metadata as { data?: Record<string, string> })?.data;

  if (!buyer?.email || !metadata?.courseId) {
    console.error('Fanbasis payment.succeeded missing buyer email or courseId metadata');
    return;
  }

  await enrollFromFanbasis({
    email: buyer.email,
    name: buyer.name,
    courseId: metadata.courseId,
    courseTitle: metadata.courseTitle || item?.title || '',
    transactionId: payload.payment_id as string,
    userId: metadata.userId || '',
    isGuest: metadata.isGuest === 'true',
    guestName: metadata.guestName || '',
    promoCodeId: metadata.promoCodeId || '',
    originalPrice: metadata.originalPrice || '',
  });
}

async function handleProductPurchased(payload: Record<string, unknown>) {
  const buyer = payload.buyer as { id: number; name: string; email: string } | undefined;
  const item = payload.item as { id: number; title: string; type: string } | undefined;
  const metadata = (payload.api_metadata as { data?: Record<string, string> })?.data;

  if (!buyer?.email || !metadata?.courseId) {
    console.error('Fanbasis product.purchased missing buyer email or courseId metadata');
    return;
  }

  await enrollFromFanbasis({
    email: buyer.email,
    name: buyer.name,
    courseId: metadata.courseId,
    courseTitle: metadata.courseTitle || item?.title || '',
    transactionId: payload.payment_id as string,
    userId: metadata.userId || '',
    isGuest: metadata.isGuest === 'true',
    guestName: metadata.guestName || '',
    promoCodeId: metadata.promoCodeId || '',
    originalPrice: metadata.originalPrice || '',
  });
}

async function enrollFromFanbasis(params: {
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  transactionId: string;
  userId: string;
  isGuest: boolean;
  guestName: string;
  promoCodeId: string;
  originalPrice: string;
}) {
  let resolvedUserId = params.userId;
  let isNewUser = false;

  if (params.isGuest || !resolvedUserId) {
    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email: params.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: params.email,
          name: params.guestName || params.name || null,
          mustChangePassword: true,
        },
      });
      isNewUser = true;
    }

    resolvedUserId = user.id;
  }

  if (!resolvedUserId) {
    console.error('Could not resolve userId for Fanbasis payment:', params.transactionId);
    return;
  }

  // Idempotent enrollment
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: resolvedUserId, courseId: params.courseId } },
    create: {
      userId: resolvedUserId,
      courseId: params.courseId,
      source: 'fanbasis',
      transactionId: params.transactionId,
      promoCodeId: params.promoCodeId || null,
      originalPrice: params.originalPrice ? parseInt(params.originalPrice) : null,
      metadata: {
        provider: 'fanbasis',
        email: params.email,
      },
    },
    update: {},
  });

  // Increment promo code usage
  if (params.promoCodeId) {
    await prisma.promoCode.update({
      where: { id: params.promoCodeId },
      data: { currentUses: { increment: 1 } },
    });
  }

  console.log(`Fanbasis enrollment: user=${resolvedUserId} course=${params.courseId} txn=${params.transactionId}`);

  // Fetch course thumbnail for email
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: { thumbnail: true },
  });

  // Send appropriate email based on user status
  const userName = params.guestName || params.name || 'Student';
  const cName = params.courseTitle || 'your course';
  if (isNewUser && params.email) {
    const token = await createMagicLink(resolvedUserId);
    await sendMagicLinkEmail({ to: params.email, name: userName, token, courseName: cName, courseThumbnail: course?.thumbnail });
  } else if (!isNewUser && params.email) {
    const loginUrl = `${process.env.NEXTAUTH_URL || 'https://university.maxxedout.com'}/login`;
    await sendCourseAddedEmail({ to: params.email, name: userName, courseName: cName, loginUrl, courseThumbnail: course?.thumbnail });
  }
}
