/**
 * Cohort application — question options, scoring, and tier triage.
 *
 * Single source of truth shared by the public form, the submit API, and the
 * closer dashboard. Spec: "Cohort Application — Live Webinar Form".
 *
 * Max score 28 = Q5 readiness (10) + Q6 investment (10) + Q7 work (8).
 * Q4 state is unscored but critical routing info; Q8 note is unscored.
 */

export const READINESS_OPTIONS = [
  { value: 'ready_now', label: "I'm ready to move now and I'm looking for the right guidance", points: 10, short: 'Ready now' },
  { value: 'serious_figuring_out', label: "I'm serious, but I have a few things to figure out first", points: 6, short: 'Serious' },
  { value: 'still_deciding', label: "I'm interested but still deciding if this is for me", points: 3, short: 'Deciding' },
  { value: 'gathering_info', label: "I'm just gathering information right now", points: 0, short: 'Gathering info' },
] as const;

// "How much do you have to invest in yourself right now?" — dollar ranges, no
// price is shown. Financing/BNPL is offered, so a smaller budget is NOT
// disqualifying; the top range is still the strongest buyer signal (auto Tier A).
export const INVESTMENT_OPTIONS = [
  { value: 'over_10k', label: '$10,000 or more', points: 10, short: '$10k+' },
  { value: '5k_10k', label: '$5,000 – $10,000', points: 7, short: '$5k–10k' },
  { value: 'under_5k', label: 'Less than $5,000', points: 3, short: 'Under $5k' },
] as const;

export const WORK_OPTIONS = [
  { value: 'owns_business', label: 'I own a business now', points: 8, short: 'Owns a business' },
  { value: 'owned_before', label: "I've owned a business before", points: 6, short: 'Owned before' },
  { value: 'employed', label: "I'm employed full-time, looking to build something of my own", points: 4, short: 'Employed' },
  { value: 'between_things', label: 'Currently between things', points: 2, short: 'Between things' },
] as const;

export type ReadinessValue = (typeof READINESS_OPTIONS)[number]['value'];
export type InvestmentValue = (typeof INVESTMENT_OPTIONS)[number]['value'];
export type WorkValue = (typeof WORK_OPTIONS)[number]['value'];
export type Tier = 'A' | 'B' | 'C' | 'D';

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

const pointsOf = <T extends { value: string; points: number }>(opts: readonly T[], v: string) =>
  opts.find((o) => o.value === v)?.points ?? 0;

/** Human-readable short label for the closer's one-line summary. */
export const shortOf = <T extends { value: string; short: string }>(opts: readonly T[], v: string) =>
  opts.find((o) => o.value === v)?.short ?? v;

export const TIER_ACTION: Record<Tier, string> = {
  A: 'Call first — dial within 30 min of class ending. Best closer.',
  B: 'Call same night — after all Tier A cleared.',
  C: 'Next morning, 8–11am. Any available closer.',
  D: 'Nurture — no live call. Email follow-up sequence.',
};

/**
 * Score + tier, including the spec's overrides:
 *  · $27 VIP buyer            → always Tier A (strongest buying signal we have)
 *  · "$10k+" on Q6            → always Tier A, even if everything else is soft
 *
 * No hard budget cap: financing/BNPL is offered, so a smaller budget no longer
 * disqualifies an otherwise-ready applicant from a live call — the point score
 * already down-weights it.
 */
export function scoreApplication(input: {
  readiness: string;
  investment: string;
  work: string;
  isVip?: boolean;
}): { score: number; tier: Tier; reasons: string[] } {
  const score =
    pointsOf(READINESS_OPTIONS, input.readiness) +
    pointsOf(INVESTMENT_OPTIONS, input.investment) +
    pointsOf(WORK_OPTIONS, input.work);

  let tier: Tier = score >= 21 ? 'A' : score >= 14 ? 'B' : score >= 7 ? 'C' : 'D';
  const reasons: string[] = [];

  // Upgrades first, then the cap — so "out of reach" still can't ride an
  // override into a same-night call.
  if (input.isVip) {
    tier = 'A';
    reasons.push('VIP buyer → auto Tier A');
  }
  if (input.investment === 'over_10k') {
    tier = 'A';
    reasons.push('$10k+ available → auto Tier A');
  }

  return { score, tier, reasons };
}

/** The closer's one-line summary, exactly as specified in the brief. */
export function closerLine(a: {
  name: string;
  state: string;
  readiness: string;
  investment: string;
  work: string;
  isVip: boolean;
  score: number;
  tier: string;
  note?: string | null;
}): string {
  const bits = [
    a.name,
    a.state,
    shortOf(READINESS_OPTIONS, a.readiness),
    shortOf(INVESTMENT_OPTIONS, a.investment),
    shortOf(WORK_OPTIONS, a.work),
  ];
  if (a.isVip) bits.push('VIP ✅');
  const head = `[TIER ${a.tier} — ${a.score} pts] ${bits.join(' · ')}`;
  return a.note?.trim() ? `${head}  Note: "${a.note.trim()}"` : head;
}
