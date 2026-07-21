/**
 * In-place edits to an already-posted lead card.
 *
 * Works on the blocks Slack hands back with the button press rather than
 * rebuilding the card from scratch: re-deriving it would need every field
 * re-fetched and re-formatted, and any drift between the two builders would
 * silently rewrite the card into something subtly different from what the
 * channel has been reading all evening.
 */

interface Block {
  type: string;
  block_id?: string;
  elements?: unknown[];
  [k: string]: unknown;
}

interface ButtonElement {
  type: string;
  action_id?: string;
  text?: { type: string; text: string; emoji?: boolean };
  style?: string;
  confirm?: unknown;
  [k: string]: unknown;
}

const SENT_LOG_BLOCK_ID = 'cohort_sent_log';

/**
 * Relabels a pressed button so the card shows what's already been done.
 *
 * The button stays pressable on purpose — a closer sometimes genuinely needs
 * to resend (wrong number corrected, applicant deleted the text). Removing it
 * would trade a rare mis-tap for a dead end mid-call. The confirm dialog is
 * rewritten to say it was already sent, so the second press is deliberate.
 */
export function markButtonDone(
  blocks: Block[],
  actionId: string,
  doneLabel: string,
  resendConfirm: string
): Block[] {
  return blocks.map((b) => {
    if (b.type !== 'actions' || !Array.isArray(b.elements)) return b;
    return {
      ...b,
      elements: (b.elements as ButtonElement[]).map((el) => {
        if (el.action_id !== actionId) return el;
        const next: ButtonElement = {
          ...el,
          text: { type: 'plain_text', text: doneLabel, emoji: true },
        };
        // Green means "do this next". A completed action shouldn't wear it.
        delete next.style;
        if (next.confirm && typeof next.confirm === 'object') {
          next.confirm = {
            ...(next.confirm as Record<string, unknown>),
            text: { type: 'mrkdwn', text: resendConfirm },
            confirm: { type: 'plain_text', text: 'Send again' },
          };
        }
        return next;
      }),
    };
  });
}

/**
 * Appends a line to a running log at the bottom of the card, so the history is
 * readable without opening anything. Kept as one block (found by block_id and
 * rewritten) rather than one block per send, because Slack caps a message at
 * 50 blocks and a busy lead would otherwise push the card toward that limit.
 */
export function appendSentLog(blocks: Block[], line: string): Block[] {
  const existing = blocks.findIndex((b) => b.block_id === SENT_LOG_BLOCK_ID);

  if (existing >= 0) {
    const prev = blocks[existing];
    const prevText =
      (Array.isArray(prev.elements) &&
        (prev.elements[0] as { text?: string } | undefined)?.text) ||
      '';
    const next: Block = {
      type: 'context',
      block_id: SENT_LOG_BLOCK_ID,
      elements: [{ type: 'mrkdwn', text: `${prevText}\n${line}` }],
    };
    return blocks.map((b, i) => (i === existing ? next : b));
  }

  // Sits above the trailing divider so the card still closes cleanly.
  const dividerIdx = blocks.map((b) => b.type).lastIndexOf('divider');
  const logBlock: Block = {
    type: 'context',
    block_id: SENT_LOG_BLOCK_ID,
    elements: [{ type: 'mrkdwn', text: line }],
  };
  if (dividerIdx === -1) return [...blocks, logBlock];
  return [...blocks.slice(0, dividerIdx), logBlock, ...blocks.slice(dividerIdx)];
}
