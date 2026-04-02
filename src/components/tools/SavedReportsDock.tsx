'use client';

import { FileText, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatPercent } from '@/lib/calc-utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DockReport {
  id: string;
  name: string;
  toolSlug: string;
  results: Record<string, any>;
  updatedAt: string;
}

interface ToolMeta {
  slug: string;
  title: string;
  icon: string | null;
}

interface SavedReportsDockProps {
  reports: DockReport[];
  tools: ToolMeta[];
  totalLimit: number;
}

/* ------------------------------------------------------------------ */
/*  Metric formatting per tool                                         */
/* ------------------------------------------------------------------ */

const METRIC_DISPLAY: Record<string, { key: string; label: string; format: (v: any) => string }[]> = {
  'multi-family-calculator': [
    { key: 'noi', label: 'NOI', format: (v) => formatCurrency(v) },
    { key: 'capRate', label: 'Cap Rate', format: (v) => formatPercent(v) },
  ],
  'cap-rate-underwriter': [
    { key: 'currentCapRate', label: 'Current', format: (v) => formatPercent(v) },
    { key: 'askingCapRate', label: 'Asking', format: (v) => formatPercent(v) },
  ],
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SavedReportsDock({ reports, tools, totalLimit }: SavedReportsDockProps) {
  if (reports.length === 0) return null;

  // Build tool title lookup
  const toolTitleMap = new Map(tools.map((t) => [t.slug, t.title]));

  // Group reports by toolSlug
  const grouped = new Map<string, DockReport[]>();
  for (const report of reports) {
    const list = grouped.get(report.toolSlug) || [];
    list.push(report);
    grouped.set(report.toolSlug, list);
  }

  // Sort groups by tool title
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const titleA = toolTitleMap.get(a[0]) || a[0];
    const titleB = toolTitleMap.get(b[0]) || b[0];
    return titleA.localeCompare(titleB);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-[#0000CC]/8 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-[#0000CC]" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Saved Reports</h3>
        </div>
        {/* Capacity indicator */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                reports.length >= totalLimit
                  ? 'bg-red-400'
                  : reports.length >= totalLimit * 0.7
                    ? 'bg-amber-400'
                    : 'bg-[#0000CC]'
              }`}
              style={{ width: `${(reports.length / totalLimit) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-gray-400 tabular-nums whitespace-nowrap">
            {reports.length}/{totalLimit}
          </span>
        </div>
      </div>

      {/* Tool groups */}
      <div className="pb-2">
        {sortedGroups.map(([toolSlug, toolReports]) => {
          const toolTitle = toolTitleMap.get(toolSlug) || toolSlug;
          const metrics = METRIC_DISPLAY[toolSlug] || [];

          return (
            <div key={toolSlug}>
              {/* Tool group label */}
              <div className="px-5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                  {toolTitle}
                </p>
              </div>

              {/* Reports in this group */}
              <div>
                {toolReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/tools/${toolSlug}`}
                    className="group flex items-start gap-3 px-5 py-3 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-800 truncate group-hover:text-[#0000CC] transition-colors">
                        {report.name}
                      </p>
                      {/* Metrics row */}
                      {metrics.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          {metrics.map((m) => {
                            const val = report.results?.[m.key];
                            if (val === undefined || val === null) return null;
                            return (
                              <span
                                key={m.key}
                                className="text-[10px] text-gray-400"
                              >
                                <span className="text-gray-300">{m.label}</span>{' '}
                                <span className="font-medium text-gray-500 tabular-nums">{m.format(val)}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {/* Date */}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5 text-gray-300" />
                        <span className="text-[10px] text-gray-300">
                          {formatRelativeDate(report.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-[#0000CC] mt-1 shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
