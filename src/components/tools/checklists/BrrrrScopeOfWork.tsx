'use client';

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const BRRRR_FIELDS = [
  { key: 'purchasePrice', label: 'Purchase Price', prefix: '$' },
  { key: 'rehabBudget', label: 'Rehab Budget', prefix: '$' },
  { key: 'allInCost', label: 'All-In Cost', prefix: '$' },
  { key: 'arv', label: 'ARV', prefix: '$' },
  { key: 'arvTarget', label: 'ARV x 0.75 (Target)', prefix: '$', computed: true },
  { key: 'monthlyRent', label: 'Monthly Rent', prefix: '$' },
  { key: 'annualNoi', label: 'Annual NOI', prefix: '$' },
  { key: 'marketCapRate', label: 'Market Cap Rate', suffix: '%' },
] as const;

const RENOVATION_CATEGORIES = [
  'Kitchen', 'Bathroom', 'Flooring', 'Paint', 'Electrical',
  'Plumbing', 'HVAC', 'Roof', 'Windows', 'Landscaping', 'Permits', 'Other',
];

const TIMELINE_PHASES = [
  'Demo', 'Rough-in', 'Drywall', 'Flooring', 'Kitchen',
  'Bathroom', 'Paint', 'Fixtures', 'Landscaping', 'Final Inspection', 'Staging',
];

const REFI_ITEMS = [
  'All renovations complete',
  'Property rented',
  'Lease signed',
  'First month collected',
  'Seasoning period met',
  'Appraisal scheduled',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const BrrrrScopeOfWork = forwardRef<ToolHandle>(function BrrrrScopeOfWork(_props, ref) {
  const [numbers, setNumbers] = useState<Record<string, string>>({
    purchasePrice: '', rehabBudget: '', allInCost: '', arv: '',
    monthlyRent: '', annualNoi: '', marketCapRate: '',
  });

  const [scopeTable, setScopeTable] = useState(
    RENOVATION_CATEGORIES.map((cat) => ({ category: cat, items: '', budget: '' }))
  );

  const [timelineTable, setTimelineTable] = useState(
    TIMELINE_PHASES.map((phase) => ({ phase, duration: '', startDate: '', endDate: '' }))
  );

  const [refiChecked, setRefiChecked] = useState<Record<number, boolean>>({});

  const arvTarget = numbers.arv ? (parseFloat(numbers.arv) * 0.75).toFixed(0) : '';

  const refiTotal = REFI_ITEMS.length;
  const refiDone = Object.values(refiChecked).filter(Boolean).length;
  const totalItems = refiTotal;
  const pct = totalItems > 0 ? Math.round((refiDone / totalItems) * 100) : 0;

  const resetAll = () => {
    setNumbers({ purchasePrice: '', rehabBudget: '', allInCost: '', arv: '', monthlyRent: '', annualNoi: '', marketCapRate: '' });
    setScopeTable(RENOVATION_CATEGORIES.map((cat) => ({ category: cat, items: '', budget: '' })));
    setTimelineTable(TIMELINE_PHASES.map((phase) => ({ phase, duration: '', startDate: '', endDate: '' })));
    setRefiChecked({});
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'BRRRR Scope of Work',
      type: 'checklist',
      sections: [
        {
          heading: 'BRRRR Numbers Overview',
          rows: BRRRR_FIELDS.map((f) => ({
            label: f.label,
            value: f.key === 'arvTarget' ? (arvTarget || '-') : (numbers[f.key] || '-'),
          })),
        },
        {
          heading: 'Renovation Scope',
          table: {
            headers: ['Category', 'Items Needed', 'Budget ($)'],
            rows: scopeTable.map((r) => [r.category, r.items || '-', r.budget ? `$${r.budget}` : '-']),
          },
        },
        {
          heading: 'Project Timeline',
          table: {
            headers: ['Phase', 'Duration', 'Start Date', 'End Date'],
            rows: timelineTable.map((r) => [r.phase, r.duration || '-', r.startDate || '-', r.endDate || '-']),
          },
        },
        {
          heading: 'Refinance Checklist',
          checkItems: REFI_ITEMS.map((item, i) => ({
            label: item,
            checked: !!refiChecked[i],
          })),
        },
      ],
    }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Image
          src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
          alt="Maxxed Out"
          width={120}
          height={47}
          className="h-10 w-auto hidden sm:block"
        />
      </div>
      {/* Progress */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Refinance Checklist: {refiDone} of {refiTotal} complete
          </span>
          <span className="text-sm font-bold text-[#0000CC]">{pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0000CC] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* BRRRR Numbers Overview */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          BRRRR Numbers Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BRRRR_FIELDS.map((f) => {
            if (f.key === 'arvTarget') {
              return (
                <div key={f.key} className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600 font-medium">{f.label}</span>
                  <div className="flex items-center rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-700 font-medium">
                    ${arvTarget || '0'}
                  </div>
                </div>
              );
            }
            return (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 font-medium">{f.label}</span>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                  {'prefix' in f && f.prefix && (
                    <span className="pl-3 text-gray-400 select-none">{f.prefix}</span>
                  )}
                  <input
                    type="number"
                    value={numbers[f.key] || ''}
                    onChange={(e) => setNumbers((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-transparent py-2 px-2 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  {'suffix' in f && f.suffix && (
                    <span className="pr-3 text-gray-400 select-none">{f.suffix}</span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Renovation Scope */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Renovation Scope
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-semibold text-gray-600 w-1/4">Category</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Items Needed</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/5">Budget ($)</th>
              </tr>
            </thead>
            <tbody>
              {scopeTable.map((row, ri) => (
                <tr key={row.category} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-700 font-medium">{row.category}</td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.items}
                      onChange={(e) => {
                        const next = [...scopeTable];
                        next[ri] = { ...next[ri], items: e.target.value };
                        setScopeTable(next);
                      }}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
                      placeholder="Describe items..."
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      value={row.budget}
                      onChange={(e) => {
                        const next = [...scopeTable];
                        next[ri] = { ...next[ri], budget: e.target.value };
                        setScopeTable(next);
                      }}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="py-2 pr-3 text-gray-900 font-bold" colSpan={2}>Total Budget</td>
                <td className="py-2 px-1 text-gray-900 font-bold tabular-nums">
                  ${scopeTable.reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Project Timeline */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Project Timeline
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-semibold text-gray-600 w-1/4">Phase</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Duration</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Start Date</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">End Date</th>
              </tr>
            </thead>
            <tbody>
              {timelineTable.map((row, ri) => (
                <tr key={row.phase} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-700 font-medium">{row.phase}</td>
                  {(['duration', 'startDate', 'endDate'] as const).map((col) => (
                    <td key={col} className="py-1.5 px-1">
                      <input
                        type={col === 'duration' ? 'text' : 'date'}
                        value={row[col]}
                        onChange={(e) => {
                          const next = [...timelineTable];
                          next[ri] = { ...next[ri], [col]: e.target.value };
                          setTimelineTable(next);
                        }}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
                        placeholder={col === 'duration' ? 'e.g. 2 weeks' : ''}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refinance Checklist */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Refinance Checklist
        </h3>
        <div className="space-y-2">
          {REFI_ITEMS.map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group py-1">
              <input
                type="checkbox"
                checked={!!refiChecked[i]}
                onChange={() => setRefiChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="w-4.5 h-4.5 rounded border-gray-300 text-[#0000CC] focus:ring-[#0000CC]/30 cursor-pointer"
              />
              <span
                className={`text-sm transition-colors ${
                  refiChecked[i] ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'
                }`}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={resetAll}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Reset All
        </button>
      </div>
    </div>
  );
});

export default BrrrrScopeOfWork;
