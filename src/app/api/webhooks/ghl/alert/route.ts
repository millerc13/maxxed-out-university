import { NextRequest, NextResponse } from 'next/server';
import { notifySlackChannels, type SlackEventType } from '@/lib/slack';

export const runtime = 'nodejs';

/**
 * Single inbound webhook for GHL workflow → Maxxed Out alert pipeline.
 * Replaces the standalone slack-maxxed-out Netlify functions:
 *
 *   ?type=dd_application       (formerly slack-dd-application.js)
 *   ?type=abandoned_checkout   (formerly slack-abandoned-checkout.js)
 *   ?type=lead | sale          (extra event types, future-proofing)
 *
 * GHL workflows POST contact data here. We:
 *   1. Validate the shared secret (?secret=… or x-webhook-secret header)
 *   2. For dd_application: pick a round-robin assignee (Rebecca/Rafael)
 *      and PATCH the GHL contact's assignedTo via the Marketing API
 *   3. Fire the Slack alert via notifySlackChannels — channel routing
 *      is admin-managed in /admin/notifications
 *
 * GHL workflow setup: replace the existing "Slack Alert" step with a
 * "Custom Webhook" step pointing at:
 *   POST https://university.maxxedout.com/api/webhooks/ghl/alert
 *        ?type=dd_application&secret=<shared-secret>
 *
 * Send the standard GHL workflow webhook payload — first_name, last_name,
 * email, phone, contact_id (and any custom_data fields you want shown
 * in the Slack message).
 */
export async function POST(request: NextRequest) {
  // ── auth ─────────────────────────────────────────────────────────
  const url = request.nextUrl;
  const secret = url.searchParams.get('secret') ?? request.headers.get('x-webhook-secret') ?? '';
  const expected = (process.env.GHL_ALERT_WEBHOOK_SECRET ?? '').trim();
  if (!expected) {
    console.error('[ghl-alert] GHL_ALERT_WEBHOOK_SECRET env var not set — rejecting');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── event-type routing ──────────────────────────────────────────
  const typeParam = (url.searchParams.get('type') ?? '').toLowerCase();
  const KNOWN_TYPES: SlackEventType[] = [
    'lead',
    'sale',
    'dd_application',
    'abandoned_checkout',
    'contract_signed',
  ];
  const eventType = KNOWN_TYPES.find((t) => t === typeParam);
  if (!eventType) {
    return NextResponse.json(
      { error: `Unknown or missing ?type — expected one of ${KNOWN_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  // Optional source override (?source=dd-healthcare). For dd_application
  // events the source is forced to 'dd-healthcare' so the round-robin
  // logic + the channel routing align.
  let source = url.searchParams.get('source') ?? null;
  if (eventType === 'dd_application') source = 'dd-healthcare';

  // ── parse body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const firstName = strField(body, 'first_name', 'firstName') ?? '';
  const lastName = strField(body, 'last_name', 'lastName') ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || strField(body, 'name', 'full_name') || 'Unknown';
  const email = strField(body, 'email');
  const phone = strField(body, 'phone');
  const contactId =
    strField(body, 'contact_id', 'contactId') ?? strField(body, 'id') ?? null;

  // Assigned-to display name. Two ways the GHL workflow can set this:
  //   1. Hardcoded `assigned_to` Custom Data field on the webhook step
  //      (simplest — Rebecca branch hardcodes "Rebecca", Raf branch
  //      hardcodes "Raf"). Wins when present.
  //   2. Otherwise we fall back to GHL's standard `user.firstName /
  //      user.lastName` payload — populated when the workflow runs
  //      AFTER an "Assign to user" step.
  const hardcodedAssignedTo = strField(body, 'assigned_to', 'assignedTo');
  const ghlUser = (body.user ?? body.assigned_user) as
    | { firstName?: string; lastName?: string; id?: string }
    | undefined;
  const assignedToName =
    hardcodedAssignedTo ??
    (ghlUser?.firstName
      ? `${ghlUser.firstName} ${ghlUser.lastName ?? ''}`.trim()
      : undefined);

  // ── extract custom_data fields for the Slack message body ───────
  const customData =
    (body.customData as Record<string, unknown>) ??
    (body.custom_data as Record<string, unknown>) ??
    (body.customFields as Record<string, unknown>) ??
    {};
  const extraFields = Object.entries(customData)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .slice(0, 8)
    .map(([k, v]) => ({ label: humanizeKey(k), value: String(v) }));

  // ── fire the Slack alert ────────────────────────────────────────
  const ghlContactLink = contactId
    ? `https://app.gohighlevel.com/v2/location/${process.env.GHL_LOCATION_ID}/contacts/detail/${contactId}`
    : undefined;

  const results = await notifySlackChannels(eventType, source, {
    headline: headlineForEvent(eventType, fullName),
    contactName: fullName,
    email,
    phone,
    assignedTo: assignedToName,
    fields: extraFields,
    link: ghlContactLink ? { url: ghlContactLink, label: 'Open in GHL' } : undefined,
  });

  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    eventType,
    source,
    channelsAttempted: results.length,
    channelsSent: sent,
    failures: results.filter((r) => !r.ok).map((r) => ({ name: r.channelName, error: r.error })),
  });
}

function strField(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function humanizeKey(k: string): string {
  return k
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function headlineForEvent(eventType: SlackEventType, fullName: string): string {
  switch (eventType) {
    case 'dd_application':
      return `DD Application — ${fullName}`;
    case 'abandoned_checkout':
      return `Abandoned Checkout — ${fullName}`;
    case 'sale':
      return `New Sale — ${fullName}`;
    case 'contract_signed':
      return `Contract Signed — ${fullName}`;
    case 'lead':
    default:
      return `New Lead — ${fullName}`;
  }
}

