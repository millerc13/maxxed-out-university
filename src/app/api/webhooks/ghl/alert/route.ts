import { NextRequest, NextResponse } from 'next/server';
import { notifySlackChannels, type SlackEventType } from '@/lib/slack';
import { closerMention } from '@/lib/cohort-assign';

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
 *   2. For dd_application: the GHL workflow owns assignment (it assigns
 *      to the current closer before calling this webhook)
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
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const healthcare = eventType === 'dd_application' ? healthcareFields(body) : null;
  const firstName = strField(body, 'first_name', 'firstName') ?? '';
  const lastName = strField(body, 'last_name', 'lastName') ?? '';
  const fullName = healthcare?.name ?? (`${firstName} ${lastName}`.trim() || strField(body, 'name', 'full_name') || 'Unknown');
  const email = healthcare ? healthcare.email : strField(body, 'email');
  const phone = healthcare ? healthcare.phone : strField(body, 'phone');
  const contactId = healthcare ? healthcare.contactId :
    strField(body, 'contact_id', 'contactId') ?? strField(body, 'id') ?? null;

  // Assigned-to display name. Two ways the GHL workflow can set this:
  //   1. Hardcoded `assigned_to` Custom Data field on the webhook step
  //      (simplest — the workflow branch hardcodes the closer's name).
  //      Free text, no allowlist. Wins when present.
  //   2. Otherwise we fall back to GHL's standard `user.firstName /
  //      user.lastName` payload — populated when the workflow runs
  //      AFTER an "Assign to user" step.
  const hardcodedAssignedTo = strField(body, 'assigned_to', 'assignedTo');
  const ghlUser = (body.user ?? body.assigned_user) as
    | { firstName?: string; lastName?: string; id?: string }
    | undefined;
  const assignedToName = healthcare ? healthcare.assignedTo :
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
  const extraFields = healthcare?.extraFields ?? Object.entries(customData)
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
  const allSent = results.length > 0 && sent === results.length;
  // GHL must be able to distinguish a missing/rejected DD destination from a
  // successful notification. Partial delivery stays 200 to avoid retrying the
  // entire fan-out and duplicating a card in channels that already received it.
  const failedHealthcare = eventType === 'dd_application' && !allSent;
  return NextResponse.json({
    ok: !failedHealthcare,
    eventType,
    source,
    channelsAttempted: results.length,
    channelsSent: sent,
    failures: results.filter((r) => !r.ok).map((r) => ({ name: r.channelName, error: r.error })),
    ...(failedHealthcare && results.length === 0 ? { error: 'No active Slack channel subscribes to healthcare applications' } : {}),
  }, { status: eventType === 'dd_application' && sent === 0 ? 503 : 200 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The standard GHL webhook and its Custom Data fields are both supported. */
function healthcareFields(body: Record<string, unknown>) {
  const customObjects = [body.customData, body.custom_data, body.customFields].filter(isRecord);
  const containers = [body, ...customObjects];
  const contacts = containers.flatMap((container) => isRecord(container.contact) ? [container.contact] : []);
  const sources = [...containers, ...contacts];
  const field = (...keys: string[]) => sources.map((source) => strField(source, ...keys)).find(Boolean);
  const name = sources.map((source) => {
    const first = strField(source, 'first_name', 'firstName') ?? '';
    const last = strField(source, 'last_name', 'lastName') ?? '';
    return `${first} ${last}`.trim() || strField(source, 'name', 'full_name', 'fullName');
  }).find(Boolean) || 'Unknown';
  const user = sources.flatMap((source) => [source.user, source.assigned_user]).find(isRecord);
  const userName = user ? [strField(user, 'firstName', 'first_name'), strField(user, 'lastName', 'last_name')].filter(Boolean).join(' ') : undefined;
  const owner = field('assigned_to', 'assignedTo') || userName;
  const assignedTo = owner && /^jackie(?:\s+powers)?$/i.test(owner.trim())
    ? closerMention('Jackie') : owner;
  const envelopeKeys = new Set([
    'id', 'contactid', 'contact', 'firstname', 'lastname', 'fullname', 'name', 'email', 'phone',
    'assignedto', 'assigneduser', 'user', 'customdata', 'customfields',
    'currentbusiness', 'monthlyrevenue', 'healthcareinterest',
    'readiness', 'investmentbudget', 'worksituation', 'state', 'notes',
  ]);
  // Stable webhook payload keys. The GHL form's exact custom-field merge
  // tokens must be bound and verified before publishing its revised questions.
  const revisedQuestions = [
    { key: 'readiness', label: 'Readiness' },
    { key: 'investment_budget', label: 'Investment Budget' },
    { key: 'work_situation', label: 'Work Situation' },
    { key: 'state', label: 'State' },
    { key: 'notes', label: 'Additional Notes' },
  ];
  const legacyQuestions = [
    { key: 'current_business', label: 'Current Business' },
    { key: 'monthly_revenue', label: 'Monthly Revenue' },
    { key: 'healthcare_interest', label: 'Healthcare Interest' },
    { key: 'notes', label: 'Additional Notes' },
  ];
  // State and generic notes can appear in legacy payloads too. Only a required
  // revised question (even empty) selects the new layout; old answers retained
  // on an existing contact must never masquerade as this submission's answers.
  const hasRevisedQuestions = ['readiness', 'investment_budget', 'work_situation'].some((key) =>
    sources.some((source) => Object.prototype.hasOwnProperty.call(source, key)));
  const questions = (hasRevisedQuestions ? revisedQuestions : legacyQuestions).flatMap(({ key, label }) => {
    const source = sources.find((candidate) => Object.prototype.hasOwnProperty.call(candidate, key));
    const raw = source?.[key];
    const value = hasRevisedQuestions
      ? typeof raw === 'string' ? raw.trim() : typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : undefined
      : field(key);
    return value ? [healthcareSlackField(label, value)] : [];
  });
  const seen = new Set<string>();
  const otherFields = customObjects.flatMap((object) => Object.entries(object))
    .filter(([key, value]) => {
      const normalized = key.replace(/[_\s-]/g, '').toLowerCase();
      if (envelopeKeys.has(normalized) || seen.has(normalized) || value == null || isRecord(value) || Array.isArray(value)) return false;
      if (!String(value).trim()) return false;
      seen.add(normalized);
      return true;
    })
    .map(([key, value]) => healthcareSlackField(humanizeKey(key), String(value)));
  return {
    name, email: field('email'), phone: field('phone'),
    contactId: field('contact_id', 'contactId', 'id') ?? null,
    assignedTo, extraFields: [...questions, ...otherFields].slice(0, 8),
  };
}

/** User answers cannot introduce Slack mentions or exceed a section field. */
function healthcareSlackField(label: string, value: string) {
  const safeLabel = escapeSlackText(label, 100);
  return { label: safeLabel, value: escapeSlackText(value, 2000 - safeLabel.length - 4) };
}

function escapeSlackText(value: string, maxLength: number): string {
  let escaped = '';
  for (const character of value) {
    const token = character === '&' ? '&amp;' : character === '<' ? '&lt;' : character === '>' ? '&gt;' : character;
    if (escaped.length + token.length > maxLength - 1) return `${escaped}…`;
    escaped += token;
  }
  return escaped;
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
      return `Healthcare Application — ${fullName}`;
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

