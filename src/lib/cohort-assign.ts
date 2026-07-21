import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * Cohort lead rotation — equal distribution across the closing team.
 *
 * Order is fixed so the rotation is predictable and auditable; the counter row
 * is incremented atomically in Postgres (update-and-return), so two
 * applications submitted in the same instant can never land on the same person.
 */
export const COHORT_CLOSERS = ['Mike', 'Miles', 'Jackie'] as const;
export type CohortCloser = (typeof COHORT_CLOSERS)[number];

const SCOPE = 'cohort-medicaid';

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

export function signCohortAction(id: string, promo: boolean): string {
  return crypto
    .createHmac('sha256', secret())
    .update(`${id}:${promo ? '1' : '0'}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyCohortAction(id: string, promo: boolean, token: string): boolean {
  const expected = signCohortAction(id, promo);
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
export function cohortSendUrl(id: string, promo: boolean): string {
  const t = signCohortAction(id, promo);
  return `${PUBLIC_HOST}/cohort-send/${id}?promo=${promo ? '1' : '0'}&t=${t}`;
}

/** Same reasoning — admin deep links in Slack must never be localhost. */
export const cohortCallSheetUrl = () => `${PUBLIC_HOST}/admin/cohort`;
