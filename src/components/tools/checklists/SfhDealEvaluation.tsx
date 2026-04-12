'use client';

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SECTIONS = {
  propertyAssessment: {
    title: 'Property Assessment',
    items: [
      'Location verified (drive-by)',
      'Comparable sales researched (3+)',
      'Neighborhood assessed',
      'School district checked',
      'Crime stats reviewed',
      'Flood zone checked',
      'HOA restrictions checked',
    ],
  },
  financialCheck: {
    title: 'Financial Quick Check',
    items: [
      'ARV determined',
      'Repair estimate obtained',
      '70% rule check (Offer <= ARV x 0.7 - Repairs)',
      'Comparable rents researched',
      'Target cap rate meets minimum',
      'Insurance quote obtained',
    ],
  },
  dealBreakers: {
    title: 'Deal Breakers',
    items: [
      'Foundation issues checked',
      'Environmental concerns checked',
      'Title issues checked',
      'Zoning confirmed',
      'Major structural assessed',
      'Permit history reviewed',
    ],
  },
};

type SectionKey = keyof typeof SECTIONS;

const SCORING_FACTORS = [
  'Location',
  'Condition',
  'Price',
  'Upside Potential',
  'Risk Level',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const SfhDealEvaluation = forwardRef<ToolHandle>(function SfhDealEvaluation(_props, ref) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [scoringTable, setScoringTable] = useState(
    SCORING_FACTORS.map((factor) => ({ factor, score: '', notes: '' }))
  );

  const toggle = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const totalItems = Object.values(SECTIONS).reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const avgScore = (() => {
    const scores = scoringTable.map((r) => parseFloat(r.score)).filter((s) => !isNaN(s) && s > 0);
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
  })();

  const resetAll = () => {
    setChecked({});
    setScoringTable(SCORING_FACTORS.map((factor) => ({ factor, score: '', notes: '' })));
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'SFH Deal Evaluation Checklist',
      type: 'checklist',
      sections: [
        ...Object.entries(SECTIONS).map(([key, section]) => ({
          heading: section.title,
          checkItems: section.items.map((item, i) => ({
            label: item,
            checked: !!checked[`${key}.${i}`],
          })),
        })),
        {
          heading: 'Property Scoring',
          table: {
            headers: ['Factor', 'Score (1-5)', 'Notes'],
            rows: scoringTable.map((r) => [r.factor, r.score || '-', r.notes || '-']),
          },
        },
        {
          heading: 'Overall Score',
          rows: [{ label: 'Average Score', value: String(avgScore) }],
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
            Progress: {checkedCount} of {totalItems} complete
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

      {/* Checklist Sections */}
      {(Object.entries(SECTIONS) as [SectionKey, (typeof SECTIONS)[SectionKey]][]).map(
        ([key, section]) => (
          <div key={key} className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const id = `${key}.${i}`;
                return (
                  <label key={id} className="flex items-center gap-3 cursor-pointer group py-1">
                    <input
                      type="checkbox"
                      checked={!!checked[id]}
                      onChange={() => toggle(id)}
                      className="w-4.5 h-4.5 rounded border-gray-300 text-[#0000CC] focus:ring-[#0000CC]/30 cursor-pointer"
                    />
                    <span
                      className={`text-sm transition-colors ${
                        checked[id] ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'
                      }`}
                    >
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Property Scoring */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Property Scoring
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-semibold text-gray-600 w-1/4">Factor</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-24">Score (1-5)</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {scoringTable.map((row, ri) => (
                <tr key={row.factor} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-700 font-medium">{row.factor}</td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={row.score}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = parseInt(val);
                        if (val === '' || (num >= 1 && num <= 5)) {
                          const next = [...scoringTable];
                          next[ri] = { ...next[ri], score: val };
                          setScoringTable(next);
                        }
                      }}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="1-5"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => {
                        const next = [...scoringTable];
                        next[ri] = { ...next[ri], notes: e.target.value };
                        setScoringTable(next);
                      }}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
                      placeholder="Add notes..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Average Score */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Average Score</span>
          <span
            className={`text-lg font-bold tabular-nums ${
              avgScore === '-'
                ? 'text-gray-400'
                : parseFloat(avgScore) >= 4
                  ? 'text-emerald-600'
                  : parseFloat(avgScore) >= 3
                    ? 'text-amber-600'
                    : 'text-red-600'
            }`}
          >
            {avgScore} / 5
          </span>
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

export default SfhDealEvaluation;
