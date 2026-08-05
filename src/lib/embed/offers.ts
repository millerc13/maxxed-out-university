/**
 * Canonical offer taxonomy for revenue reporting.
 *
 * Money arrives under many labels — Fanbasis product titles, GHL funnel
 * names, course slugs — and Todd thinks in offers. This maps any label
 * to one of the canonical offers so every widget groups revenue the
 * same way. Matching is heuristic on purpose: Fanbasis titles include
 * one-off custom deals ("Brian Johnson - 4k downpayment mentorship")
 * that still belong to an offer bucket.
 */

export type CanonicalOffer = {
  id: string;
  label: string;
  /** Index into the validated categorical palette (see embed/theme). */
  colorIndex: number;
};

export const OFFERS: CanonicalOffer[] = [
  { id: 'blueprint', label: 'RE Empire Blueprint', colorIndex: 0 },
  { id: 'mentorship', label: 'Mentorship (1-1 / 6mo / 12mo)', colorIndex: 1 },
  { id: 'cohort', label: 'Medicaid 12-Week Cohort', colorIndex: 2 },
  { id: 'webinar-vip', label: 'Webinar VIP ($27)', colorIndex: 3 },
  { id: 'inner-circle', label: 'Inner Circle Jet Experience', colorIndex: 4 },
  { id: 'accelerator', label: 'Business Accelerator', colorIndex: 0 },
  { id: 'mastermind-live', label: 'Mastermind LIVE (event)', colorIndex: 1 },
  { id: 'other', label: 'Other / Uncategorized', colorIndex: 2 },
];

const offerById = new Map(OFFERS.map((o) => [o.id, o]));

export function offerFor(rawLabel: string): CanonicalOffer {
  const s = rawLabel.toLowerCase();

  if (s.includes('blueprint')) return offerById.get('blueprint')!;
  if (s.includes('cohort') || s.includes('12-week') || s.includes('12 week')) {
    return offerById.get('cohort')!;
  }
  // The medicaid webinar VIP session sells as "...Recurring Cash Flow in
  // Medicaid Services — VIP Session" ($27).
  if (s.includes('medicaid') && (s.includes('vip') || s.includes('session'))) {
    return offerById.get('webinar-vip')!;
  }
  if (s.includes('medicaid')) return offerById.get('cohort')!;
  if (s.includes('inner circle') || s.includes('jet')) return offerById.get('inner-circle')!;
  if (s.includes('accelerator')) return offerById.get('accelerator')!;
  if (s.includes('mastermind')) return offerById.get('mastermind-live')!;
  if (s.includes('mentorship') || s.includes('mentor')) return offerById.get('mentorship')!;
  // Fanbasis "Installment Payment" rows are cohort/mentorship plan
  // payments; without a better label they bucket to Other.
  return offerById.get('other')!;
}

/**
 * True for internal test purchases that must never count as revenue:
 * $1 webhook-verification products and anything bought by the dev
 * account.
 */
export function isTestTransaction(productTitle: string, buyerEmail: string): boolean {
  const t = productTitle.toLowerCase();
  if (t.includes('test')) return true;
  if (buyerEmail === 'cj-miller@resurgence.cloud') return true;
  return false;
}
