/**
 * 12-Week Cohort — 3-payment plan.
 *
 * $3,500 × 3 = $10,500 (the $10,000 price plus $500 for financing it).
 *   · payment 1  at checkout — "saves their spot"
 *   · payment 2  Sep 14, 2026 — after the first 4 weeks
 *   · payment 3  Oct 12, 2026 — after the second 4 weeks
 *
 * WHY A SESSION IS CREATED PER APPLICANT
 *
 * Payments 2 and 3 land on FIXED CALENDAR DATES, but Fanbasis subscriptions are
 * interval-only — `frequency_days` counts forward from the purchase, and there
 * is no "bill on the 14th" option. A single reusable link would therefore bill
 * everyone a fixed number of days after whenever they happened to buy, which
 * drifts for every applicant.
 *
 * So the link is minted when a closer presses the button, with the gap to
 * Sep 14 computed from that day. Sep 14 → Oct 12 is exactly 28 days, so the
 * remaining two charges are a clean 28-day cycle.
 *
 * FIELD SEMANTICS (verified against the sandbox 2026-07-21, because the docs
 * do not spell this out and the two amounts use different units):
 *   · `initial_fee`   — DOLLARS. Charged at checkout. Surfaces on the checkout
 *                       page as `joining_fees` / `is_joining_fees: 1`.
 *   · `amount_cents`  — CENTS. The RECURRING amount (`formatted_recurring_subtotal`).
 *   · `frequency_days`— days between recurring charges (`payment_frequency`).
 *   · `auto_expire_after_x_periods` — how many recurring charges run.
 *
 * A probe with initial_fee 111 and amount_cents 350000 produced a first charge
 * of $111.00 and a recurring subtotal of $3,500.00, which is what pins these
 * meanings down.
 */

import { COHORT_METADATA_KEY } from '@/lib/cohort-checkout';

export const PLAN_PAYMENT_DOLLARS = 3_500;
export const PLAN_PAYMENTS = 3;
export const PLAN_TOTAL_DOLLARS = PLAN_PAYMENT_DOLLARS * PLAN_PAYMENTS; // $10,500
/** The financing premium over the $10,000 pay-in-full price. */
export const PLAN_INTEREST_DOLLARS = 500;

/** Fixed due dates, in the cohort's local calendar. */
export const PLAN_SECOND_PAYMENT = '2026-09-14';
export const PLAN_THIRD_PAYMENT = '2026-10-12';
export const COHORT_START = '2026-08-18';

/** Sep 14 → Oct 12. Exactly 28, which is why the tail is a clean cycle. */
export const PLAN_FREQUENCY_DAYS = 28;

export const planPriceLabel = () =>
  `3 × $${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')} = $${PLAN_TOTAL_DOLLARS.toLocaleString('en-US')}`;

/** Whole days from `from` to the second payment. UTC-normalized so a late-night
 *  press doesn't land a day off. */
export function daysUntilSecondPayment(from: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const [y, m, d] = PLAN_SECOND_PAYMENT.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  return Math.round((target - start) / 86_400_000);
}

export interface PlanCheckout {
  paymentLink: string;
  checkoutSessionId: number;
  /** Days deferred before payment 2 — echoed back so the caller can log it. */
  initialFeeDays: number;
}

/**
 * Mint a payment-plan checkout link for one applicant.
 *
 * Throws rather than returning a fallback link: a plan link that silently
 * degrades to the wrong schedule would take real money on the wrong dates.
 */
export async function createPlanCheckout(input: {
  applicationId: string;
  name: string;
  email: string;
  now?: Date;
}): Promise<PlanCheckout> {
  const apiKey = process.env.FANBASIS_API_KEY?.trim();
  if (!apiKey) throw new Error('FANBASIS_API_KEY is not set');
  const base = process.env.FANBASIS_BASE_URL || 'https://www.fanbasis.com/public-api';

  const initialFeeDays = daysUntilSecondPayment(input.now ?? new Date());
  if (initialFeeDays < 1) {
    throw new Error(
      `Second payment date ${PLAN_SECOND_PAYMENT} is not in the future — the plan needs new dates.`,
    );
  }

  const res = await fetch(`${base}/checkout-sessions`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      product: {
        title: '12-Week Medicaid Cohort — 3-Payment Plan',
        description: `$${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')} today to hold your seat, then ${PLAN_SECOND_PAYMENT} and ${PLAN_THIRD_PAYMENT}.`,
      },
      // Recurring amount (cents). The at-checkout charge is `initial_fee`.
      amount_cents: PLAN_PAYMENT_DOLLARS * 100,
      type: 'subscription',
      // Kept small deliberately: Fanbasis truncates api_metadata at ~240 chars.
      metadata: { cohort: COHORT_METADATA_KEY, applicationId: input.applicationId, plan: '3pay' },
      subscription: {
        frequency_days: PLAN_FREQUENCY_DAYS,
        auto_expire_after_x_periods: PLAN_PAYMENTS - 1, // 2 recurring after the joining fee
        initial_fee: PLAN_PAYMENT_DOLLARS, // DOLLARS — charged now
        initial_fee_days: initialFeeDays, // defer payment 2 to the fixed date
      },
      success_url: 'https://university.maxxedout.com/admin/cohort',
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== 'success' || !json?.data?.payment_link) {
    throw new Error(`Fanbasis rejected the plan session: ${res.status} ${JSON.stringify(json)?.slice(0, 300)}`);
  }

  return {
    paymentLink: json.data.payment_link,
    checkoutSessionId: json.data.checkout_session_id,
    initialFeeDays,
  };
}
