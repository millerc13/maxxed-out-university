/**
 * Slack Web API calls that an incoming webhook cannot do.
 *
 * A webhook can only append a message — it returns no message id, so nothing it
 * posts can ever be edited or deleted. Collapsing a lead card after a closer
 * works it therefore requires `chat.postMessage` (which returns `ts`) under a
 * bot token, with the `ts` stored alongside the lead.
 *
 * Every function here degrades instead of throwing: if the token is missing or
 * Slack rejects the call, the caller falls back to the webhook path that has
 * been carrying these alerts all along. A broken bot token must never cost a
 * live lead its notification.
 */

const SLACK_API = 'https://slack.com/api';

export const slackBotToken = () => process.env.SLACK_BOT_TOKEN?.trim() || '';
export const hasSlackBot = () => slackBotToken().length > 0;

/** Channel the cohort cards land in, and where they're collapsed in place. */
export const cohortChannelId = () => process.env.SLACK_COHORT_CHANNEL_ID?.trim() || '';
/** Channel the full card is re-posted to once a closer marks it contacted. */
export const cohortContactedChannelId = () =>
  process.env.SLACK_COHORT_CONTACTED_CHANNEL_ID?.trim() || '';

interface SlackApiResult<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function callSlack<T>(method: string, body: unknown): Promise<SlackApiResult<T>> {
  const token = slackBotToken();
  if (!token) return { ok: false, error: 'no_bot_token' };

  try {
    const res = await fetch(`${SLACK_API}/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
    // Slack answers 200 with {ok:false,error} for application-level failures,
    // so the HTTP status alone tells you nothing.
    const json = (await res.json()) as { ok: boolean; error?: string } & T;
    if (!json.ok) return { ok: false, error: json.error || 'slack_error' };
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch_failed' };
  }
}

export interface PostedMessage {
  channel: string;
  ts: string;
}

export async function postMessage(input: {
  channel: string;
  text: string;
  blocks?: unknown[];
}): Promise<SlackApiResult<PostedMessage>> {
  const r = await callSlack<{ channel: string; ts: string }>('chat.postMessage', input);
  return r.ok && r.data
    ? { ok: true, data: { channel: r.data.channel, ts: r.data.ts } }
    : { ok: false, error: r.error };
}

/** Removes a message entirely. Requires the `chat:delete` scope. */
export async function deleteMessage(input: {
  channel: string;
  ts: string;
}): Promise<SlackApiResult<unknown>> {
  return callSlack('chat.delete', input);
}

/** Rewrites a message in place. `blocks` REPLACES the previous blocks entirely. */
export async function updateMessage(input: {
  channel: string;
  ts: string;
  text: string;
  blocks?: unknown[];
}): Promise<SlackApiResult<unknown>> {
  return callSlack('chat.update', input);
}
