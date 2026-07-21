import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySlackRequest } from '@/lib/slack-verify';
import { sendCohortCheckout } from '@/lib/cohort-send';
import { collapseAndMove } from '@/lib/cohort-contacted';
import { markButtonDone, appendSentLog } from '@/lib/slack-message-edit';
import { updateMessage } from '@/lib/slack-bot';
import { COHORT_PROMO_CODE } from '@/lib/cohort-checkout';
import type { CohortChannel } from '@/lib/cohort-assign';

export const runtime = 'nodejs';

/**
 * POST /api/slack/interactive — Slack Block Kit button presses.
 *
 * Replaces the browser bounce: a closer taps a button in Slack and the send
 * happens here, in place. Slack requires an acknowledgement within 3 seconds
 * or it shows the user a timeout error, and sending an SMS plus an email takes
 * longer than that — so this ACKs immediately and reports the outcome
 * afterwards via `response_url`.
 *
 * GET is intentionally absent: this endpoint only exists for signed Slack
 * POSTs, and a browser hitting it should 405 rather than render anything.
 */

/** Posts the result back into the channel, visible only to whoever pressed. */
async function respond(responseUrl: string, text: string) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response_type: 'ephemeral', replace_original: false, text }),
  }).catch(() => {});
}

interface SlackAction {
  action_id?: string;
  value?: string;
}

interface SlackPayload {
  type?: string;
  user?: { id?: string; name?: string; username?: string };
  actions?: SlackAction[];
  response_url?: string;
  channel?: { id?: string };
  message?: { ts?: string; text?: string; blocks?: unknown[] };
}

/** Human label for a completed send, shown on the button and in the log. */
const DONE_LABEL: Record<string, string> = {
  'cohort_send:sms:0': '✅ Texted Checkout',
  'cohort_send:sms:1': '✅ Texted Coupon',
  'cohort_send:email:0': '✅ Emailed Checkout',
  'cohort_send:email:1': '✅ Emailed Coupon',
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  const verdict = verifySlackRequest({
    rawBody,
    signature: request.headers.get('x-slack-signature'),
    timestamp: request.headers.get('x-slack-request-timestamp'),
  });
  if (!verdict.ok) {
    // Deliberately terse: an attacker probing the endpoint learns nothing about
    // which part of the check failed.
    return new NextResponse('unauthorized', { status: 401 });
  }

  // Slack sends form-encoded with a single `payload` field of JSON.
  const params = new URLSearchParams(rawBody);
  let payload: SlackPayload;
  try {
    payload = JSON.parse(params.get('payload') || '{}');
  } catch {
    return new NextResponse('bad payload', { status: 400 });
  }

  const action = payload.actions?.[0];
  const actionId = action?.action_id || '';
  const applicationId = action?.value || '';
  const responseUrl = payload.response_url || '';
  const pressedBy =
    payload.user?.name || payload.user?.username || payload.user?.id || 'someone';

  if (!actionId || !applicationId) return NextResponse.json({ ok: true });

  // ACK first — everything below runs after the response is already on its way.
  after(async () => {
    const app = await prisma.cohortApplication.findUnique({ where: { id: applicationId } });
    if (!app) {
      if (responseUrl) await respond(responseUrl, '⚠️ Could not find that application.');
      return;
    }

    if (actionId === 'cohort_contacted') {
      if (app.contactedAt) {
        if (responseUrl) {
          await respond(
            responseUrl,
            `Already marked contacted by ${app.contactedBy ?? 'someone'}.`
          );
        }
        return;
      }
      const at = new Date();
      await prisma.cohortApplication.update({
        where: { id: app.id },
        data: {
          contactedBy: pressedBy,
          contactedAt: at,
          status: app.status === 'new' ? 'called' : app.status,
          calledAt: app.calledAt ?? at,
        },
      });
      const res = await collapseAndMove(
        {
          name: app.name,
          phone: app.phone,
          email: app.email,
          tier: app.tier,
          score: app.score,
          state: app.state,
          assignedTo: app.assignedTo,
          note: app.note,
          contactedBy: pressedBy,
          at,
        },
        { channelId: app.slackChannelId, messageTs: app.slackMessageTs }
      );
      if (responseUrl) {
        await respond(
          responseUrl,
          res.moved
            ? `✅ ${app.name} marked contacted and moved to #cohort-contacted.`
            : `⚠️ Marked contacted, but Slack move failed: ${res.error ?? 'unknown'}`
        );
      }
      return;
    }

    // cohort_send:<channel>:<promo>
    const m = /^cohort_send:(sms|email|both):(0|1)$/.exec(actionId);
    if (!m) return;
    const channel = m[1] as CohortChannel;
    const withPromo = m[2] === '1';

    const result = await sendCohortCheckout({ app, channel, withPromo });
    if (responseUrl) await respond(responseUrl, result.summary(pressedBy));

    // Rewrite the card so the channel shows what's already gone out. Only on
    // success — a failed send must keep its button looking un-pressed, or a
    // closer reads "✅ Texted" and never retries.
    const msgTs = payload.message?.ts;
    const msgChannel = payload.channel?.id;
    const blocks = payload.message?.blocks;
    if (result.ok && msgTs && msgChannel && Array.isArray(blocks)) {
      const label = DONE_LABEL[actionId] ?? '✅ Sent';
      const when = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
      });
      const what = withPromo ? `${COHORT_PROMO_CODE} coupon` : 'checkout link';
      const how = channel === 'email' ? 'emailed' : 'texted';
      let next = markButtonDone(
        blocks as never,
        actionId,
        label,
        `Already ${how} to *${app.name}* at ${when} ET. Send the ${what} again?`
      );
      next = appendSentLog(next, `${label.replace('✅ ', '✅ ')} · ${pressedBy} · ${when} ET`);
      await updateMessage({
        channel: msgChannel,
        ts: msgTs,
        text: payload.message?.text || `Cohort application — ${app.name}`,
        blocks: next,
      });
    }
  });

  return NextResponse.json({ ok: true });
}
