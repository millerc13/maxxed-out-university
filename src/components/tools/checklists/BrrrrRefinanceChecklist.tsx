'use client';

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SECTIONS = {
  propertyReadiness: {
    title: 'Property Readiness',
    items: [
      'All renovations complete',
      'Property cleaned/staged',
      'Permits closed',
      'Certificate of Occupancy obtained',
      'Before/after photos taken',
      'Receipts organized',
    ],
  },
  tenantStatus: {
    title: 'Tenant Status',
    items: [
      'Qualified tenant in place',
      'Lease signed (12+ months)',
      'First month rent collected',
      'Security deposit collected',
    ],
  },
  documentation: {
    title: 'Documentation',
    items: [
      '2 years tax returns',
      '6 months bank statements',
      'Rent roll',
      'Insurance declaration page',
      'Purchase closing documents',
      'Renovation receipts',
      'Current lease agreement',
      'Property photos',
      'Appraisal comparable data',
      'Entity documents (if applicable)',
    ],
  },
  refinanceChecklist: {
    title: 'Refinance Checklist',
    items: [
      'After Repair Value determined',
      'Target LTV selected',
      'New loan amount calculated',
      'Current debt verified',
      'Cash out amount confirmed',
      'Monthly payment estimated',
    ],
  },
};

type SectionKey = keyof typeof SECTIONS;

const LENDER_TABLE_ROWS = [
  'LTV Offered',
  'Interest Rate',
  'Term',
  'Closing Costs',
  'Seasoning Required',
  'Prepayment Penalty',
];

const REFINANCE_FIELDS = [
  { key: 'arv', label: 'After Repair Value', prefix: '$' },
  { key: 'targetLtv', label: 'Target LTV', suffix: '%' },
  { key: 'newLoanAmount', label: 'New Loan Amount', prefix: '$' },
  { key: 'currentDebt', label: 'Current Debt', prefix: '$' },
  { key: 'cashOut', label: 'Cash Out', prefix: '$' },
  { key: 'monthlyPayment', label: 'Monthly Payment', prefix: '$' },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const BrrrrRefinanceChecklist = forwardRef<ToolHandle>(function BrrrrRefinanceChecklist(_props, ref) {
  // Checked state keyed by "section.index"
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Lender comparison table: rows x 3 lenders
  const [lenderTable, setLenderTable] = useState<string[][]>(
    LENDER_TABLE_ROWS.map(() => ['', '', ''])
  );

  // Refinance numbers
  const [refinanceNumbers, setRefinanceNumbers] = useState<Record<string, string>>({
    arv: '',
    targetLtv: '',
    newLoanAmount: '',
    currentDebt: '',
    cashOut: '',
    monthlyPayment: '',
  });

  const toggle = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const totalItems = Object.values(SECTIONS).reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const resetAll = () => {
    setChecked({});
    setLenderTable(LENDER_TABLE_ROWS.map(() => ['', '', '']));
    setRefinanceNumbers({ arv: '', targetLtv: '', newLoanAmount: '', currentDebt: '', cashOut: '', monthlyPayment: '' });
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'BRRRR Refinance Checklist',
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
          heading: 'Lender Comparison',
          table: {
            headers: ['Factor', 'Lender 1', 'Lender 2', 'Lender 3'],
            rows: LENDER_TABLE_ROWS.map((row, i) => [row, ...lenderTable[i]]),
          },
        },
        {
          heading: 'Refinance Numbers',
          rows: REFINANCE_FIELDS.map((f) => ({
            label: f.label,
            value: refinanceNumbers[f.key] || '-',
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
                  <label
                    key={id}
                    className="flex items-center gap-3 cursor-pointer group py-1"
                  >
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

      {/* Lender Comparison Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Lender Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-semibold text-gray-600 w-1/4">Factor</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Lender 1</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Lender 2</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Lender 3</th>
              </tr>
            </thead>
            <tbody>
              {LENDER_TABLE_ROWS.map((row, ri) => (
                <tr key={row} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-700 font-medium">{row}</td>
                  {[0, 1, 2].map((ci) => (
                    <td key={ci} className="py-1.5 px-1">
                      <input
                        type="text"
                        value={lenderTable[ri][ci]}
                        onChange={(e) => {
                          const next = lenderTable.map((r) => [...r]);
                          next[ri][ci] = e.target.value;
                          setLenderTable(next);
                        }}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refinance Numbers */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Refinance Numbers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REFINANCE_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 font-medium">{f.label}</span>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                {'prefix' in f && f.prefix && (
                  <span className="pl-3 text-gray-400 select-none">{f.prefix}</span>
                )}
                <input
                  type="number"
                  value={refinanceNumbers[f.key]}
                  onChange={(e) =>
                    setRefinanceNumbers((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  className="w-full bg-transparent py-2 px-2 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="0"
                />
                {'suffix' in f && f.suffix && (
                  <span className="pr-3 text-gray-400 select-none">{f.suffix}</span>
                )}
              </div>
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

export default BrrrrRefinanceChecklist;
