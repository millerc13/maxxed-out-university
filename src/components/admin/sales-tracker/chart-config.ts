/**
 * Server-safe chart slot config — types, slot constants, sanitizer.
 *
 * Extracted from charts.tsx so the server page + API routes can import
 * `sanitizeChartLayout` and the chart-id whitelist without crossing the
 * 'use client' boundary that charts.tsx needs (Recharts components
 * have to live in a client module).
 *
 * Source of truth for *which chart ids exist*: the array below.
 * charts.tsx asserts at module-load that every id in CHART_REGISTRY
 * matches one in CHART_IDS, so they can't drift.
 */

export type ChartCategory =
  | 'trends'
  | 'distributions'
  | 'sections'
  | 'rankings'
  | 'funnel'
  | 'status'
  | 'calendar';

export type ChartSlot =
  | 'status'
  | 'funnel'
  | 'trend1'
  | 'trend2'
  | 'trend3'
  | 'ranking';

export type KpiSlot = 'kpi1' | 'kpi2' | 'kpi3' | 'kpi4';

export type Slot = ChartSlot | KpiSlot;

export const ALL_CHART_SLOTS: ChartSlot[] = [
  'status',
  'funnel',
  'trend1',
  'trend2',
  'trend3',
  'ranking',
];

export const ALL_KPI_SLOTS: KpiSlot[] = ['kpi1', 'kpi2', 'kpi3', 'kpi4'];

export const ALL_SLOTS: Slot[] = [...ALL_KPI_SLOTS, ...ALL_CHART_SLOTS];

export const DEFAULT_SLOTS: Record<Slot, string> = {
  // KPI defaults — match the original four tiles.
  kpi1: 'total-deal-value',
  kpi2: 'total-commission',
  kpi3: 'conversion-rate',
  kpi4: 'show-rate',
  // Chart defaults.
  status: 'paid-vs-owed',
  funnel: 'show-close-funnel',
  trend1: 'commission-over-time',
  trend2: 'close-rate-by-day',
  trend3: 'show-rate-by-day',
  ranking: 'top-5-deals',
};

export const SLOT_LABEL: Record<Slot, string> = {
  kpi1: 'KPI 1',
  kpi2: 'KPI 2',
  kpi3: 'KPI 3',
  kpi4: 'KPI 4',
  status: 'Status',
  funnel: 'Funnel',
  trend1: 'Trend 1',
  trend2: 'Trend 2',
  trend3: 'Trend 3',
  ranking: 'Ranking',
};

export function isKpiSlot(s: string): s is KpiSlot {
  return s === 'kpi1' || s === 'kpi2' || s === 'kpi3' || s === 'kpi4';
}
export function isChartSlot(s: string): s is ChartSlot {
  return ALL_CHART_SLOTS.includes(s as ChartSlot);
}

export const CATEGORY_LABEL: Record<ChartCategory, string> = {
  trends: 'Trends over time',
  distributions: 'Distributions',
  sections: 'By section',
  rankings: 'Rankings',
  funnel: 'Funnel',
  status: 'Status',
  calendar: 'Calendar',
};

export type ChartLayout = Partial<Record<Slot, string>>;

/**
 * Every KPI id allowed in the registry. Used by the sanitizer + API
 * to validate kpi-slot picks. KPI components live in kpis.tsx.
 */
export const KPI_IDS = [
  'total-deal-value',
  'total-commission',
  'commission-paid',
  'commission-owed',
  'conversion-rate',
  'close-rate-overall',
  'show-rate',
  'avg-deal-size',
  'avg-commission',
  'deals-closed',
  'total-contacts',
  'this-month-commission',
  'avg-days-to-payment',
] as const;

export type KpiId = (typeof KPI_IDS)[number];

const VALID_KPI_IDS = new Set<string>(KPI_IDS);

/**
 * Every chart id allowed in the registry. Kept here so the API route
 * can validate input without importing the React-component registry
 * (which has 'use client').
 */
export const CHART_IDS = [
  'commission-over-time',
  'close-rate-by-day',
  'show-rate-by-day',
  'cumulative-commission',
  'daily-deal-count',
  'avg-deal-by-week',
  'deal-size-histogram',
  'outcome-mix',
  'days-to-payment',
  'commission-rate-mix',
  'commission-by-section',
  'close-rate-by-section',
  'section-paid-vs-owed',
  'top-sections',
  'top-5-deals',
  'top-10-deals',
  'show-close-funnel',
  'funnel-bar',
  'paid-vs-owed',
  'outstanding-pipeline',
  'day-of-week',
] as const;

export type ChartId = (typeof CHART_IDS)[number];

const VALID_IDS = new Set<string>(CHART_IDS);

/**
 * Drop unknown slots / invalid ids so a stale layout from the DB can't
 * crash hydration. Each slot type has its own whitelist:
 *   - kpiN slots accept KPI_IDS
 *   - chart slots accept CHART_IDS
 */
export function sanitizeChartLayout(raw: unknown): ChartLayout {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: ChartLayout = {};
  const obj = raw as Record<string, unknown>;
  for (const slot of ALL_SLOTS) {
    const v = obj[slot];
    if (typeof v !== 'string') continue;
    if (isKpiSlot(slot) && VALID_KPI_IDS.has(v)) {
      out[slot] = v;
    } else if (isChartSlot(slot) && VALID_IDS.has(v)) {
      out[slot] = v;
    }
  }
  return out;
}

export function isValidChartId(id: unknown): id is ChartId {
  return typeof id === 'string' && VALID_IDS.has(id);
}

export function isValidKpiId(id: unknown): id is KpiId {
  return typeof id === 'string' && VALID_KPI_IDS.has(id);
}

/** Returns whether a chart-id is valid for the given slot. */
export function isValidIdForSlot(slot: Slot, id: string): boolean {
  if (isKpiSlot(slot)) return VALID_KPI_IDS.has(id);
  return VALID_IDS.has(id);
}
