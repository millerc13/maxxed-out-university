'use client';

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SECTIONS = {
  credentials: {
    title: 'Before Signing - Verify Credentials',
    items: [
      'Valid license verified',
      'Insurance certificate obtained (general liability + workers comp)',
      'References checked (3+)',
      'BBB/online reviews checked',
      'Previous work photos reviewed',
    ],
  },
  contractMustInclude: {
    title: 'Contract Must Include',
    items: [
      'Legal business name + license number',
      'Detailed scope of work',
      'Specific materials listed',
      'Total contract price',
      'Payment schedule with milestones',
      'Start + completion date',
      'Change order process',
      'Warranty terms',
      'Lien waiver requirement',
      'Dispute resolution clause',
      'Termination clause',
    ],
  },
};

type SectionKey = keyof typeof SECTIONS;

const CREDENTIAL_ROWS = [
  'License Number',
  'Insurance Policy',
  'Insurance Expiry',
  'Bond Number',
  'References',
];

const PAYMENT_MILESTONES = [
  { milestone: 'Signing', defaultPct: '10' },
  { milestone: 'Demo Complete', defaultPct: '15' },
  { milestone: 'Rough-in Complete', defaultPct: '20' },
  { milestone: 'Drywall Complete', defaultPct: '15' },
  { milestone: 'Fixtures Installed', defaultPct: '15' },
  { milestone: 'Final Walkthrough', defaultPct: '15' },
  { milestone: '30-Day Holdback', defaultPct: '10' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ContractorAgreementChecklist = forwardRef<ToolHandle>(function ContractorAgreementChecklist(_props, ref) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [credentialTable, setCredentialTable] = useState(
    CREDENTIAL_ROWS.map((item) => ({ item, verified: false, details: '' }))
  );

  const [paymentTable, setPaymentTable] = useState(
    PAYMENT_MILESTONES.map((m) => ({ milestone: m.milestone, percentage: m.defaultPct, amount: '' }))
  );

  const toggle = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const totalItems = Object.values(SECTIONS).reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const resetAll = () => {
    setChecked({});
    setCredentialTable(CREDENTIAL_ROWS.map((item) => ({ item, verified: false, details: '' })));
    setPaymentTable(PAYMENT_MILESTONES.map((m) => ({ milestone: m.milestone, percentage: m.defaultPct, amount: '' })));
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Contractor Agreement Checklist',
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
          heading: 'Credential Verification',
          table: {
            headers: ['Item', 'Verified', 'Details'],
            rows: credentialTable.map((r) => [r.item, r.verified ? 'Yes' : 'No', r.details || '-']),
          },
        },
        {
          heading: 'Payment Schedule',
          table: {
            headers: ['Milestone', 'Percentage', 'Amount ($)'],
            rows: paymentTable.map((r) => [r.milestone, `${r.percentage}%`, r.amount ? `$${r.amount}` : '-']),
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

      {/* Credential Verification */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Credential Verification
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-semibold text-gray-600 w-1/4">Item</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600 w-20">Verified</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {credentialTable.map((row, ri) => (
                <tr key={row.item} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-700 font-medium">{row.item}</td>
                  <td className="py-1.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.verified}
                      onChange={() => {
                        const next = [...credentialTable];
                        next[ri] = { ...next[ri], verified: !next[ri].verified };
                        setCredentialTable(next);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-[#0000CC] focus:ring-[#0000CC]/30 cursor-pointer"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.details}
                      onChange={(e) => {
                        const next = [...credentialTable];
                        next[ri] = { ...next[ri], details: e.target.value };
                        setCredentialTable(next);
                      }}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
                      placeholder="Enter details..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Payment Schedule
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 font-semibold text-gray-600 w-2/5">Milestone</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/5">Percentage</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-2/5">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              {paymentTable.map((row, ri) => (
                <tr key={row.milestone} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-700 font-medium">{row.milestone}</td>
                  <td className="py-1.5 px-1">
                    <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                      <input
                        type="number"
                        value={row.percentage}
                        onChange={(e) => {
                          const next = [...paymentTable];
                          next[ri] = { ...next[ri], percentage: e.target.value };
                          setPaymentTable(next);
                        }}
                        className="w-full bg-transparent py-1.5 pl-2.5 pr-1 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="pr-2 text-gray-400 select-none text-xs">%</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-1">
                    <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                      <span className="pl-2.5 text-gray-400 select-none text-xs">$</span>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => {
                          const next = [...paymentTable];
                          next[ri] = { ...next[ri], amount: e.target.value };
                          setPaymentTable(next);
                        }}
                        className="w-full bg-transparent py-1.5 px-1 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="py-2 pr-3 text-gray-900 font-bold">Total</td>
                <td className="py-2 px-1 text-gray-900 font-bold tabular-nums">
                  {paymentTable.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0)}%
                </td>
                <td className="py-2 px-1 text-gray-900 font-bold tabular-nums">
                  ${paymentTable.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
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

export default ContractorAgreementChecklist;
