'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, Settings2 } from 'lucide-react';
import { type EntryRow } from './types';
import {
  ALL_CHART_SLOTS,
  ALL_KPI_SLOTS,
  DEFAULT_SLOTS,
  type ChartLayout,
  type ChartSlot,
  type KpiSlot,
  type Slot,
} from './chart-config';
import { chartForSlot } from './charts';
import { kpiForSlot, KpiTile } from './kpis';
import { ChartDrawer } from './ChartDrawer';

type DateRange = 'all' | 'this-month' | 'last-30' | 'last-90';

function rangeStart(range: DateRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'this-month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const days = range === 'last-30' ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

interface Props {
  entries: EntryRow[];
  scopedTag?: string | null;
  onClearScope?: () => void;
  // Slot picks for this session. Layout holds both KPI ids (kpi1..kpi4)
  // and chart ids (status / funnel / trend1 / ...). Empty/missing
  // slots fall back to DEFAULT_SLOTS.
  chartLayout?: ChartLayout;
  // Save a new id to a slot. Pass `null` to revert that slot.
  onChangeSlot?: (slot: Slot, id: string | null) => void;
  // Reset every slot at once.
  onResetAllCharts?: () => void;
}

export function Analytics({
  entries,
  scopedTag,
  onClearScope,
  chartLayout,
  onChangeSlot,
  onResetAllCharts,
}: Props) {
  const [range, setRange] = useState<DateRange>('all');
  const [openSlot, setOpenSlot] = useState<Slot | null>(null);

  // Filter entries by section scope (from drill-down) and date range.
  const filteredEntries = useMemo(() => {
    const scopeFiltered = scopedTag
      ? entries.filter((e) => e.tag === scopedTag)
      : entries;
    if (range === 'all') return scopeFiltered;
    const start = rangeStart(range);
    if (!start) return scopeFiltered;
    return scopeFiltered.filter((e) => {
      if (!e.contactDate) return false;
      return new Date(e.contactDate) >= start;
    });
  }, [entries, scopedTag, range]);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <TrendingUp className="w-10 h-10 mx-auto text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          No data yet
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Add some entries in the Editor tab and analytics will appear here.
        </p>
      </div>
    );
  }

  const layout: ChartLayout = chartLayout ?? {};

  const renderChart = (slot: ChartSlot) => {
    const def = chartForSlot(layout, slot);
    const Component = def.Component;
    return (
      <ChartCard
        title={def.name}
        canChange={!!onChangeSlot}
        onChange={() => setOpenSlot(slot)}
      >
        <Component entries={filteredEntries} />
      </ChartCard>
    );
  };

  const renderKpi = (slot: KpiSlot) => {
    const def = kpiForSlot(layout as Record<string, string | undefined>, slot);
    return (
      <KpiSwappable
        canChange={!!onChangeSlot}
        onChange={() => setOpenSlot(slot)}
      >
        <KpiTile definition={def} entries={filteredEntries} />
      </KpiSwappable>
    );
  };

  return (
    <div className="space-y-6">
      {/* Range + scope controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {scopedTag && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue/10 ring-1 ring-maxxed-blue/30 px-3 py-1.5 text-xs font-semibold text-maxxed-blue">
            <span>Showing only: {scopedTag}</span>
            {onClearScope && (
              <button
                type="button"
                onClick={onClearScope}
                className="hover:text-maxxed-blue/70 underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
        <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 ml-auto">
          <span className="px-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            Range
          </span>
          {(
            [
              ['all', 'All time'],
              ['this-month', 'This month'],
              ['last-30', 'Last 30 days'],
              ['last-90', 'Last 90 days'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setRange(v)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                range === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles — 4 swappable slots. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ALL_KPI_SLOTS.map((s) => (
          <div key={s}>{renderKpi(s)}</div>
        ))}
      </div>

      {/* Status + Funnel — pair on lg, stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderChart('status')}
        {renderChart('funnel')}
      </div>

      {/* Three trend slots — full width each */}
      {renderChart('trend1')}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderChart('trend2')}
        {renderChart('trend3')}
      </div>

      {/* Ranking slot */}
      {renderChart('ranking')}

      {openSlot && onChangeSlot && (
        <ChartDrawer
          slot={openSlot}
          currentId={layout[openSlot] ?? DEFAULT_SLOTS[openSlot]}
          entries={filteredEntries}
          onPick={(id) => {
            onChangeSlot(openSlot, id);
            setOpenSlot(null);
          }}
          onClose={() => setOpenSlot(null)}
          onResetAll={() => {
            onResetAllCharts?.();
            setOpenSlot(null);
          }}
        />
      )}
    </div>
  );
}

function ChartCard({
  title,
  canChange,
  onChange,
  children,
}: {
  title: string;
  canChange: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="text-sm font-bold text-gray-900 truncate">{title}</h3>
        {canChange && (
          <button
            type="button"
            onClick={onChange}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shrink-0"
            title="Change which chart is shown here"
          >
            <Settings2 className="w-3 h-3" />
            Change
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Wrap a KPI tile with a "Change" affordance pinned to the bottom-right.
 * Always visible (no hover gating) so Rebecca can see at a glance
 * that the tile is swappable. Only renders when a change handler is
 * wired in (so non-admin contexts get a static tile).
 */
function KpiSwappable({
  canChange,
  onChange,
  children,
}: {
  canChange: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {canChange && (
        <button
          type="button"
          onClick={onChange}
          className="absolute bottom-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          aria-label="Change this KPI"
          title="Change this stat"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

void ALL_CHART_SLOTS;
