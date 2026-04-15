'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

interface Criterion {
  id: string;
  label: string;
  requirement: string;
  checked: boolean;
}

interface Section {
  heading: string;
  blurb: string;
  items: Criterion[];
}

const SEED: Section[] = [
  {
    heading: 'Income',
    blurb: 'Verify the tenant can comfortably cover rent each month.',
    items: [
      { id: 'income-multiple', label: 'Gross monthly income ≥ 3× rent', requirement: '3x rent', checked: true },
      { id: 'income-proof', label: 'Two most recent pay stubs or 2 months of bank statements', requirement: '2 months', checked: true },
      { id: 'income-self', label: 'Self-employed: last 2 years of tax returns', requirement: '2 years', checked: false },
    ],
  },
  {
    heading: 'Credit',
    blurb: 'Credit history reveals financial reliability.',
    items: [
      { id: 'credit-min', label: 'Minimum credit score', requirement: '620', checked: true },
      { id: 'credit-bk', label: 'No bankruptcies within', requirement: '5 years', checked: true },
      { id: 'credit-collections', label: 'No unpaid collections over', requirement: '$500', checked: false },
    ],
  },
  {
    heading: 'Employment',
    blurb: 'Stable employment predicts on-time rent.',
    items: [
      { id: 'emp-tenure', label: 'Current job tenure', requirement: '6+ months', checked: true },
      { id: 'emp-verify', label: 'Employer verification (call or letter)', requirement: 'Required', checked: true },
    ],
  },
  {
    heading: 'Rental History',
    blurb: 'Past behavior is the best predictor of future behavior.',
    items: [
      { id: 'rent-years', label: 'Verifiable rental history', requirement: '2+ years', checked: true },
      { id: 'rent-evictions', label: 'No evictions within', requirement: '7 years', checked: true },
      { id: 'rent-late', label: 'No more than X late payments in past 12 months', requirement: '1', checked: false },
    ],
  },
  {
    heading: 'Background Check',
    blurb: 'Safety and legal screening for all occupants 18+.',
    items: [
      { id: 'bg-felony', label: 'No violent or drug-related felonies in past', requirement: '7 years', checked: true },
      { id: 'bg-sex', label: 'Not on sex offender registry', requirement: 'Required', checked: true },
    ],
  },
  {
    heading: 'References',
    blurb: 'Direct conversations catch red flags that reports miss.',
    items: [
      { id: 'ref-landlord', label: 'Previous landlord reference(s)', requirement: '2', checked: true },
      { id: 'ref-personal', label: 'Personal or professional references', requirement: '2', checked: false },
    ],
  },
];

export const TenantScreeningCriteria = forwardRef<ToolHandle>(function TenantScreeningCriteria(_, ref) {
  const [sections, setSections] = useState<Section[]>(SEED);

  const toggle = useCallback((si: number, ii: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i !== si ? s : { ...s, items: s.items.map((it, j) => (j === ii ? { ...it, checked: !it.checked } : it)) }
      )
    );
  }, []);

  const updateReq = useCallback((si: number, ii: number, val: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i !== si ? s : { ...s, items: s.items.map((it, j) => (j === ii ? { ...it, requirement: val } : it)) }
      )
    );
  }, []);

  const reset = useCallback(() => setSections(SEED), []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Tenant Screening Criteria',
      type: 'checklist',
      sections: sections.map((s) => ({
        heading: s.heading,
        table: {
          headers: ['Included', 'Criterion', 'Requirement'],
          rows: s.items.map((it) => [it.checked ? 'Yes' : 'No', it.label, it.requirement]),
        },
      })),
    }),
  }));

  const totalChecked = sections.reduce((n, s) => n + s.items.filter((i) => i.checked).length, 0);
  const totalItems = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={120}
            height={47}
            className="h-10 w-auto hidden sm:block"
          />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Tenant Screening Criteria</h2>
            <p className="mt-1 text-sm text-gray-500">Pick the standards you'll hold every applicant to — in writing.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-[#0000CC]/10 px-3 py-1 text-xs font-semibold text-[#0000CC]">
            {totalChecked} / {totalItems} included
          </span>
          <button
            onClick={reset}
            className="rounded-lg border border-gray-200 bg-white px-4 h-10 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((s, si) => (
          <div key={s.heading} className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900">{s.heading}</h3>
              <p className="mt-0.5 text-xs text-gray-500">{s.blurb}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {s.items.map((it, ii) => (
                <div key={it.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={it.checked}
                    onClick={() => toggle(si, ii)}
                    className={`flex-shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      it.checked
                        ? 'bg-[#0000CC] border-[#0000CC] text-white'
                        : 'bg-white border-gray-200 text-transparent hover:border-[#0000CC]/40'
                    }`}
                  >
                    <Check className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${it.checked ? 'text-gray-900' : 'text-gray-500'}`}>
                      {it.label}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={it.requirement}
                    onChange={(e) => updateReq(si, ii, e.target.value)}
                    className="w-28 sm:w-36 h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default TenantScreeningCriteria;
