import crypto from 'crypto';

/**
 * Slack request signature verification.
 *
 * The interactive endpoint is public and fires real texts and emails at
 * applicants, so the signature is the ONLY thing standing between Slack and
 * anyone who guesses the URL. Unsigned requests must be rejected outright —
 * never "allow if the secret isn't configured", which would turn a missing env
 * var into an open relay.
 *
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */

const VERSION = 'v0';
/** Slack's own recommendation: reject anything older, to blunt replay attacks. */
const MAX_AGE_SECONDS = 60 * 5;

export function slackSigningSecret(): string {
  return process.env.SLACK_SIGNING_SECRET?.trim() || '';
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: 'no_secret' | 'missing_headers' | 'stale' | 'bad_signature' };

export function verifySlackRequest(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  /** Injectable so tests aren't clock-dependent. */
  nowSeconds?: number;
}): VerifyOutcome {
  const secret = slackSigningSecret();
  if (!secret) return { ok: false, reason: 'no_secret' };
  if (!input.signature || !input.timestamp) return { ok: false, reason: 'missing_headers' };

  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'missing_headers' };

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_AGE_SECONDS) return { ok: false, reason: 'stale' };

  const expected = `${VERSION}=${crypto
    .createHmac('sha256', secret)
    .update(`${VERSION}:${ts}:${input.rawBody}`)
    .digest('hex')}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  if (a.length !== b.length) return { ok: false, reason: 'bad_signature' };
  return crypto.timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: 'bad_signature' };
}
