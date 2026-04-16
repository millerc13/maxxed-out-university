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
    console.error('[fanbasis-webhook] Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Fanbasis sends payloads in two observed shapes:
  //   (a) Documented: { event_type, payment_id, buyer, item, api_metadata }
  //   (b) Actual (sandbox as of 2026-04): no event_type, buyer.first_name/last_name,
  //       product.api_metadata as a stringified JSON that TRUNCATES at ~240 chars.
  // We infer the event when event_type is missing and parse either shape.
  const documentedEventType = (payload.event_type as string) || '';
  const inferredEventType = documentedEventType || inferEventType(payload);
  console.log('[fanbasis-webhook] Received', {
    documentedEventType,
    inferredEventType,
    hasBuyer: !!payload.buyer,
    hasProduct: !!payload.product,
    hasItem: !!payload.item,
    payloadId: payload.id || payload.payment_id,
  });

  try {
    await prisma.webhookLog.create({
      data: {
        source: 'fanbasis',
        event: inferredEventType,
        payload: payload as object,
        status: 'received',
      },
    });
  } catch (err) {
    console.error('[fanbasis-webhook] Failed to log webhook', { error: err instanceof Error ? err.message : err });
  }

  try {
    switch (inferredEventType) {
      case 'payment.succeeded':
      case 'product.purchased':
        await handlePurchase(payload);
        break;
      case 'payment.failed':
      case 'payment.expired':
      case 'payment.canceled':
        console.log(`[fanbasis-webhook] ${inferredEventType}`, JSON.stringify(payload));
        break;
      case 'subscription.created':
      case 'subscription.renewed':
      case 'subscription.completed':
      case 'subscription.canceled':
        console.log(`[fanbasis-webhook] ${inferredEventType} (logged, not processed)`);
        break;
      default:
        console.warn(`[fanbasis-webhook] Unknown event — unable to infer from shape`, { payloadKeys: Object.keys(payload) });
    }
  } catch (error) {
    console.error(`[fanbasis-webhook] Handler threw (${inferredEventType})`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Infer event type from payload shape when Fanbasis omits `event_type`.
 * A payload with buyer + product + (id|payment_id) + numeric timestamp is a purchase.
 */
function inferEventType(payload: Record<string, unknown>): string {
  const hasBuyer = !!payload.buyer;
  const hasProduct = !!payload.product || !!payload.item;
  const hasPaymentId = !!payload.id || !!payload.payment_id;
  if (hasBuyer && hasProduct && hasPaymentId) return 'payment.succeeded';
  return '';
}

/**
 * Normalize Fanbasis's two payload shapes into a uniform object for the enrollment flow.
 */
function extractPurchaseDetails(payload: Record<string, unknown>) {
  const buyer = payload.buyer as {
    id?: number; name?: string; email?: string; first_name?: string; last_name?: string
  } | undefined;

  // Try both shapes for the product/item
  const product = (payload.product || payload.item) as {
    id?: number; title?: string; type?: string; api_metadata?: string | { data?: Record<string, string> }
  } | undefined;

  // Payment id can live at top level as `id` or `payment_id`
  const paymentId = String(payload.payment_id || payload.id || '');

  // Metadata: (a) object at top-level api_metadata.data (docs), or
  // (b) JSON string in product.api_metadata (actual sandbox behavior).
  let metadata: Record<string, string> = {};
  const topLevelMeta = (payload.api_metadata as { data?: Record<string, string> } | undefined)?.data;
  if (topLevelMeta && typeof topLevelMeta === 'object') {
    metadata = topLevelMeta;
  } else if (product?.api_metadata) {
    if (typeof product.api_metadata === 'string') {
      try {
        metadata = JSON.parse(product.api_metadata);
      } catch (err) {
        console.error('[fanbasis-webhook] product.api_metadata JSON parse failed — likely truncated by Fanbasis', {
          raw: product.api_metadata,
          error: err instanceof Error ? err.message : err,
        });
        // Best-effort salvage: pull courseId from partial string via regex.
        const m = (product.api_metadata as string).match(/"courseId"\s*:\s*"([^"]+)"/);
        if (m) metadata = { courseId: m[1] };
      }
    } else if (typeof product.api_metadata === 'object' && product.api_metadata !== null) {
      const asObj = product.api_metadata as { data?: Record<string, string> };
      metadata = asObj.data || (product.api_metadata as unknown as Record<string, string>);
    }
  }

  const buyerName = buyer?.name
    || [buyer?.first_name, buyer?.last_name].filter(Boolean).join(' ')
    || '';
  const buyerEmail = buyer?.email || '';
  const productTitle = product?.title || '';

  return { buyer, buyerName, buyerEmail, product, productTitle, paymentId, metadata };
}

async function handlePurchase(payload: Record<string, unknown>) {
  const { buyerName, buyerEmail, productTitle, paymentId, metadata } = extractPurchaseDetails(payload);

  console.log('[fanbasis-webhook] Extracted purchase details', {
    buyerEmail,
    buyerName,
    productTitle,
    paymentId,
    metadataKeys: Object.keys(metadata),
    courseId: metadata.courseId,
    userId: metadata.userId,
  });

  if (!buyerEmail || !metadata.courseId) {
    console.error('[fanbasis-webhook] Missing buyer.email or metadata.courseId — cannot enroll', {
      buyerEmail,
      metadata,
      payloadKeys: Object.keys(payload),
    });
    return;
  }

  // isGuest isn't reliably in the truncated metadata. Infer: if userId is
  // empty, treat as guest; if userId is a cuid, treat as authenticated.
  const userId = metadata.userId || '';
  const isGuest = !userId;

  await enrollFromFanbasis({
    email: buyerEmail,
    name: buyerName,
    courseId: metadata.courseId,
    courseTitle: productTitle,
    transactionId: paymentId,
    userId,
    isGuest,
    guestName: buyerName,
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
  console.log('[fanbasis-webhook] enrollFromFanbasis start', {
    email: params.email,
    courseId: params.courseId,
    transactionId: params.transactionId,
    isGuest: params.isGuest,
  });
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
