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
