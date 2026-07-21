/**
 * Cohort checkout — the single reusable Fanbasis/Commas payment link.
 *
 * Created on the LIVE Fanbasis account (2026-07-21) as an `onetime_reusable`
 * session so one link serves every applicant:
 *   product id           3Eyqn
 *   checkout_session_id  1120180  (the integer `service_id` promo codes attach to)
 *   metadata             { cohort: "medicaid-2026-q3", source: "cohort-application" }
 *
 * Because the link is reusable its metadata is FIXED — it cannot carry a
 * per-applicant id. Payments are attributed back to a CohortApplication by
 * buyer email in the webhook (see api/webhooks/fanbasis).
 *
 * Env override exists so the link/price can change without a deploy.
 */

export const COHORT_CHECKOUT_URL =
  process.env.COHORT_CHECKOUT_URL || 'https://www.fanbasis.com/agency-checkout/maxxed-out/3Eyqn';

/** Marks a Fanbasis payment as belonging to this cohort (metadata + webhook match). */
export const COHORT_METADATA_KEY = 'medicaid-2026-q3';

export const COHORT_PRICE_CENTS = 1_000_000; // $10,000

/** 15% off — verified live: $10,000 → $8,500. Buyers enter it on the checkout page. */
export const COHORT_PROMO_CODE = process.env.COHORT_PROMO_CODE || 'COHORT15';
export const COHORT_PROMO_PERCENT = 15;

export const cohortPriceLabel = () => `$${(COHORT_PRICE_CENTS / 100).toLocaleString('en-US')}`;

export const cohortPromoPriceLabel = () =>
  `$${((COHORT_PRICE_CENTS * (1 - COHORT_PROMO_PERCENT / 100)) / 100).toLocaleString('en-US')}`;

/**
 * Send history is kept as human-readable lines in `closerNotes` — closers read
 * them mid-call, so they stay prose. Writing and parsing live together here so
 * the two can't drift: a reader that silently stops matching would downgrade
 * the duplicate-send warning to nothing without failing anywhere.
 */
export interface CohortSend {
  /** Localized timestamp exactly as written, e.g. "7/21/2026, 3:30:22 PM". */
  at: string;
  promo: boolean;
  /** Whether that channel actually delivered (false = skipped or failed). */
  email: boolean;
  sms: boolean;
}

export function formatSendStamp(s: {
  at: Date;
  promo: boolean;
  emailOk: boolean | null;
  smsOk: boolean | null;
}): string {
  const mark = (v: boolean | null) => (v === null ? 'skipped' : v ? 'ok' : 'FAILED');
  const when = s.at.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return `[${when} ET] Checkout link sent${s.promo ? ` (${COHORT_PROMO_CODE})` : ''} — email:${mark(
    s.emailOk
  )} sms:${mark(s.smsOk)}`;
}

const STAMP_RE = /^\[(.+?) ET\] Checkout link sent(?: \((.+?)\))? — email:(\w+) sms:(\w+)$/;

export function parseSendStamps(notes: string | null | undefined): CohortSend[] {
  if (!notes) return [];
  return notes.split('\n').flatMap((line) => {
    const m = STAMP_RE.exec(line.trim());
    if (!m) return [];
    return [{ at: m[1], promo: Boolean(m[2]), email: m[3] === 'ok', sms: m[4] === 'ok' }];
  });
}
