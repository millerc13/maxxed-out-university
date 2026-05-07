'use client';

import { useEffect } from 'react';
import {
  X,
  RefreshCw,
  RotateCcw,
  Check,
  TrendingUp,
  BarChart3,
  Tag,
  Trophy,
  Filter,
  Wallet,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import {
  CHART_REGISTRY,
  CATEGORY_LABEL,
  type ChartCategory,
} from './charts';
import { SLOT_LABEL, isKpiSlot, type Slot } from './chart-config';
import { KPI_LIBRARY, KpiTile } from './kpis';
import type { EntryRow } from './types';

const CATEGORY_ICON: Record<ChartCategory, LucideIcon> = {
  trends: TrendingUp,
  distributions: BarChart3,
  sections: Tag,
  rankings: Trophy,
  funnel: Filter,
  status: Wallet,
  calendar: CalendarDays,
};

interface Props {
  slot: Slot;
  currentId: string;
  entries: EntryRow[];
  onPick: (id: string | null) => void;
  onClose: () => void;
  onResetAll: () => void;
}

const CATEGORY_ORDER: ChartCategory[] = [
  'trends',
  'distributions',
  'sections',
  'rankings',
  'funnel',
  'status',
  'calendar',
];

/**
 * Picker modal for both chart slots and KPI slots. Renders live
 * miniature previews of every option using the actual session data,
 * so Rebecca picks based on what the chart looks like with HER
 * numbers — not just an icon + label.
 *
 * Mobile: full-screen sheet. Desktop: large centered modal with a
 * 2-column preview grid so chart thumbnails get enough room.
 */
export function ChartDrawer({
  slot,
  currentId,
  entries,
  onPick,
  onClose,
  onResetAll,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll while open so the page underneath doesn't scroll
  // when Rebecca scrolls the long preview list.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isKpi = isKpiSlot(slot);
  const slotLabel = SLOT_LABEL[slot];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="fixed z-50 bg-gray-50 shadow-2xl flex flex-col
                   inset-0 md:inset-6 lg:inset-10
                   md:rounded-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b border-gray-200 bg-white shrink-0">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
              {isKpi ? 'Change stat tile' : 'Change chart'}
            </div>
            <div className="text-[11px] sm:text-xs text-gray-500 leading-tight mt-0.5 truncate">
              <span className="font-semibold text-gray-700">{slotLabel}</span>
              <span className="mx-1 text-gray-300">·</span>
              {isKpi
                ? `${KPI_LIBRARY.length} options`
                : `${CHART_REGISTRY.length} options`}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onPick(null)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition whitespace-nowrap"
              title="Use the default for this slot"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Use default</span>
              <span className="sm:hidden">Default</span>
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition whitespace-nowrap"
              title="Reset every slot back to default"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              Reset all
            </button>
            <button
              type="button"
              onClick={onResetAll}
              aria-label="Reset all slots"
              title="Reset all slots back to default"
              className="sm:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-0.5 p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isKpi ? (
            <KpiOptions
              entries={entries}
              currentId={currentId}
              onPick={onPick}
            />
          ) : (
            <ChartOptions
              entries={entries}
              currentId={currentId}
              onPick={onPick}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// KPI options — render live tiles in a grid
// ---------------------------------------------------------------------
function KpiOptions({
  entries,
  currentId,
  onPick,
}: {
  entries: EntryRow[];
  currentId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {KPI_LIBRARY.map((def) => {
        const active = def.id === currentId;
        return (
          <button
            key={def.id}
            type="button"
            onClick={() => onPick(def.id)}
            className={`group relative text-left rounded-xl bg-white p-1 transition ring-1 hover:shadow-md hover:-translate-y-0.5 ${
              active
                ? 'ring-2 ring-maxxed-blue shadow-md'
                : 'ring-gray-200'
            }`}
          >
            {active && (
              <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-maxxed-blue text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <Check className="w-3 h-3" />
                In use
              </span>
            )}
            <div className="rounded-lg overflow-hidden">
              <KpiTile definition={def} entries={entries} />
            </div>
            <div className="px-2 pt-2 pb-1.5">
              <div className="font-semibold text-sm text-gray-900">
                {def.pickerName}
              </div>
              <div className="text-xs text-gray-500">{def.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// Chart options — render live mini chart previews grouped by category
// ---------------------------------------------------------------------
function ChartOptions({
  entries,
  currentId,
  onPick,
}: {
  entries: EntryRow[];
  currentId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-7">
      {CATEGORY_ORDER.map((cat) => {
        const charts = CHART_REGISTRY.filter((c) => c.category === cat);
        if (charts.length === 0) return null;
        const Icon = CATEGORY_ICON[cat];
        return (
          <section key={cat}>
            <h3 className="flex items-center gap-2 px-1 mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <Icon className="w-3.5 h-3.5" />
              {CATEGORY_LABEL[cat]}
              <span className="font-normal text-gray-400 normal-case tracking-normal">
                ({charts.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {charts.map((c) => {
                const active = c.id === currentId;
                const Component = c.Component;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPick(c.id)}
                    className={`group relative text-left rounded-xl bg-white transition ring-1 hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
                      active
                        ? 'ring-2 ring-maxxed-blue shadow-md'
                        : 'ring-gray-200'
                    }`}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-maxxed-blue text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        <Check className="w-3 h-3" />
                        In use
                      </span>
                    )}
                    {/* Live preview. Wrap in a div that's smaller than the
                        chart's natural h-72 so Recharts ResponsiveContainer
                        scales down. Pointer events disabled so tooltips
                        don't eat the parent click. */}
                    <div className="h-44 px-3 pt-3 pointer-events-none">
                      <div className="h-full overflow-hidden">
                        <ChartPreview>
                          <Component entries={entries} />
                        </ChartPreview>
                      </div>
                    </div>
                    <div className="px-3 pt-2 pb-3 border-t border-gray-100 mt-2">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {c.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Wrapper that overrides the chart's natural h-72 to fit a smaller
 * preview container. Charts use `min-w-0 h-72` internally; we apply a
 * scale so they render as if they were full-size but visually shrink.
 */
function ChartPreview({ children }: { children: React.ReactNode }) {
  // The chart components render into containers like `min-w-0 h-72` or
  // `min-w-0 min-h-[18rem]`. The plain CSS class below collapses all
  // of those down to the preview tile's height so Recharts shrinks.
  return <div className="chart-preview-shrink h-full">{children}</div>;
}
