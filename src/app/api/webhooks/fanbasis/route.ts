import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWebhookSignature } from '@/lib/fanbasis';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail, sendCourseAddedEmail } from '@/lib/resend';
import { enrollInBundle } from '@/lib/enrollment';
import { notifyMastermindEnrolled } from '@/lib/mastermind-callback';

export const runtime = 'nodejs';

/** Best-effort WebhookLog row so rejected webhooks leave a DB trace. */
async function logRejection(reason: string, rawBody: string, headersSnapshot: Record<string, string>) {
  try {
    let parsed: unknown = null;
    try { parsed = JSON.parse(rawBody); } catch { /* leave null */ }
    await prisma.webhookLog.create({
      data: {
        source: 'fanbasis',
        event: `rejected:${reason}`,
        payload: {
          reason,
          bodyLength: rawBody.length,
          bodyPreview: rawBody.slice(0, 500),
          parsed,
          headers: headersSnapshot,
        } as object,
        status: 'rejected',
        errorMessage: reason,
      },
    });
  } catch (err) {
    console.error('[fanbasis-webhook] Failed to persist rejection log', { error: err instanceof Error ? err.message : err });
  }
}

export async function POST(request: NextRequest) {
  const reqId = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature');

  // Header snapshot — not every header, just the ones that help us debug delivery.
  const headersSnapshot = {
    'content-type': request.headers.get('content-type') || '',
    'content-length': request.headers.get('content-length') || '',
    'x-webhook-signature': signature ? `${signature.slice(0, 12)}…(${signature.length})` : '(none)',
    'user-agent': request.headers.get('user-agent') || '',
    'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
  };

  console.log('[fanbasis-webhook] Inbound', {
    reqId,
    vercelEnv: process.env.VERCEL_ENV,
    hasSecret: !!process.env.FANBASIS_WEBHOOK_SECRET,
    hasSignatureHeader: !!signature,
    bodyLength: rawBody.length,
    bodyPreview: rawBody.slice(0, 200),
    ...headersSnapshot,
  });

  // Signature validation.
  // Strict mode ONLY on Vercel prod (`VERCEL_ENV === 'production'`) — dev and preview
  // deployments accept unsigned webhooks when no secret is configured, which allows
  // per-session `webhook_url` testing via the Fanbasis sandbox without registering
  // a webhook subscription first.
  const webhookSecret = process.env.FANBASIS_WEBHOOK_SECRET;
  const isVercelProd = process.env.VERCEL_ENV === 'production';
  if (webhookSecret) {
    if (!signature) {
      console.error('[fanbasis-webhook] Missing X-Webhook-Signature header', { reqId });
      await logRejection('missing_signature_header', rawBody, headersSnapshot);
      return NextResponse.json({ error: 'Missing signature', reqId }, { status: 401 });
    }
    if (!validateWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[fanbasis-webhook] Signature validation failed', { reqId });
      await logRejection('signature_mismatch', rawBody, headersSnapshot);
      return NextResponse.json({ error: 'Invalid signature', reqId }, { status: 401 });
    }
    console.log('[fanbasis-webhook] Signature OK', { reqId });
  } else if (isVercelProd) {
    console.error('[fanbasis-webhook] FANBASIS_WEBHOOK_SECRET not set in production', { reqId });
    await logRejection('secret_not_configured_in_production', rawBody, headersSnapshot);
    return NextResponse.json({ error: 'Webhook not configured', reqId }, { status: 500 });
  } else {
    console.warn('[fanbasis-webhook] No FANBASIS_WEBHOOK_SECRET — accepting unsigned (non-prod)', { reqId });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[fanbasis-webhook] Invalid JSON body', { reqId });
    await logRejection('invalid_json', rawBody, headersSnapshot);
    return NextResponse.json({ error: 'Invalid JSON', reqId }, { status: 400 });
  }

  // Fanbasis ships two payload shapes (see sourceOf / inferEventType below for details).
  const inferredEventType = inferEventType(payload);
  const src = sourceOf(payload);
  const buyer = (src.buyer as { email?: string } | undefined)?.email || '?';
  console.log('[fanbasis-webhook] Parsed', {
    reqId,
    inferredEventType,
    envelope: payload.data ? 'live (data-wrapped)' : 'sandbox (flat)',
    buyer,
    hasProduct: !!src.product || !!src.item,
    payloadId: src.payment_id || payload.id || payload.payment_id,
    topLevelType: payload.type || payload.event_type || null,
  });

  try {
    await prisma.webhookLog.create({
      data: {
        source: 'fanbasis',
        event: inferredEventType,
        payload: { reqId, ...(payload as object) } as object,
        status: 'received',
      },
    });
  } catch (err) {
    console.error('[fanbasis-webhook] Failed to log webhook', { reqId, error: err instanceof Error ? err.message : err });
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
        console.log(`[fanbasis-webhook] ${inferredEventType}`, { reqId, payload: JSON.stringify(payload) });
        break;
      case 'subscription.created':
      case 'subscription.renewed':
      case 'subscription.completed':
      case 'subscription.canceled':
        console.log(`[fanbasis-webhook] ${inferredEventType} (logged, not processed)`, { reqId });
        break;
      default:
        console.warn(`[fanbasis-webhook] Unknown event — unable to infer from shape`, { reqId, payloadKeys: Object.keys(payload) });
    }
  } catch (error) {
    console.error(`[fanbasis-webhook] Handler threw (${inferredEventType})`, {
      reqId,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Processing failed', reqId }, { status: 500 });
  }

  console.log('[fanbasis-webhook] Done', { reqId, inferredEventType, buyer });
  return NextResponse.json({ received: true, reqId });
}

/**
 * Return the object that holds buyer / item / api_metadata / payment_id.
 *
 * Fanbasis has shipped TWO wire formats we've seen in production:
 *   - Sandbox (pre-2026-04-20): flat — { buyer, product|item, payment_id|id, api_metadata, ... }
 *   - Live (2026-04-20+):  envelope — { id: <event-uuid>, type, data: { buyer, item, payment_id, api_metadata, event_type, ... } }
 *
 * Treat `payload.data` as the canonical source when it's present and looks
 * like a payment payload; otherwise fall back to payload itself.
 */
function sourceOf(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data;
  if (data && typeof data === 'object' && ('buyer' in data || 'item' in data || 'payment_id' in data)) {
    return data as Record<string, unknown>;
  }
  return payload;
}

/**
 * Infer event type from payload. Checks top-level `type`/`event_type` first
 * (both shapes), then nested `data.event_type` (live), then shape-based inference.
 */
function inferEventType(payload: Record<string, unknown>): string {
  const topType = (payload.type as string) || (payload.event_type as string) || '';
  if (topType) return topType;
  const src = sourceOf(payload);
  const nestedType = (src.event_type as string) || '';
  if (nestedType) return nestedType;

  const hasBuyer = !!src.buyer;
  const hasProduct = !!src.product || !!src.item;
  const hasPaymentId = !!src.payment_id || !!payload.id || !!payload.payment_id;
  if (hasBuyer && hasProduct && hasPaymentId) return 'payment.succeeded';
  return '';
}

/**
 * Normalize both Fanbasis payload shapes into a uniform purchase object.
 */
function extractPurchaseDetails(payload: Record<string, unknown>) {
  const src = sourceOf(payload);

  const buyer = src.buyer as {
    id?: number; name?: string; email?: string; first_name?: string; last_name?: string
  } | undefined;

  const product = (src.product || src.item) as {
    id?: number; title?: string; type?: string; api_metadata?: string | { data?: Record<string, string> }
  } | undefined;

  // Payment id: prefer `payment_id` from the source, fall back to top-level `id`
  // (sandbox uses int `id`; live envelope's top-level `id` is the event UUID, not the payment id).
  const paymentId = String(src.payment_id || payload.payment_id || payload.id || '');

  // Metadata — three possible locations:
  //   1. src.api_metadata.data (live — object nested under data wrapper)
  //   2. product.api_metadata stringified (sandbox — often truncated ~240 chars)
  //   3. product.api_metadata as object with .data (docs shape)
  let metadata: Record<string, string> = {};
  const topLevelMeta = (src.api_metadata as { data?: Record<string, string> } | undefined)?.data;
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

  // Fire-and-forget notification to mastermind-stripe-dashboard so any open
  // Stage Offer pointing at this email+course flips to 'enrolled'.
  await notifyMastermindEnrolled({
    email: userEmail,
    courseId: params.courseId,
    transactionId: params.transactionId,
  });
}
