import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * Cohort lead rotation — equal distribution across the closing team.
 *
 * Order is fixed so the rotation is predictable and auditable; the counter row
 * is incremented atomically in Postgres (update-and-return), so two
 * applications submitted in the same instant can never land on the same person.
 */
export const COHORT_CLOSERS = ['Mike', 'Miles', 'Jackie', 'Todd'] as const;
export type CohortCloser = (typeof COHORT_CLOSERS)[number];

const SCOPE = 'cohort-medicaid';

/**
 * Slack member IDs, so an assignment actually pings the closer's phone — bold
 * text notifies nobody.
 *
 * Only closers with a workspace account belong here; the rest fall back to
 * bold, because `<@U…>` with a wrong id renders as raw text and a made-up id
 * silently pings nobody. SLACK_CLOSER_IDS ("Mike:U123,Jackie:U456") adds the
 * remaining two the day their accounts exist, without a deploy.
 */
const CLOSER_SLACK_IDS: Record<string, string> = {
  Todd: 'U0A7G4PG7D3',
  Miles: 'U0A8ES2CT1N',
};

function closerSlackId(name: string): string | undefined {
  const overrides = (process.env.SLACK_CLOSER_IDS || '')
    .split(',')
    .map((pair) => pair.split(':').map((x) => x.trim()))
    .filter((p): p is [string, string] => p.length === 2 && Boolean(p[0] && p[1]));
  const fromEnv = overrides.find(([n]) => n.toLowerCase() === name.toLowerCase())?.[1];
  return fromEnv || CLOSER_SLACK_IDS[name];
}

/** `<@U…>` when we know the account, bold name otherwise. */
export function closerMention(name: string): string {
  const id = closerSlackId(name);
  return id ? `<@${id}>` : `*${name}*`;
}

/** Next closer in the rotation. Never throws — falls back to the first name. */
export async function nextCohortCloser(): Promise<string> {
  try {
    const updated = await prisma.assignmentCounter.upsert({
      where: { scope: SCOPE },
      create: { scope: SCOPE, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    return COHORT_CLOSERS[(updated.counter - 1) % COHORT_CLOSERS.length];
  } catch {
    return COHORT_CLOSERS[0];
  }
}

/**
 * Slack URL buttons can only OPEN a link — they cannot POST. So "text the
 * checkout link" is a signed URL that opens a one-tap confirm page, which then
 * performs the send. The signature is what authorizes it: the page is public
 * (a closer tapping from Slack on their phone won't be logged into the admin),
 * so the token must prove the link came from us and name exactly what it does.
 *
 * Deliberately NOT sent on the GET itself — link crawlers and mobile prefetch
 * would fire real texts at applicants.
 */
function secret(): string {
  return (
    process.env.COHORT_ACTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    'cohort-dev-secret'
  );
}

/** Which way the applicant gets their link. */
export type CohortChannel = 'sms' | 'email' | 'both';

export function signCohortAction(id: string, promo: boolean, channel: CohortChannel = 'both'): string {
  return crypto
    .createHmac('sha256', secret())
    .update(`${id}:${promo ? '1' : '0'}:${channel}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyCohortAction(
  id: string,
  promo: boolean,
  token: string,
  channel: CohortChannel = 'both',
): boolean {
  const expected = signCohortAction(id, promo, channel);
  const a = Buffer.from(expected);
  const b = Buffer.from(token || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Canonical public host for Slack action links.
 *
 * Deliberately NOT derived from NEXTAUTH_URL: running the app locally against
 * the shared production database fires real Slack notifications, and a
 * localhost link in the team's channel is dead for everyone who taps it
 * (this happened — the channel filled with http://localhost:3020 buttons).
 * A Slack button is always tapped by a human on another machine, so it must
 * always point at production.
 */
const PUBLIC_HOST = 'https://university.maxxedout.com';

/** The URL that goes on a Slack button. Always absolute + production. */
export function cohortSendUrl(id: string, promo: boolean, channel: CohortChannel = 'both'): string {
  const t = signCohortAction(id, promo, channel);
  return `${PUBLIC_HOST}/cohort-send/${id}?promo=${promo ? '1' : '0'}&ch=${channel}&t=${t}`;
}

/** Same reasoning — admin deep links in Slack must never be localhost. */
export const cohortCallSheetUrl = () => `${PUBLIC_HOST}/admin/cohort`;

/**
 * "Mark contacted" action link. Signed like the send links so a closer tapping
 * from Slack on their phone is authorized without being logged into the admin.
 * Carries the presser's name so the collapsed line can say who worked it —
 * the button is per-closer, not generic.
 */
export function signCohortContacted(id: string, by: string): string {
  return crypto.createHmac('sha256', secret()).update(`${id}:contacted:${by}`).digest('hex').slice(0, 32);
}

export function verifyCohortContacted(id: string, by: string, token: string): boolean {
  const a = Buffer.from(signCohortContacted(id, by));
  const b = Buffer.from(token || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function cohortContactedUrl(id: string, by: string): string {
  return `${PUBLIC_HOST}/cohort-contacted/${id}?by=${encodeURIComponent(by)}&t=${signCohortContacted(id, by)}`;
}
