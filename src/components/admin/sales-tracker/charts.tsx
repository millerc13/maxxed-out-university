'use client';

/**
 * Chart library for the Sales Tracker analytics dashboard.
 *
 * Every chart is a small React component that takes the same
 * `entries: EntryRow[]` prop and renders into a uniform `h-72`
 * container, so any chart can be plugged into any slot. The registry
 * at the bottom of this file is the single source of truth for what's
 * available and is consumed by the picker drawer.
 *
 * Add a new chart: write the component, append it to CHART_REGISTRY.
 * Nothing else has to change.
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Layers,
  CalendarDays,
  PieChart as PieIcon,
  BarChart3,
  BarChartHorizontal,
  ChevronsUp,
  Trophy,
  ListOrdered,
  Wallet,
  CheckCircle2,
  Clock,
  Percent,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  type EntryRow,
  effectiveCommissionCents,
  formatUSD,
  tagStyles,
} from './types';
import { Funnel as FunnelCards, PaidVsOwedBar } from './SummaryWidgets';

const COLORS = {
  blue: '#2563eb',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
  sky: '#0ea5e9',
  teal: '#0d9488',
  pink: '#db2777',
  indigo: '#4f46e5',
  gray: '#94a3b8',
};

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 12,
};

const dollarsAxisFmt = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const percentAxisFmt = (v: number) => `${v}%`;
const intAxisFmt = (v: number) => `${v}`;

// ============================================================================
// Helpers — dataset transforms reused across multiple charts
// ============================================================================

function effInDollars(e: EntryRow): number {
  return (effectiveCommissionCents(e) ?? 0) / 100;
}

/** Sort YYYY-MM-DD strings ascending. */
function dayCmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Day key (YYYY-MM-DD) from an entry's contactDate, or null. */
function dayKey(e: EntryRow): string | null {
  return e.contactDate ? e.contactDate.slice(0, 10) : null;
}

function fmtShortDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
function fmtFullDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="min-w-0 h-72 flex items-center justify-center text-sm text-gray-400">
    {message}
  </div>
);

// ============================================================================
// 1. Commission Earned (default trend1)
// ============================================================================
export function CommissionEarnedChart({ entries }: { entries: EntryRow[] }) {
  const data = (() => {
    const closed = entries.filter((e) => e.didClose === 'YES');
    const m = new Map<string, { commission: number; deal: number }>();
    for (const e of closed) {
      const day = dayKey(e);
      if (!day) continue;
      const cur = m.get(day) ?? { commission: 0, deal: 0 };
      cur.commission += effInDollars(e);
      cur.deal += (e.dealAmountCents ?? 0) / 100;
      m.set(day, cur);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => dayCmp(a, b))
      .map(([day, v]) => ({ day, commission: v.commission, deal: v.deal }));
  })();
  if (data.length === 0)
    return <EmptyState message="No closed deals with dates yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="dealFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="commFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tickFormatter={dollarsAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={50} />
          <Tooltip
            formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))}
            labelFormatter={(d) => fmtFullDate(String(d))}
            contentStyle={tooltipStyle}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="deal" name="Deal Value" stroke={COLORS.blue} strokeWidth={2} fill="url(#dealFill)" isAnimationActive={false} />
          <Area type="monotone" dataKey="commission" name="Commission" stroke={COLORS.emerald} strokeWidth={2} fill="url(#commFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 2. Close Rate by Day (default trend2)
// ============================================================================
export function CloseRateByDayChart({ entries }: { entries: EntryRow[] }) {
  const data = ratesByDay(entries);
  if (data.length === 0)
    return <EmptyState message="No dated entries yet." />;
  return <RateAreaChart data={data} dataKey="closeRate" color={COLORS.emerald} gradientId="closeRateFill" tooltip={(d) => `${d.closes} closed of ${d.shows} shows`} />;
}

// ============================================================================
// 3. Show Rate by Day (default trend3)
// ============================================================================
export function ShowRateByDayChart({ entries }: { entries: EntryRow[] }) {
  const data = ratesByDay(entries);
  if (data.length === 0)
    return <EmptyState message="No dated entries yet." />;
  return <RateAreaChart data={data} dataKey="showRate" color={COLORS.blue} gradientId="showRateFill" tooltip={(d) => `${d.shows} showed of ${d.contacts} contacts`} />;
}

interface RatePoint {
  day: string;
  contacts: number;
  shows: number;
  closes: number;
  closeRate: number;
  showRate: number;
}
function ratesByDay(entries: EntryRow[]): RatePoint[] {
  const m = new Map<string, { contacts: number; shows: number; closes: number }>();
  for (const e of entries) {
    const day = dayKey(e);
    if (!day) continue;
    const cur = m.get(day) ?? { contacts: 0, shows: 0, closes: 0 };
    cur.contacts++;
    if (e.didShow === 'YES') cur.shows++;
    if (e.didClose === 'YES') cur.closes++;
    m.set(day, cur);
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => dayCmp(a, b))
    .map(([day, v]) => ({
      day,
      closeRate: v.shows === 0 ? 0 : (v.closes / v.shows) * 100,
      showRate: v.contacts === 0 ? 0 : (v.shows / v.contacts) * 100,
      contacts: v.contacts,
      shows: v.shows,
      closes: v.closes,
    }));
}

function RateAreaChart({
  data,
  dataKey,
  color,
  gradientId,
  tooltip,
}: {
  data: RatePoint[];
  dataKey: 'closeRate' | 'showRate';
  color: string;
  gradientId: string;
  tooltip: (d: RatePoint) => string;
}) {
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis domain={[0, 100]} tickFormatter={percentAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={40} />
          <Tooltip
            formatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
            labelFormatter={(d, p) => {
              const date = fmtFullDate(String(d));
              const pt = p?.[0]?.payload as RatePoint | undefined;
              return pt ? `${date} · ${tooltip(pt)}` : date;
            }}
            contentStyle={tooltipStyle}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 4. Cumulative Commission — running total of commission earned
// ============================================================================
export function CumulativeCommissionChart({ entries }: { entries: EntryRow[] }) {
  const closed = entries.filter((e) => e.didClose === 'YES');
  const byDay = new Map<string, number>();
  for (const e of closed) {
    const day = dayKey(e);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + effInDollars(e));
  }
  const sorted = Array.from(byDay.entries()).sort(([a], [b]) => dayCmp(a, b));
  if (sorted.length === 0)
    return <EmptyState message="No closed deals with dates yet." />;
  let running = 0;
  const data = sorted.map(([day, daily]) => {
    running += daily;
    return { day, daily, cumulative: running };
  });
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.violet} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.violet} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tickFormatter={dollarsAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={50} />
          <Tooltip formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} labelFormatter={(d) => fmtFullDate(String(d))} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="cumulative" name="Total earned" stroke={COLORS.violet} strokeWidth={2} fill="url(#cumFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 5. Daily Deal Count — bar of how many deals closed per day
// ============================================================================
export function DailyDealCountChart({ entries }: { entries: EntryRow[] }) {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.didClose !== 'YES') continue;
    const day = dayKey(e);
    if (!day) continue;
    m.set(day, (m.get(day) ?? 0) + 1);
  }
  const data = Array.from(m.entries())
    .sort(([a], [b]) => dayCmp(a, b))
    .map(([day, count]) => ({ day, count }));
  if (data.length === 0)
    return <EmptyState message="No closed deals with dates yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis allowDecimals={false} tickFormatter={intAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={32} />
          <Tooltip formatter={(v: unknown) => `${v} deals`} labelFormatter={(d) => fmtFullDate(String(d))} contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Deals closed" fill={COLORS.sky} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 6. Avg Deal Size by Week
// ============================================================================
export function AvgDealSizeByWeekChart({ entries }: { entries: EntryRow[] }) {
  // Group by ISO week start (Monday). Avg deal size in dollars.
  const m = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    if (e.didClose !== 'YES' || e.dealAmountCents == null) continue;
    const day = dayKey(e);
    if (!day) continue;
    const wk = isoWeekStart(day);
    const cur = m.get(wk) ?? { sum: 0, count: 0 };
    cur.sum += e.dealAmountCents / 100;
    cur.count++;
    m.set(wk, cur);
  }
  const data = Array.from(m.entries())
    .sort(([a], [b]) => dayCmp(a, b))
    .map(([wk, v]) => ({ wk, avg: v.sum / v.count }));
  if (data.length === 0)
    return <EmptyState message="No closed deals with deal amounts yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="avgDealFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="wk" tickFormatter={(d) => `Wk ${fmtShortDate(d)}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tickFormatter={dollarsAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={50} />
          <Tooltip formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} labelFormatter={(d) => `Week of ${fmtFullDate(String(d))}`} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="avg" name="Avg deal" stroke={COLORS.teal} strokeWidth={2} fill="url(#avgDealFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function isoWeekStart(yyyyMmDd: string): string {
  // Returns YYYY-MM-DD of Monday for the given date.
  const d = new Date(yyyyMmDd + 'T00:00:00Z');
  const day = d.getUTCDay() || 7; // Sun=0 → 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// 7. Deal Size Histogram
// ============================================================================
export function DealSizeHistogramChart({ entries }: { entries: EntryRow[] }) {
  const amts = entries
    .filter((e) => e.didClose === 'YES' && e.dealAmountCents != null && e.dealAmountCents > 0)
    .map((e) => (e.dealAmountCents ?? 0) / 100);
  if (amts.length === 0)
    return <EmptyState message="No closed deal amounts yet." />;

  // Choose ~6 buckets across the data range.
  const min = Math.min(...amts);
  const max = Math.max(...amts);
  const bucketCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(amts.length))));
  const span = max - min || 1;
  const step = span / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    lo: min + i * step,
    hi: min + (i + 1) * step,
    count: 0,
  }));
  for (const a of amts) {
    let idx = Math.floor((a - min) / step);
    if (idx >= bucketCount) idx = bucketCount - 1;
    buckets[idx].count++;
  }
  const data = buckets.map((b) => ({
    range: `${dollarsAxisFmt(b.lo)}–${dollarsAxisFmt(b.hi)}`,
    count: b.count,
  }));
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
          <YAxis allowDecimals={false} tickFormatter={intAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={32} />
          <Tooltip formatter={(v: unknown) => `${v} deals`} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.indigo} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 8. Outcome Mix — donut: closed vs showed-no-close vs no-show vs pending
// ============================================================================
export function OutcomeMixChart({ entries }: { entries: EntryRow[] }) {
  let closed = 0;
  let showedNoClose = 0;
  let noShow = 0;
  let pending = 0;
  for (const e of entries) {
    if (e.didClose === 'YES') closed++;
    else if (e.didShow === 'YES') showedNoClose++;
    else if (e.didShow === 'NO') noShow++;
    else pending++;
  }
  const slices = [
    { name: 'Closed', value: closed, color: COLORS.emerald },
    { name: 'Showed, no close', value: showedNoClose, color: COLORS.amber },
    { name: 'No-show', value: noShow, color: COLORS.rose },
    { name: 'Pending', value: pending, color: COLORS.gray },
  ].filter((s) => s.value > 0);
  if (slices.length === 0)
    return <EmptyState message="No entries yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={slices.length > 1 ? 2 : 0}
            dataKey="value"
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: unknown) => `${v}`} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 9. Days to Payment — histogram of (commissionDue - contactDate)
// ============================================================================
export function DaysToPaymentChart({ entries }: { entries: EntryRow[] }) {
  const days: number[] = [];
  for (const e of entries) {
    if (e.didClose !== 'YES' || !e.contactDate || !e.commissionDue) continue;
    const a = new Date(e.contactDate).getTime();
    const b = new Date(e.commissionDue).getTime();
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    if (diff >= 0) days.push(diff);
  }
  if (days.length === 0)
    return <EmptyState message="Need closed deals with both close + pay dates." />;
  const buckets = [
    { label: '0–7 days', lo: 0, hi: 7, count: 0 },
    { label: '8–14 days', lo: 8, hi: 14, count: 0 },
    { label: '15–30 days', lo: 15, hi: 30, count: 0 },
    { label: '31–60 days', lo: 31, hi: 60, count: 0 },
    { label: '61–90 days', lo: 61, hi: 90, count: 0 },
    { label: '90+ days', lo: 91, hi: Infinity, count: 0 },
  ];
  for (const d of days) {
    const b = buckets.find((x) => d >= x.lo && d <= x.hi);
    if (b) b.count++;
  }
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
          <YAxis allowDecimals={false} tickFormatter={intAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={32} />
          <Tooltip formatter={(v: unknown) => `${v} deals`} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.amber} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 10. Commission Rate Mix — frequency of each rate used
// ============================================================================
export function CommissionRateMixChart({ entries }: { entries: EntryRow[] }) {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.commissionRate == null) continue;
    const pct = (Number(e.commissionRate) * 100).toFixed(2);
    counts.set(pct, (counts.get(pct) ?? 0) + 1);
  }
  const data = Array.from(counts.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rate, count]) => ({ rate: `${rate}%`, count }));
  if (data.length === 0)
    return <EmptyState message="No commission rates set." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="rate" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis allowDecimals={false} tickFormatter={intAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={32} />
          <Tooltip formatter={(v: unknown) => `${v} entries`} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.pink} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 11. Commission by Section — horizontal bar
// ============================================================================
export function CommissionBySectionChart({ entries }: { entries: EntryRow[] }) {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.didClose !== 'YES') continue;
    const tag = e.tag ?? 'Uncategorized';
    m.set(tag, (m.get(tag) ?? 0) + effInDollars(e));
  }
  const data = Array.from(m.entries())
    .map(([tag, value]) => ({ tag, value }))
    .sort((a, b) => b.value - a.value);
  if (data.length === 0)
    return <EmptyState message="No closed deals yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={dollarsAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis type="category" dataKey="tag" tick={{ fontSize: 11, fill: '#374151' }} width={100} />
          <Tooltip formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={COLORS.emerald} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} style={{ fontSize: 10, fill: '#374151' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 12. Close Rate by Section
// ============================================================================
export function CloseRateBySectionChart({ entries }: { entries: EntryRow[] }) {
  const m = new Map<string, { shows: number; closes: number }>();
  for (const e of entries) {
    const tag = e.tag ?? 'Uncategorized';
    const cur = m.get(tag) ?? { shows: 0, closes: 0 };
    if (e.didShow === 'YES') cur.shows++;
    if (e.didClose === 'YES') cur.closes++;
    m.set(tag, cur);
  }
  const data = Array.from(m.entries())
    .filter(([, v]) => v.shows > 0)
    .map(([tag, v]) => ({
      tag,
      rate: (v.closes / v.shows) * 100,
      label: `${v.closes}/${v.shows}`,
    }))
    .sort((a, b) => b.rate - a.rate);
  if (data.length === 0)
    return <EmptyState message="No sections with shows yet." />;
  const overallShows = entries.filter((e) => e.didShow === 'YES').length;
  const overallCloses = entries.filter((e) => e.didClose === 'YES').length;
  const overallRate = overallShows === 0 ? 0 : (overallCloses / overallShows) * 100;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="tag" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
          <YAxis domain={[0, 100]} tickFormatter={percentAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={40} />
          <Tooltip
            formatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
            labelFormatter={(_l, p) => {
              const pt = p?.[0]?.payload as { tag: string; label: string } | undefined;
              return pt ? `${pt.tag} · ${pt.label}` : '';
            }}
            contentStyle={tooltipStyle}
          />
          <ReferenceLine y={overallRate} stroke={COLORS.gray} strokeDasharray="4 4" label={{ value: `Overall ${overallRate.toFixed(0)}%`, position: 'right', fontSize: 10, fill: '#6b7280' }} />
          <Bar dataKey="rate" fill={COLORS.violet} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 13. Section Paid vs Owed — stacked horizontal bar
// ============================================================================
export function SectionPaidVsOwedChart({ entries }: { entries: EntryRow[] }) {
  const m = new Map<string, { paid: number; owed: number }>();
  for (const e of entries) {
    if (e.didClose !== 'YES') continue;
    const tag = e.tag ?? 'Uncategorized';
    const cur = m.get(tag) ?? { paid: 0, owed: 0 };
    const eff = effInDollars(e);
    if (e.commissionPaid) cur.paid += eff;
    else cur.owed += eff;
    m.set(tag, cur);
  }
  const data = Array.from(m.entries())
    .map(([tag, v]) => ({ tag, paid: v.paid, owed: v.owed, total: v.paid + v.owed }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);
  if (data.length === 0)
    return <EmptyState message="No commission earned yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={dollarsAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis type="category" dataKey="tag" tick={{ fontSize: 11, fill: '#374151' }} width={100} />
          <Tooltip formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="paid" name="Paid to me" stackId="a" fill={COLORS.emerald} radius={[4, 0, 0, 4]} isAnimationActive={false} />
          <Bar dataKey="owed" name="Still owed" stackId="a" fill={COLORS.amber} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 14. Top Sections by Revenue — same as commission-by-section but called out
// ============================================================================
export function TopSectionsChart({ entries }: { entries: EntryRow[] }) {
  // Reuse Commission by Section with a different ranking emphasis.
  return <CommissionBySectionChart entries={entries} />;
}

// ============================================================================
// 15. Top 5 Closed Deals (default ranking) — list, not Recharts
// ============================================================================
export function TopDealsList({
  entries,
  limit = 5,
}: {
  entries: EntryRow[];
  limit?: number;
}) {
  const closed = entries
    .filter((e) => e.didClose === 'YES' && (e.dealAmountCents ?? 0) > 0)
    .sort((a, b) => (b.dealAmountCents ?? 0) - (a.dealAmountCents ?? 0))
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      name: e.name ?? '(no name)',
      deal: e.dealAmountCents ?? 0,
      commission: effectiveCommissionCents(e) ?? 0,
    }));
  if (closed.length === 0)
    return <EmptyState message="No closed deals yet." />;
  return (
    <ul className="divide-y divide-gray-100 min-w-0 h-72 overflow-y-auto">
      {closed.map((d, i) => (
        <li key={d.id} className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
              {i + 1}
            </span>
            <span className="font-semibold text-gray-900 truncate">{d.name}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold tabular-nums text-gray-900">{formatUSD(d.deal)}</div>
            <div className="text-xs text-gray-500 tabular-nums">Comm {formatUSD(d.commission)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
function Top5Deals({ entries }: { entries: EntryRow[] }) {
  return <TopDealsList entries={entries} limit={5} />;
}
function Top10Deals({ entries }: { entries: EntryRow[] }) {
  return <TopDealsList entries={entries} limit={10} />;
}

// ============================================================================
// 16. Show / Close Funnel (default funnel) — reuses SummaryWidgets.Funnel
// ============================================================================
export function ShowCloseFunnel({ entries }: { entries: EntryRow[] }) {
  const totalContacts = entries.length;
  const shows = entries.filter((e) => e.didShow === 'YES').length;
  const closes = entries.filter((e) => e.didClose === 'YES').length;
  return (
    <div className="min-w-0 min-h-[18rem] flex items-center">
      <div className="w-full">
        <FunnelCards contacts={totalContacts} shows={shows} closes={closes} />
      </div>
    </div>
  );
}

// ============================================================================
// 17. Funnel Bar — vertical drop-off
// ============================================================================
export function FunnelBarChart({ entries }: { entries: EntryRow[] }) {
  const totalContacts = entries.length;
  const shows = entries.filter((e) => e.didShow === 'YES').length;
  const closes = entries.filter((e) => e.didClose === 'YES').length;
  const data = [
    { stage: 'Contacts', value: totalContacts, fill: COLORS.blue },
    { stage: 'Showed', value: shows, fill: COLORS.sky },
    { stage: 'Closed', value: closes, fill: COLORS.emerald },
  ];
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#374151' }} />
          <YAxis allowDecimals={false} tickFormatter={intAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.stage} fill={d.fill} />
            ))}
            <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#111827' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 18. Paid vs Owed Progress (default status) — reuses SummaryWidgets
// ============================================================================
export function PaidVsOwedProgress({ entries }: { entries: EntryRow[] }) {
  let paid = 0;
  let owed = 0;
  for (const e of entries) {
    if (e.didClose !== 'YES') continue;
    const eff = effectiveCommissionCents(e) ?? 0;
    if (e.commissionPaid) paid += eff;
    else owed += eff;
  }
  return (
    <div className="min-w-0 min-h-[18rem] flex flex-col justify-center gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3 ring-1 bg-emerald-50 ring-emerald-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            Paid to me
          </div>
          <div className="mt-1 text-lg font-bold text-gray-900 tabular-nums">{formatUSD(paid)}</div>
        </div>
        <div className="rounded-lg p-3 ring-1 bg-amber-50 ring-amber-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Wallet className="w-4 h-4" />
            Still owed to me
          </div>
          <div className="mt-1 text-lg font-bold text-gray-900 tabular-nums">{formatUSD(owed)}</div>
        </div>
      </div>
      <PaidVsOwedBar paidCents={paid} unpaidCents={owed} />
    </div>
  );
}

// ============================================================================
// 19. Outstanding Pipeline by Section — stacked bar of what's still owed
// ============================================================================
export function OutstandingPipelineChart({ entries }: { entries: EntryRow[] }) {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.didClose !== 'YES' || e.commissionPaid) continue;
    const tag = e.tag ?? 'Uncategorized';
    m.set(tag, (m.get(tag) ?? 0) + effInDollars(e));
  }
  const data = Array.from(m.entries())
    .map(([tag, value]) => ({ tag, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  if (data.length === 0)
    return <EmptyState message="No outstanding commission. 🎉" />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={dollarsAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis type="category" dataKey="tag" tick={{ fontSize: 11, fill: '#374151' }} width={100} />
          <Tooltip formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={COLORS.amber} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => formatUSD(Math.round(Number(v) * 100))} style={{ fontSize: 10, fill: '#374151' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// 20. Day of Week Performance — close rate per weekday
// ============================================================================
export function DayOfWeekChart({ entries }: { entries: EntryRow[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = days.map((label) => ({ label, contacts: 0, shows: 0, closes: 0 }));
  for (const e of entries) {
    if (!e.contactDate) continue;
    const d = new Date(e.contactDate);
    const idx = d.getDay();
    buckets[idx].contacts++;
    if (e.didShow === 'YES') buckets[idx].shows++;
    if (e.didClose === 'YES') buckets[idx].closes++;
  }
  const data = buckets.map((b) => ({
    label: b.label,
    closeRate: b.shows === 0 ? 0 : (b.closes / b.shows) * 100,
    contacts: b.contacts,
    shows: b.shows,
    closes: b.closes,
  }));
  if (data.every((d) => d.contacts === 0))
    return <EmptyState message="No dated entries yet." />;
  return (
    <div className="min-w-0 h-72">
      <ResponsiveContainer width="99%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#374151' }} />
          <YAxis domain={[0, 100]} tickFormatter={percentAxisFmt} tick={{ fontSize: 11, fill: '#6b7280' }} width={40} />
          <Tooltip
            formatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
            labelFormatter={(_l, p) => {
              const pt = p?.[0]?.payload as { label: string; closes: number; shows: number } | undefined;
              return pt ? `${pt.label} · ${pt.closes}/${pt.shows} shows closed` : '';
            }}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="closeRate" fill={COLORS.indigo} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Registry
// ============================================================================

import {
  CATEGORY_LABEL as CONFIG_CATEGORY_LABEL,
  ALL_SLOTS as CONFIG_ALL_SLOTS,
  DEFAULT_SLOTS as CONFIG_DEFAULT_SLOTS,
  SLOT_LABEL as CONFIG_SLOT_LABEL,
  CHART_IDS,
  sanitizeChartLayout as configSanitize,
  isValidChartId,
  type ChartCategory,
  type ChartSlot,
  type ChartLayout as ConfigChartLayout,
} from './chart-config';

export type { ChartCategory, ChartSlot } from './chart-config';
export type ChartLayout = ConfigChartLayout;

export interface ChartDefinition {
  id: string;
  name: string;
  description: string;
  category: ChartCategory;
  icon: LucideIcon;
  Component: React.FC<{ entries: EntryRow[] }>;
}

export const CHART_REGISTRY: ChartDefinition[] = [
  // Trends
  {
    id: 'commission-over-time',
    name: 'Commission Earned',
    description: 'Deal value + commission, day by day.',
    category: 'trends',
    icon: TrendingUp,
    Component: CommissionEarnedChart,
  },
  {
    id: 'close-rate-by-day',
    name: 'Close Rate by Day',
    description: 'What % of shows closed each day.',
    category: 'trends',
    icon: Target,
    Component: CloseRateByDayChart,
  },
  {
    id: 'show-rate-by-day',
    name: 'Show Rate by Day',
    description: 'What % of contacts showed each day.',
    category: 'trends',
    icon: Activity,
    Component: ShowRateByDayChart,
  },
  {
    id: 'cumulative-commission',
    name: 'Cumulative Commission',
    description: 'Running total of commission earned.',
    category: 'trends',
    icon: ChevronsUp,
    Component: CumulativeCommissionChart,
  },
  {
    id: 'daily-deal-count',
    name: 'Daily Deal Count',
    description: 'How many deals closed each day.',
    category: 'trends',
    icon: BarChart3,
    Component: DailyDealCountChart,
  },
  {
    id: 'avg-deal-by-week',
    name: 'Avg Deal Size by Week',
    description: 'Are deals getting bigger over time?',
    category: 'trends',
    icon: TrendingUp,
    Component: AvgDealSizeByWeekChart,
  },
  // Distributions
  {
    id: 'deal-size-histogram',
    name: 'Deal Size Histogram',
    description: 'Distribution of deal amounts.',
    category: 'distributions',
    icon: BarChart3,
    Component: DealSizeHistogramChart,
  },
  {
    id: 'outcome-mix',
    name: 'Outcome Mix',
    description: 'Closed vs showed-no-close vs no-show.',
    category: 'distributions',
    icon: PieIcon,
    Component: OutcomeMixChart,
  },
  {
    id: 'days-to-payment',
    name: 'Days to Payment',
    description: 'How long from close to expected pay date.',
    category: 'distributions',
    icon: Clock,
    Component: DaysToPaymentChart,
  },
  {
    id: 'commission-rate-mix',
    name: 'Commission Rate Mix',
    description: 'Frequency of each commission % used.',
    category: 'distributions',
    icon: Percent,
    Component: CommissionRateMixChart,
  },
  // Sections
  {
    id: 'commission-by-section',
    name: 'Commission by Section',
    description: 'Total commission earned per section.',
    category: 'sections',
    icon: BarChartHorizontal,
    Component: CommissionBySectionChart,
  },
  {
    id: 'close-rate-by-section',
    name: 'Close Rate by Section',
    description: 'Conversion rate per section vs overall.',
    category: 'sections',
    icon: Target,
    Component: CloseRateBySectionChart,
  },
  {
    id: 'section-paid-vs-owed',
    name: 'Section Paid vs Owed',
    description: 'Paid + still-owed split per section.',
    category: 'sections',
    icon: Layers,
    Component: SectionPaidVsOwedChart,
  },
  {
    id: 'top-sections',
    name: 'Top Sections by Revenue',
    description: 'Sections ranked by total commission.',
    category: 'sections',
    icon: Trophy,
    Component: TopSectionsChart,
  },
  // Rankings
  {
    id: 'top-5-deals',
    name: 'Top 5 Closed Deals',
    description: 'Biggest 5 closed deals.',
    category: 'rankings',
    icon: Trophy,
    Component: Top5Deals,
  },
  {
    id: 'top-10-deals',
    name: 'Top 10 Closed Deals',
    description: 'Biggest 10 closed deals (extended list).',
    category: 'rankings',
    icon: ListOrdered,
    Component: Top10Deals,
  },
  // Funnel
  {
    id: 'show-close-funnel',
    name: 'Show / Close Funnel',
    description: 'Contacts → Showed → Closed cards.',
    category: 'funnel',
    icon: Target,
    Component: ShowCloseFunnel,
  },
  {
    id: 'funnel-bar',
    name: 'Funnel Bar Chart',
    description: 'Same funnel as a vertical bar drop-off.',
    category: 'funnel',
    icon: BarChart3,
    Component: FunnelBarChart,
  },
  // Status
  {
    id: 'paid-vs-owed',
    name: 'Paid vs Owed Progress',
    description: 'Paid amount vs outstanding commission.',
    category: 'status',
    icon: Wallet,
    Component: PaidVsOwedProgress,
  },
  {
    id: 'outstanding-pipeline',
    name: 'Outstanding Pipeline',
    description: "What's still owed to me, by section.",
    category: 'status',
    icon: Wallet,
    Component: OutstandingPipelineChart,
  },
  // Calendar
  {
    id: 'day-of-week',
    name: 'Day-of-Week Performance',
    description: 'Avg close rate per weekday.',
    category: 'calendar',
    icon: CalendarDays,
    Component: DayOfWeekChart,
  },
];

// Re-export the slot/layout config helpers from the server-safe module
// so existing imports (`import { ... } from './charts'`) keep working
// for the client-side editor UI. Server code should import from
// './chart-config' directly to avoid pulling in Recharts.
export const CATEGORY_LABEL = CONFIG_CATEGORY_LABEL;
export const ALL_SLOTS = CONFIG_ALL_SLOTS;
export const DEFAULT_SLOTS = CONFIG_DEFAULT_SLOTS;
export const SLOT_LABEL = CONFIG_SLOT_LABEL;
export const sanitizeChartLayout = configSanitize;

// Sanity check at module-load: every id in CHART_REGISTRY must be in
// CHART_IDS, otherwise the API route would reject a chart we render.
// Only fires in dev — the typed list is exhaustive enough that prod
// can't get here unless someone forgot to update both files.
if (process.env.NODE_ENV !== 'production') {
  const idsInRegistry = new Set(CHART_REGISTRY.map((c) => c.id));
  const idsInConfig = new Set(CHART_IDS);
  for (const id of idsInRegistry) {
    if (!idsInConfig.has(id as (typeof CHART_IDS)[number])) {
      // eslint-disable-next-line no-console
      console.error(
        `[charts] id "${id}" is in CHART_REGISTRY but missing from CHART_IDS in chart-config.ts`
      );
    }
  }
  for (const id of idsInConfig) {
    if (!idsInRegistry.has(id)) {
      // eslint-disable-next-line no-console
      console.error(
        `[charts] id "${id}" is in CHART_IDS but missing a component in CHART_REGISTRY`
      );
    }
  }
}

export function chartForSlot(layout: ChartLayout, slot: ChartSlot): ChartDefinition {
  const id =
    (layout[slot] && isValidChartId(layout[slot]) ? layout[slot] : undefined) ??
    DEFAULT_SLOTS[slot];
  return (
    CHART_REGISTRY.find((c) => c.id === id) ??
    CHART_REGISTRY.find((c) => c.id === DEFAULT_SLOTS[slot]) ??
    CHART_REGISTRY[0]
  );
}
