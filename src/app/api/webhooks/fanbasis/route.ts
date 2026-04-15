import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWebhookSignature } from '@/lib/fanbasis';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail, sendCourseAddedEmail } from '@/lib/resend';
import { enrollInBundle } from '@/lib/enrollment';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature');

  // Signature validation.
  // Strict mode ONLY on Vercel prod (`VERCEL_ENV === 'production'`) — dev and preview
  // deployments accept unsigned webhooks when no secret is configured, which allows
  // per-session `webhook_url` testing via the Fanbasis sandbox without registering
  // a webhook subscription first.
  const webhookSecret = process.env.FANBASIS_WEBHOOK_SECRET;
  const isVercelProd = process.env.VERCEL_ENV === 'production';
  if (webhookSecret) {
    if (!signature) {
      console.error('[fanbasis-webhook] Missing X-Webhook-Signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    if (!validateWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[fanbasis-webhook] Signature validation failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (isVercelProd) {
    console.error('[fanbasis-webhook] FANBASIS_WEBHOOK_SECRET not set in production');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  } else {
    console.warn('[fanbasis-webhook] No FANBASIS_WEBHOOK_SECRET — accepting unsigned (non-prod)');
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
  let needsPasswordSetup = false;
  let userEmail = params.email;
  let userName = params.guestName || params.name || 'Student';

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
      needsPasswordSetup = true;
    } else {
      // Existing record but never activated — still send magic link so they can set a password
      needsPasswordSetup = !user.passwordHash;
    }

    resolvedUserId = user.id;
    userName = user.name || params.guestName || params.name || 'Student';
  } else {
    // Authenticated checkout — load the user to fetch fresh email/name + passwordHash
    const user = await prisma.user.findUnique({
      where: { id: resolvedUserId },
      select: { email: true, name: true, passwordHash: true },
    });
    if (user) {
      userEmail = user.email;
      userName = user.name || userName;
      needsPasswordSetup = !user.passwordHash;
    }
  }

  if (!resolvedUserId) {
    console.error('[fanbasis-webhook] Could not resolve userId for payment:', params.transactionId);
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

  // Bundle unlock — if this course is a bundle, also enroll in every child course.
  const purchasedCourse = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: { isBundle: true, thumbnail: true, title: true },
  });

  if (purchasedCourse?.isBundle) {
    try {
      console.log('[fanbasis-webhook] Bundle detected, enrolling in child courses', { bundleId: params.courseId });
      await enrollInBundle(resolvedUserId, params.courseId, 'fanbasis', params.transactionId);
    } catch (err) {
      console.error('[fanbasis-webhook] Bundle enrollment failed', { error: err instanceof Error ? err.message : err });
    }
  }

  // Increment promo code usage
  if (params.promoCodeId) {
    await prisma.promoCode.update({
      where: { id: params.promoCodeId },
      data: { currentUses: { increment: 1 } },
    });
  }

  console.log(`[fanbasis-webhook] Enrollment: user=${resolvedUserId} course=${params.courseId} txn=${params.transactionId} needsPasswordSetup=${needsPasswordSetup}`);

  // Send appropriate email based on user status
  const cName = params.courseTitle || purchasedCourse?.title || 'your course';
  if (!userEmail) {
    console.warn('[fanbasis-webhook] No email available — skipping notification', { resolvedUserId });
    return;
  }
  try {
    if (needsPasswordSetup) {
      const token = await createMagicLink(resolvedUserId);
      await sendMagicLinkEmail({ to: userEmail, name: userName, token, courseName: cName, courseThumbnail: purchasedCourse?.thumbnail });
    } else {
      const loginUrl = `${process.env.NEXTAUTH_URL || 'https://university.maxxedout.com'}/login`;
      await sendCourseAddedEmail({ to: userEmail, name: userName, courseName: cName, loginUrl, courseThumbnail: purchasedCourse?.thumbnail });
    }
  } catch (err) {
    console.error('[fanbasis-webhook] Email send failed', { error: err instanceof Error ? err.message : err });
  }
}
