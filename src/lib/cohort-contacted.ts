import { formatPhoneUS } from '@/lib/sms';
import {
  cohortContactedChannelId,
  postMessage,
  deleteMessage,
  updateMessage,
  hasSlackBot,
} from '@/lib/slack-bot';

/**
 * "Mark contacted" — move the lead card out of the applications channel and
 * into the contacted channel.
 *
 * This keeps the applications channel showing ONLY what still needs calling
 * during a live class. The full card is preserved in the second channel, never
 * discarded: "who was called, by whom, when" is the record the team argues
 * over later.
 *
 * ORDER IS LOAD-BEARING. The move must succeed before the original is removed,
 * or a failed post plus a successful delete erases the lead outright. If the
 * move fails the original is deliberately left in place — a lead sitting in
 * the wrong channel is recoverable, a deleted one is not.
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

/** Fallback one-liner, used only when a delete is refused. */
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
 * Move to the contacted channel, then remove the original. Returns `collapsed`
 * true once the applications channel no longer shows the full card — whether
 * that happened by delete or by the collapse fallback.
 */
export async function collapseAndMove(
  input: CollapseInput,
  ref: { channelId: string | null; messageTs: string | null },
): Promise<CollapseResult> {
  if (!hasSlackBot()) return { collapsed: false, moved: false, error: 'no_bot_token' };
  if (!cohortContactedChannelId()) {
    return { collapsed: false, moved: false, error: 'no_contacted_channel' };
  }

  // 1. Move first. Nothing is removed until this lands.
  const moved = movedBlocks(input);
  const moveRes = await postMessage({
    channel: cohortContactedChannelId(),
    text: moved.text,
    blocks: moved.blocks,
  });
  if (!moveRes.ok) {
    return { collapsed: false, moved: false, error: `move:${moveRes.error}` };
  }

  if (!ref.channelId || !ref.messageTs) {
    // Posted via webhook, so there is no message id to remove. The move still
    // happened; the original just can't be touched.
    return { collapsed: false, moved: true, error: 'no_message_ref' };
  }

  // 2. Now the original is safe to remove.
  const delRes = await deleteMessage({ channel: ref.channelId, ts: ref.messageTs });
  if (delRes.ok) return { collapsed: true, moved: true };

  // Delete refused (usually a missing chat:delete scope). Fall back to
  // collapsing in place so the channel still gets shorter rather than showing
  // the lead twice at full size.
  const collapsed = collapsedBlocks(input);
  const upd = await updateMessage({
    channel: ref.channelId,
    ts: ref.messageTs,
    text: collapsed.text,
    blocks: collapsed.blocks,
  });
  return {
    collapsed: upd.ok,
    moved: true,
    error: `delete:${delRes.error}${upd.ok ? ' (collapsed instead)' : ` collapse:${upd.error}`}`,
  };
}
