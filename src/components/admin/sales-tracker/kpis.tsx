'use client';

/**
 * KPI library for the Sales Tracker dashboard. Each KPI is a small
 * compute function that returns a tile-renderable shape:
 *   { label, value, sub?, icon, tone }
 *
 * The picker drawer renders each KPI's *actual* live value as the
 * preview, so swapping one feels concrete (Rebecca sees the real
 * number, not just a name).
 */

import {
  DollarSign,
  Wallet,
  Target,
  Users,
  CheckCircle2,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { type EntryRow, effectiveCommissionCents, formatUSD } from './types';
import {
  DEFAULT_SLOTS,
  KPI_IDS,
  type KpiId,
  type KpiSlot,
} from './chart-config';

type Tone = 'blue' | 'emerald' | 'amber' | 'violet';

export interface KpiResult {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: Tone;
}

export interface KpiDefinition {
  id: KpiId;
  /** Short name shown in the picker. May or may not match the rendered label. */
  pickerName: string;
  description: string;
  compute: (entries: EntryRow[]) => KpiResult;
}

// ---- Helpers ---------------------------------------------------------
function totalDealCents(entries: EntryRow[]): number {
  return entries
    .filter((e) => e.didClose === 'YES')
    .reduce((acc, e) => acc + (e.dealAmountCents ?? 0), 0);
}
function totalCommissionCents(entries: EntryRow[]): number {
  return entries
    .filter((e) => e.didClose === 'YES')
    .reduce((acc, e) => acc + (effectiveCommissionCents(e) ?? 0), 0);
}
function paidCommissionCents(entries: EntryRow[]): number {
  return entries
    .filter((e) => e.didClose === 'YES' && e.commissionPaid)
    .reduce((acc, e) => acc + (effectiveCommissionCents(e) ?? 0), 0);
}
function showsCount(entries: EntryRow[]): number {
  return entries.filter((e) => e.didShow === 'YES').length;
}
function closesCount(entries: EntryRow[]): number {
  return entries.filter((e) => e.didClose === 'YES').length;
}
function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// ---- Library ---------------------------------------------------------
export const KPI_LIBRARY: KpiDefinition[] = [
  {
    id: 'total-deal-value',
    pickerName: 'Total Deal Value',
    description: 'Sum of every closed deal amount.',
    compute: (entries) => ({
      label: 'Total Deal Value',
      value: formatUSD(totalDealCents(entries)),
      sub: 'Closed deals only',
      icon: DollarSign,
      tone: 'blue',
    }),
  },
  {
    id: 'total-commission',
    pickerName: 'Total Commission',
    description: 'My commission earned across all closed deals.',
    compute: (entries) => ({
      label: 'Total Commission',
      value: formatUSD(totalCommissionCents(entries)),
      sub: `${closesCount(entries)} closed deals`,
      icon: Wallet,
      tone: 'emerald',
    }),
  },
  {
    id: 'commission-paid',
    pickerName: 'Commission Paid',
    description: "What's already been paid to me.",
    compute: (entries) => ({
      label: 'Commission Paid',
      value: formatUSD(paidCommissionCents(entries)),
      sub: 'Lifetime received',
      icon: CheckCircle2,
      tone: 'emerald',
    }),
  },
  {
    id: 'commission-owed',
    pickerName: 'Commission Owed',
    description: 'Total still owed to me.',
    compute: (entries) => {
      const total = totalCommissionCents(entries);
      const paid = paidCommissionCents(entries);
      return {
        label: 'Owed to me',
        value: formatUSD(total - paid),
        sub: 'Outstanding',
        icon: Wallet,
        tone: 'amber',
      };
    },
  },
  {
    id: 'conversion-rate',
    pickerName: 'Conversion Rate',
    description: '% of shows that closed (closes ÷ shows).',
    compute: (entries) => {
      const closes = closesCount(entries);
      const shows = showsCount(entries);
      return {
        label: 'Conversion Rate',
        value: pct(closes, shows),
        sub: `${closes}/${shows} shows closed`,
        icon: Target,
        tone: 'amber',
      };
    },
  },
  {
    id: 'close-rate-overall',
    pickerName: 'Close Rate (overall)',
    description: '% of all contacts that closed (closes ÷ contacts).',
    compute: (entries) => {
      const closes = closesCount(entries);
      const total = entries.length;
      return {
        label: 'Close Rate',
        value: pct(closes, total),
        sub: `${closes}/${total} contacts`,
        icon: Target,
        tone: 'violet',
      };
    },
  },
  {
    id: 'show-rate',
    pickerName: 'Show Rate',
    description: '% of contacts that actually showed up.',
    compute: (entries) => {
      const shows = showsCount(entries);
      const total = entries.length;
      return {
        label: 'Show Rate',
        value: pct(shows, total),
        sub: `${shows}/${total} contacts`,
        icon: Users,
        tone: 'blue',
      };
    },
  },
  {
    id: 'avg-deal-size',
    pickerName: 'Avg Deal Size',
    description: 'Average size of a closed deal.',
    compute: (entries) => {
      const closed = entries.filter(
        (e) => e.didClose === 'YES' && (e.dealAmountCents ?? 0) > 0
      );
      const total = closed.reduce((a, e) => a + (e.dealAmountCents ?? 0), 0);
      return {
        label: 'Avg Deal Size',
        value: closed.length === 0 ? '—' : formatUSD(Math.round(total / closed.length)),
        sub: `${closed.length} deals`,
        icon: TrendingUp,
        tone: 'blue',
      };
    },
  },
  {
    id: 'avg-commission',
    pickerName: 'Avg Commission per Deal',
    description: 'Average commission across closed deals.',
    compute: (entries) => {
      const closed = entries.filter((e) => e.didClose === 'YES');
      const total = closed.reduce(
        (a, e) => a + (effectiveCommissionCents(e) ?? 0),
        0
      );
      return {
        label: 'Avg Commission',
        value: closed.length === 0 ? '—' : formatUSD(Math.round(total / closed.length)),
        sub: `${closed.length} deals`,
        icon: Wallet,
        tone: 'emerald',
      };
    },
  },
  {
    id: 'deals-closed',
    pickerName: 'Deals Closed',
    description: 'Count of closed deals.',
    compute: (entries) => ({
      label: 'Deals Closed',
      value: String(closesCount(entries)),
      sub: `Out of ${entries.length} contacts`,
      icon: CheckCircle2,
      tone: 'emerald',
    }),
  },
  {
    id: 'total-contacts',
    pickerName: 'Total Contacts',
    description: 'Total number of entries in this session.',
    compute: (entries) => ({
      label: 'Total Contacts',
      value: String(entries.length),
      sub: 'All entries',
      icon: Layers,
      tone: 'blue',
    }),
  },
  {
    id: 'this-month-commission',
    pickerName: "This Month's Commission",
    description: 'Commission earned from deals closed this month.',
    compute: (entries) => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const total = entries
        .filter(
          (e) =>
            e.didClose === 'YES' &&
            e.contactDate &&
            new Date(e.contactDate) >= start
        )
        .reduce((a, e) => a + (effectiveCommissionCents(e) ?? 0), 0);
      return {
        label: 'This Month',
        value: formatUSD(total),
        sub: 'Commission earned',
        icon: Calendar,
        tone: 'violet',
      };
    },
  },
  {
    id: 'avg-days-to-payment',
    pickerName: 'Avg Days to Payment',
    description: 'Average gap between close date and pay date.',
    compute: (entries) => {
      const days: number[] = [];
      for (const e of entries) {
        if (e.didClose !== 'YES' || !e.contactDate || !e.commissionDue) continue;
        const a = new Date(e.contactDate).getTime();
        const b = new Date(e.commissionDue).getTime();
        const d = Math.round((b - a) / 86400000);
        if (d >= 0) days.push(d);
      }
      const avg = days.length === 0 ? null : days.reduce((s, d) => s + d, 0) / days.length;
      return {
        label: 'Avg Days to Pay',
        value: avg == null ? '—' : `${Math.round(avg)} days`,
        sub: days.length === 0 ? 'Need close + pay dates' : `Across ${days.length} deals`,
        icon: Clock,
        tone: 'amber',
      };
    },
  },
];

const KPI_BY_ID = new Map<KpiId, KpiDefinition>();
for (const k of KPI_LIBRARY) KPI_BY_ID.set(k.id, k);

export function kpiForSlot(
  layout: Record<string, string | undefined>,
  slot: KpiSlot
): KpiDefinition {
  const id = (layout[slot] ?? DEFAULT_SLOTS[slot]) as KpiId;
  return (
    KPI_BY_ID.get(id) ??
    KPI_BY_ID.get(DEFAULT_SLOTS[slot] as KpiId) ??
    KPI_LIBRARY[0]
  );
}

// Sanity check — every KPI_IDS entry has a definition.
if (process.env.NODE_ENV !== 'production') {
  const have = new Set(KPI_LIBRARY.map((k) => k.id));
  for (const id of KPI_IDS) {
    if (!have.has(id)) {
      // eslint-disable-next-line no-console
      console.error(`[kpis] id "${id}" in KPI_IDS but missing from KPI_LIBRARY`);
    }
  }
  for (const id of have) {
    if (!(KPI_IDS as readonly string[]).includes(id)) {
      // eslint-disable-next-line no-console
      console.error(`[kpis] id "${id}" in KPI_LIBRARY but missing from KPI_IDS`);
    }
  }
}

// Tile renderer — mirrors `Kpi` from SummaryWidgets but takes a definition + entries.
import { Kpi } from './SummaryWidgets';
import { createElement } from 'react';

export function KpiTile({
  definition,
  entries,
}: {
  definition: KpiDefinition;
  entries: EntryRow[];
}) {
  const r = definition.compute(entries);
  const Icon = r.icon;
  return (
    <Kpi
      label={r.label}
      value={r.value}
      sub={r.sub}
      icon={createElement(Icon, { className: 'w-5 h-5' })}
      tone={r.tone}
    />
  );
}
