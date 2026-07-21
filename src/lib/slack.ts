/**
 * Slack alert fan-out — replaces the standalone `slack-maxxed-out`
 * Netlify functions with a single `notifySlackChannels()` that reads
 * matching SlackChannel rows from the DB and POSTs Block Kit messages
 * to each one's incoming webhook URL.
 *
 * Channel routing:
 *   · eventType — must be in SlackChannel.eventTypes[]
 *   · source    — empty SlackChannel.sources[] = all sources;
 *                 non-empty = only listed sources match
 *
 * Per-event Block Kit message templates live in this file too —
 * keeps composing logic next to the channel-fanout so adding a new
 * event type is a single-file change.
 */

import { prisma } from './prisma';
import { normalizePhoneE164, formatPhoneUS } from '@/lib/sms';

export type SlackEventType =
  | 'lead'
  | 'sale'
  | 'dd_application'
  | 'abandoned_checkout'
  | 'contract_signed'
  | 'cohort_application';

export interface SlackEventPayload {
  /** Title text shown in notifications + bold first line. */
  headline: string;
  /** Optional emoji prefix on the header (default chosen per event type). */
  emoji?: string;
  /** First name + last name, formatted any way. */
  contactName?: string;
  email?: string;
  phone?: string;
  /** GHL-assigned closer/rep, formatted ("Rebecca Nardi"). */
  assignedTo?: string;
  /** Free-form key-value rows shown in the Slack message body. */
  fields?: { label: string; value: string }[];
  /** Optional click-through (e.g. /admin/leads/{id} or GHL contact URL). */
  link?: { url: string; label: string };
  /**
   * Multiple action buttons. Slack renders at most one `actions` block well, so
   * these are merged with `link` into a single row. `style: 'primary'` makes a
   * button green — use it for the one thing you want clicked.
   */
  links?: { url: string; label: string; style?: 'primary' | 'danger' }[];
  /**
   * Line rendered immediately above the buttons. The fields block can run long
   * enough that whoever the lead belongs to has scrolled off screen by the time
   * a reader reaches the actions — restating it here is what stops the wrong
   * person tapping.
   */
  actionsNote?: string;
  /** ISO timestamp the event occurred. Defaults to now. */
  occurredAt?: Date;
}

interface BlockKitMessage {
  text: string;
  blocks: unknown[];
}

const EVENT_DEFAULTS: Record<SlackEventType, { emoji: string; banner: string }> = {
  lead: { emoji: '🚀', banner: 'New Lead' },
  sale: { emoji: '💰', banner: 'New Sale' },
  dd_application: { emoji: '📋', banner: 'DD Application Submitted' },
  abandoned_checkout: { emoji: '🛒', banner: 'Abandoned Checkout' },
  contract_signed: { emoji: '✍️', banner: 'Contract Signed' },
  cohort_application: { emoji: '🎯', banner: 'Cohort Application' },
};

/** `*<tel:+1…|(937) 681-2699>*`, or the raw string if it isn't a US number. */
function telLink(phone: string): string {
  const e164 = normalizePhoneE164(phone);
  return /^\+1\d{10}$/.test(e164) ? `*<tel:${e164}|${formatPhoneUS(e164)}>*` : phone;
}

function buildBlockKitMessage(eventType: SlackEventType, p: SlackEventPayload): BlockKitMessage {
  const def = EVENT_DEFAULTS[eventType];
  const emoji = p.emoji ?? def.emoji;
  const headline = p.headline || def.banner;

  const contactBlock =
    p.contactName || p.email || p.phone
      ? {
          type: 'section',
          fields: [
            ...(p.contactName ? [{ type: 'mrkdwn', text: `*Name:*\n${p.contactName}` }] : []),
            ...(p.email ? [{ type: 'mrkdwn', text: `*Email:*\n${p.email}` }] : []),
            // tel: link so the number dials straight from the message. Falls
            // back to plain text for anything that isn't a US number, since a
            // tel: link built from a malformed number dials garbage.
            ...(p.phone
              ? [{ type: 'mrkdwn', text: `*Phone:*\n${telLink(p.phone)}` }]
              : []),
            ...(p.assignedTo
              ? [{ type: 'mrkdwn', text: `*Assigned To:*\n${p.assignedTo}` }]
              : []),
          ],
        }
      : null;

  const customFieldsBlock =
    p.fields && p.fields.length > 0
      ? {
          type: 'section',
          fields: p.fields.slice(0, 10).map((f) => ({
            type: 'mrkdwn' as const,
            text: `*${f.label}:*\n${f.value}`,
          })),
        }
      : null;

  // Slack caps an actions block at 5 elements. Merge `link` + `links` so callers
  // can offer several one-tap actions (e.g. checkout link AND the call sheet).
  const allLinks = [...(p.link ? [p.link] : []), ...(p.links ?? [])].slice(0, 5);
  const linkBlock =
    allLinks.length > 0
      ? {
          type: 'actions',
          elements: allLinks.map((l) => ({
            type: 'button',
            text: { type: 'plain_text', text: l.label, emoji: true },
            url: l.url,
            ...((l as { style?: string }).style ? { style: (l as { style?: string }).style } : {}),
          })),
        }
      : null;

  const occurredAt = p.occurredAt ?? new Date();
  const contextLine = `${headline} · ${occurredAt.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })} ET`;

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${headline}`,
        emoji: true,
      },
    },
  ];
  if (contactBlock) blocks.push(contactBlock);
  if (customFieldsBlock) blocks.push(customFieldsBlock);
  // Only worth a block when there are buttons for it to caption.
  if (p.actionsNote && linkBlock) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: p.actionsNote } });
  }
  if (linkBlock) blocks.push(linkBlock);
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: contextLine }],
  });

  return {
    text: `${emoji} ${headline}${p.contactName ? ` — ${p.contactName}` : ''}`,
    blocks,
  };
}

export interface NotifySlackResult {
  ok: boolean;
  channelId: string;
  channelName: string;
  error?: string;
}

/**
 * Fan out an event to every active SlackChannel that:
 *   · subscribes to the eventType, AND
 *   · either has no `sources` filter OR includes the input source
 *
 * `dd_application` events ignore the source filter entirely — they
 * always go to channels that opted into 'dd_application'.
 *
 * Returns one result per attempted channel. Caller can ignore the
 * array — fire-and-forget with `.catch(() => {})` is fine.
 */
export async function notifySlackChannels(
  eventType: SlackEventType,
  source: string | null | undefined,
  payload: SlackEventPayload,
): Promise<NotifySlackResult[]> {
  const channels = await prisma.slackChannel.findMany({
    where: {
      active: true,
      eventTypes: { has: eventType },
    },
    select: { id: true, name: true, webhookUrl: true, sources: true },
  });

  const filtered = channels.filter((c) => {
    if (eventType === 'dd_application') return true;
    if (c.sources.length === 0) return true;
    return source ? c.sources.includes(source) : false;
  });

  if (filtered.length === 0) return [];

  const message = buildBlockKitMessage(eventType, payload);

  const results = await Promise.all(
    filtered.map(async (c): Promise<NotifySlackResult> => {
      try {
        const res = await fetch(c.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return {
            ok: false,
            channelId: c.id,
            channelName: c.name,
            error: `Slack ${res.status}: ${text.slice(0, 200)}`,
          };
        }
        return { ok: true, channelId: c.id, channelName: c.name };
      } catch (err) {
        return {
          ok: false,
          channelId: c.id,
          channelName: c.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }),
  );

  // Persist a per-channel delivery log so /admin/notifications can show a
  // history under each Slack channel. Best-effort: a logging failure must
  // never break the (fire-and-forget) fan-out. channelId in the payload
  // is what the per-channel log API filters on.
  // Awaited (not void) so the rows are persisted before this function
  // resolves — callers now await notifySlackChannels, and a fire-and-
  // forget write would be lost when the serverless instance suspends.
  // Still .catch()'d: a logging failure must never break the fan-out.
  await prisma.webhookLog
    .createMany({
      data: results.map((r) => ({
        source: source ?? 'unknown',
        event: `slack:${eventType}`,
        status: r.ok ? 'success' : 'failed',
        errorMessage: r.error ?? null,
        payload: {
          channelId: r.channelId,
          channelName: r.channelName,
          headline: payload.headline,
          contactName: payload.contactName ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
        },
      })),
    })
    .catch((err) => console.error('[slack] WebhookLog write failed', err));

  return results;
}
