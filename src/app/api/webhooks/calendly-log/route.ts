import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * Calendly activity mirror. The university-funnel repo owns the real
 * Calendly webhook (signature-verified, updates GHL). It has no DB, so
 * it fire-and-forget POSTs a copy of each event here purely so the LMS
 * admin (/admin/notifications → Calendly section) can show a history.
 *
 * This endpoint does NOT drive any GHL/business logic — it only writes a
 * WebhookLog row. Auth reuses the same x-funnel-api-key contract as
 * /api/notify/lead so no new env var/secret is needed on the funnel side.
 *
 * Body: { event, email?, name?, scheduledStart?, eventUri?, raw? }
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-funnel-api-key')?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing x-funnel-api-key' }, { status: 401 });
  }
  const authFunnel = await prisma.funnelDeployment.findFirst({
    where: { apiKey, active: true },
    select: { id: true },
  });
  if (!authFunnel) {
    return NextResponse.json({ error: 'Invalid api key' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const event = typeof body?.event === 'string' ? body.event : 'unknown';
  // Only Calendly invitee lifecycle events are expected; record whatever
  // comes through but tag the status so the UI can color it.
  const status =
    event === 'invitee.created'
      ? 'success'
      : event === 'invitee.canceled' || event === 'invitee_no_show.created'
        ? 'ignored'
        : 'received';

  try {
    await prisma.webhookLog.create({
      data: {
        source: 'calendly',
        event,
        status,
        payload: {
          email: body?.email ?? null,
          name: body?.name ?? null,
          scheduledStart: body?.scheduledStart ?? null,
          eventUri: body?.eventUri ?? null,
          matchedContact: body?.matchedContact ?? null,
          raw: body?.raw ?? null,
        },
      },
    });
  } catch (err) {
    console.error('[calendly-log] WebhookLog write failed', err);
    return NextResponse.json({ ok: false, error: 'log_write_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
