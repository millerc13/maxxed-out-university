'use client';

import { ArrowRight } from 'lucide-react';
import { formatUSD } from './types';

/**
 * Small reusable widgets shared by the per-session Analytics view and
 * the cross-session summary on the index page. Kept presentation-only
 * — callers decide what data to feed in.
 */

export function PaidVsOwedBar({
  paidCents,
  unpaidCents,
}: {
  paidCents: number;
  unpaidCents: number;
}) {
  const total = paidCents + unpaidCents;
  if (total === 0) {
    return (
      <p className="text-xs text-gray-500">
        No commission to track yet. Close a deal in the Editor and it'll show up here.
      </p>
    );
  }
  const paidPct = (paidCents / total) * 100;
  const unpaidPct = 100 - paidPct;
  return (
    <div className="space-y-2">
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="flex h-full">
          {paidPct > 0 && (
            <div
              className="bg-emerald-500"
              style={{ width: `${paidPct}%` }}
              title={`Paid to me: ${paidPct.toFixed(0)}%`}
            />
          )}
          {unpaidPct > 0 && (
            <div
              className="bg-amber-500"
              style={{ width: `${unpaidPct}%` }}
              title={`Still owed to me: ${unpaidPct.toFixed(0)}%`}
            />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1.5" />
          Paid to me {formatUSD(paidCents)} ({paidPct.toFixed(0)}%)
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1.5" />
          Owed to me {formatUSD(unpaidCents)} ({unpaidPct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

export function Funnel({
  contacts,
  shows,
  closes,
  compact = false,
}: {
  contacts: number;
  shows: number;
  closes: number;
  compact?: boolean;
}) {
  const showRate = contacts === 0 ? 0 : (shows / contacts) * 100;
  const closeRate = shows === 0 ? 0 : (closes / shows) * 100;

  const stages: Array<{
    label: string;
    value: number;
    rate?: string;
    tone: 'blue' | 'sky' | 'emerald';
  }> = [
    { label: 'Contacts', value: contacts, tone: 'blue' },
    {
      label: 'Showed',
      value: shows,
      rate: `${showRate.toFixed(0)}% show rate`,
      tone: 'sky',
    },
    {
      label: 'Closed',
      value: closes,
      rate: `${closeRate.toFixed(0)}% close rate`,
      tone: 'emerald',
    },
  ];

  const toneStyles = {
    blue: 'bg-blue-50 ring-blue-200 text-blue-900',
    sky: 'bg-sky-50 ring-sky-200 text-sky-900',
    emerald: 'bg-emerald-50 ring-emerald-200 text-emerald-900',
  } as const;

  return (
    <div className="flex items-stretch gap-2">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-stretch flex-1">
          <div
            className={`flex-1 rounded-lg ring-1 ring-inset px-3 ${
              compact ? 'py-2' : 'py-3'
            } ${toneStyles[s.tone]}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              {s.label}
            </div>
            <div
              className={`mt-1 ${compact ? 'text-xl' : 'text-2xl'} font-bold tabular-nums`}
            >
              {s.value}
            </div>
            {s.rate && (
              <div className="mt-0.5 text-[11px] opacity-70">{s.rate}</div>
            )}
          </div>
          {i < stages.length - 1 && (
            <ArrowRight className="self-center w-4 h-4 mx-1 text-gray-300 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

const toneStyles: Record<string, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-maxxed-blue' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-700' },
  violet: { bg: 'bg-violet-50', fg: 'text-violet-700' },
};

export function Kpi({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const t = toneStyles[tone];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        {icon && (
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${t.bg} ${t.fg}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
