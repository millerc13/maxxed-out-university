'use client';

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SECTIONS = {
  preClosing: {
    title: 'Pre-Closing Preparation',
    items: [
      'Title company confirmed (handles double closes)',
      'A-B contract fully executed',
      'B-C contract fully executed',
      'Proof of funds for A-B ready',
      'EMD deposited for both transactions',
      'Title search clear',
      'All contingencies met',
    ],
  },
  transactionAB: {
    title: 'Day-of Closing - Transaction A-B',
    items: [
      'Review HUD/Settlement statement',
      'Verify purchase price matches contract',
      'Confirm wire/funds sent',
      'Sign all closing docs',
      'Receive deed',
      'Title transfers to you',
    ],
  },
  transactionBC: {
    title: 'Day-of Closing - Transaction B-C',
    items: [
      'Review HUD/Settlement statement',
      'Verify sale price matches contract',
      "Buyer's funds received",
      'Sign all closing docs',
      'Deed transfers to buyer',
      'Your funds disbursed',
    ],
  },
  postClosing: {
    title: 'Post-Closing',
    items: [
      'Copies of all documents obtained',
      'Funds received and verified',
      'Tax records updated',
      'All parties notified',
    ],
  },
};

type SectionKey = keyof typeof SECTIONS;

const TRANSACTION_SUMMARY_ROWS = [
  'A-B Purchase Price',
  'B-C Sale Price',
  'Closing Costs A-B',
  'Closing Costs B-C',
  'Assignment/Spread',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DoubleClosingChecklist = forwardRef<ToolHandle>(function DoubleClosingChecklist(_props, ref) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [summaryTable, setSummaryTable] = useState<Record<string, string>>(
    Object.fromEntries(TRANSACTION_SUMMARY_ROWS.map((r) => [r, '']))
  );

  const toggle = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const totalItems = Object.values(SECTIONS).reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const resetAll = () => {
    setChecked({});
    setSummaryTable(Object.fromEntries(TRANSACTION_SUMMARY_ROWS.map((r) => [r, ''])));
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Double Closing Checklist',
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
          heading: 'Transaction Summary',
          table: {
            headers: ['Detail', 'Amount'],
            rows: TRANSACTION_SUMMARY_ROWS.map((row) => [
              row,
              summaryTable[row] ? `$${summaryTable[row]}` : '-',
            ]),
          },
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
          className="h-10 w-auto"
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

      {/* Transaction Summary */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Transaction Summary
        </h3>
        <div className="space-y-3">
          {TRANSACTION_SUMMARY_ROWS.map((row) => (
            <label key={row} className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 font-medium">{row}</span>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                <span className="pl-3 text-gray-400 select-none">$</span>
                <input
                  type="number"
                  value={summaryTable[row]}
                  onChange={(e) =>
                    setSummaryTable((prev) => ({ ...prev, [row]: e.target.value }))
                  }
                  className="w-full bg-transparent py-2 px-2 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </label>
          ))}
        </div>

        {/* Computed spread */}
        {(() => {
          const abPrice = parseFloat(summaryTable['A-B Purchase Price']) || 0;
          const bcPrice = parseFloat(summaryTable['B-C Sale Price']) || 0;
          const abCosts = parseFloat(summaryTable['Closing Costs A-B']) || 0;
          const bcCosts = parseFloat(summaryTable['Closing Costs B-C']) || 0;
          const spread = bcPrice - abPrice - abCosts - bcCosts;
          if (abPrice > 0 || bcPrice > 0) {
            return (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Net Profit</span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    spread >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  ${spread.toLocaleString()}
                </span>
              </div>
            );
          }
          return null;
        })()}
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

export default DoubleClosingChecklist;
