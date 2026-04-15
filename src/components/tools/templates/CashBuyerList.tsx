'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

interface BuyerRow {
  name: string;
  company: string;
  phone: string;
  email: string;
  markets: string;
  propertyTypes: string;
  maxPrice: string;
  notes: string;
}

const emptyBuyer = (): BuyerRow => ({
  name: '',
  company: '',
  phone: '',
  email: '',
  markets: '',
  propertyTypes: '',
  maxPrice: '',
  notes: '',
});

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'tel';
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
      />
    </label>
  );
}

export const CashBuyerList = forwardRef<ToolHandle>(function CashBuyerList(_, ref) {
  const [rows, setRows] = useState<BuyerRow[]>([emptyBuyer(), emptyBuyer(), emptyBuyer()]);

  const update = useCallback((idx: number, key: keyof BuyerRow, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  }, []);

  const add = useCallback(() => setRows((prev) => [...prev, emptyBuyer()]), []);
  const remove = useCallback(
    (idx: number) => setRows((prev) => (prev.length <= 1 ? [emptyBuyer()] : prev.filter((_, i) => i !== idx))),
    []
  );
  const reset = useCallback(() => setRows([emptyBuyer(), emptyBuyer(), emptyBuyer()]), []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => {
      const filled = rows.filter((r) => r.name);
      return {
        title: 'Cash Buyer List',
        type: 'template',
        sections: [
          {
            heading: 'Cash Buyers',
            table: {
              headers: ['Name', 'Company', 'Phone', 'Email', 'Markets', 'Property Types', 'Max Price', 'Notes'],
              rows:
                filled.length > 0
                  ? filled.map((r) => [
                      r.name,
                      r.company,
                      r.phone,
                      r.email,
                      r.markets,
                      r.propertyTypes,
                      r.maxPrice,
                      r.notes,
                    ])
                  : [['(no buyers added)', '', '', '', '', '', '', '']],
            },
          },
        ],
      };
    },
  }));

  const filledCount = rows.filter((r) => r.name).length;

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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Cash Buyer List</h2>
            <p className="mt-1 text-sm text-gray-500">Your go-to network of verified buyers ready to close fast.</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-lg border border-gray-200 bg-white px-4 h-10 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 cursor-pointer"
        >
          Reset All
        </button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">Buyers</h3>
          <span className="inline-flex items-center rounded-full bg-[#0000CC]/10 px-2 py-0.5 text-xs font-semibold text-[#0000CC]">
            {filledCount} filled
          </span>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {rows.map((r, i) => (
            <div key={i} className="relative rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Buyer {i + 1}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Buyer Name" value={r.name} onChange={(v) => update(i, 'name', v)} placeholder="Full name" />
                <Field label="Company / LLC" value={r.company} onChange={(v) => update(i, 'company', v)} placeholder="Optional" />
                <Field label="Phone" value={r.phone} onChange={(v) => update(i, 'phone', v)} type="tel" placeholder="(555) 555-5555" />
                <Field label="Email" value={r.email} onChange={(v) => update(i, 'email', v)} type="email" placeholder="buyer@example.com" />
                <Field label="Markets" value={r.markets} onChange={(v) => update(i, 'markets', v)} placeholder="City, state, or area" />
                <Field label="Property Types" value={r.propertyTypes} onChange={(v) => update(i, 'propertyTypes', v)} placeholder="SFH, multifamily, etc." />
                <Field label="Max Purchase Price" value={r.maxPrice} onChange={(v) => update(i, 'maxPrice', v)} placeholder="$250,000" />
                <Field label="Notes" value={r.notes} onChange={(v) => update(i, 'notes', v)} placeholder="Preferences, timing, etc." />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove buyer"
                  className="absolute top-2 right-2 w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-white transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-dashed border-[#0000CC]/40 text-[#0000CC] font-semibold text-sm hover:bg-[#0000CC]/5 active:bg-[#0000CC]/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add another buyer
          </button>
        </div>
      </div>
    </div>
  );
});

export default CashBuyerList;
