import { NextRequest, NextResponse } from 'next/server';
import {
  handleCohortPurchase,
  extractPurchaseDetails,
  inferEventType,
} from '@/app/api/webhooks/fanbasis/route';
import { isCohortPurchase } from '@/lib/cohort-purchase';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * TEST-ONLY cohort purchase webhook.
 *
 * Sandbox Fanbasis payloads cannot carry a valid production signature, so they
 * can never reach the real endpoint — which is correct, and deliberately left
 * that way rather than adding a bypass to the path that guards real money.
 * This is a separate door: same processing, its own secret, deletable without
 * touching production behaviour.
 *
 * Gated on FANBASIS_TEST_WEBHOOK_KEY. It writes real rows and posts real Slack
 * messages, so an unguarded version would let anyone forge a sale. Refuses to
 * run at all when the key is unset — a missing env var must not mean "open".
 */
export async function POST(request: NextRequest) {
  const expected = process.env.FANBASIS_TEST_WEBHOOK_KEY?.trim();
  if (!expected) {
    return NextResponse.json({ error: 'test endpoint disabled' }, { status: 404 });
  }
  const provided = new URL(request.url).searchParams.get('k') ?? '';
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Persist the raw payload BEFORE processing. The first sandbox run showed
  // Fanbasis fires two webhooks per purchase with different ids and different
  // amount units, which is only diagnosable with the bytes it actually sent.
  await prisma.webhookLog
    .create({
      data: {
        source: 'fanbasis',
        event: 'test-endpoint:raw',
        payload: payload as object,
        status: 'received',
      },
    })
    .catch(() => {});

  const eventType = inferEventType(payload);
  const { metadata } = extractPurchaseDetails(payload);

  if (!isCohortPurchase(metadata)) {
    return NextResponse.json({
      ok: true,
      skipped: 'not a cohort purchase',
      eventType,
      metadataKeys: Object.keys(metadata),
    });
  }

  const isRenewal = eventType === 'subscription.renewed' || eventType === 'subscription.completed';
  await handleCohortPurchase(payload, { isRenewal });

  return NextResponse.json({ ok: true, processed: true, eventType, isRenewal, testMode: true });
}
