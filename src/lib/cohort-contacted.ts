import { formatPhoneUS } from '@/lib/sms';
import {
  cohortContactedChannelId,
  postMessage,
  updateMessage,
  hasSlackBot,
} from '@/lib/slack-bot';

/**
 * "Mark contacted" — collapse the lead card in the applications channel and
 * re-post the full card to the contacted channel.
 *
 * The collapse is what keeps the channel readable during a live class: a
 * worked lead shrinks to one line, so what's left on screen is only what still
 * needs calling. The full card is preserved in the second channel rather than
 * deleted, because "who was called, by whom, when" is the record the team
 * argues over later.
 */

export interface CollapseInput {
  name: string;
  phone: string;
  email: string;
  tier: string;
  score: number;
  state: string;
  assignedTo: string | null;
  note: string | null;
  contactedBy: string;
  at: Date;
}

const timeET = (d: Date) =>
  d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** The one-liner a worked lead shrinks to. Name + number stay tappable. */
export function collapsedBlocks(i: CollapseInput): { text: string; blocks: unknown[] } {
  const phone = formatPhoneUS(i.phone);
  const text = `✅ ${i.name} · ${phone} — contacted by ${i.contactedBy}`;
  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *${i.name}* · *<tel:${i.phone}|${phone}>*  —  contacted by *${i.contactedBy}* · ${timeET(i.at)} ET  ·  _Tier ${i.tier}_`,
        },
      },
      { type: 'divider' },
    ],
  };
}

/** The full card, re-posted into the contacted channel. */
function movedBlocks(i: CollapseInput): { text: string; blocks: unknown[] } {
  const phone = formatPhoneUS(i.phone);
  return {
    text: `✅ Contacted — ${i.name}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `✅ Contacted — ${i.name}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Phone:*\n*<tel:${i.phone}|${phone}>*` },
          { type: 'mrkdwn', text: `*Email:*\n${i.email}` },
          { type: 'mrkdwn', text: `*Tier:*\n${i.tier} · ${i.score}/28` },
          { type: 'mrkdwn', text: `*State:*\n${i.state}` },
          { type: 'mrkdwn', text: `*Assigned to:*\n${i.assignedTo ?? '—'}` },
          { type: 'mrkdwn', text: `*Contacted by:*\n*${i.contactedBy}*` },
        ],
      },
      ...(i.note
        ? [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Their note:*\n${i.note}` },
            },
          ]
        : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Contacted ${timeET(i.at)} ET` }],
      },
      { type: 'divider' },
    ],
  };
}

export interface CollapseResult {
  collapsed: boolean;
  moved: boolean;
  error?: string;
}

/**
 * Collapse in place, then move. Independent on purpose: if the move fails the
 * collapse still stands (the lead IS contacted), and if the collapse fails the
 * record still lands in the contacted channel. Neither is allowed to take the
 * other down.
 */
export async function collapseAndMove(
  input: CollapseInput,
  ref: { channelId: string | null; messageTs: string | null },
): Promise<CollapseResult> {
  if (!hasSlackBot()) return { collapsed: false, moved: false, error: 'no_bot_token' };

  const collapsed = collapsedBlocks(input);
  const moved = movedBlocks(input);

  const [collapseRes, moveRes] = await Promise.allSettled([
    ref.channelId && ref.messageTs
      ? updateMessage({
          channel: ref.channelId,
          ts: ref.messageTs,
          text: collapsed.text,
          blocks: collapsed.blocks,
        })
      : Promise.resolve({ ok: false, error: 'no_message_ref' as const }),
    cohortContactedChannelId()
      ? postMessage({
          channel: cohortContactedChannelId(),
          text: moved.text,
          blocks: moved.blocks,
        })
      : Promise.resolve({ ok: false, error: 'no_contacted_channel' as const }),
  ]);

  const ok = (r: PromiseSettledResult<{ ok: boolean; error?: string }>) =>
    r.status === 'fulfilled' && r.value.ok;
  const err = (r: PromiseSettledResult<{ ok: boolean; error?: string }>) =>
    r.status === 'fulfilled' ? r.value.error : 'threw';

  return {
    collapsed: ok(collapseRes),
    moved: ok(moveRes),
    error: [
      ok(collapseRes) ? null : `collapse:${err(collapseRes)}`,
      ok(moveRes) ? null : `move:${err(moveRes)}`,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || undefined,
  };
}
