'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function TextInput({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id: string; placeholder?: string }) {
  return (
    <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-sm outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          className={`text-lg leading-none transition-colors ${star <= value ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VendorRow {
  company: string;
  contact: string;
  phone: string;
  email: string;
  rating: number;
  notes: string;
}

const emptyVendor = (): VendorRow => ({ company: '', contact: '', phone: '', email: '', rating: 0, notes: '' });

const CATEGORIES = [
  'General Contractor',
  'Plumber',
  'Electrician',
  'HVAC',
  'Roofer',
  'Painter',
  'Flooring',
  'Handyman',
  'Property Manager',
  'Inspector',
  'Appraiser',
  'Attorney',
  'Insurance Agent',
  'Lender',
] as const;

type CategoryData = Record<string, VendorRow[]>;

function initData(): CategoryData {
  const data: CategoryData = {};
  for (const cat of CATEGORIES) {
    data[cat] = [emptyVendor(), emptyVendor()];
  }
  return data;
}

/* ------------------------------------------------------------------ */
/*  Category Section                                                   */
/* ------------------------------------------------------------------ */

function CategorySection({
  category,
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  category: string;
  rows: VendorRow[];
  onUpdate: (idx: number, key: keyof VendorRow, val: string | number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const filledCount = rows.filter((r) => r.company).length;

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{category}</h3>
          {filledCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-[#0000CC]/10 px-2 py-0.5 text-xs font-medium text-[#0000CC]">
              {filledCount}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-4 pt-0">
          {/* Header row */}
          <div className="hidden lg:grid lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto_1fr_auto] gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 px-1 mb-2">
            <span>Company</span><span>Contact</span><span>Phone</span><span>Email</span><span>Rating</span><span>Notes</span><span></span>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto_1fr_auto] gap-2 items-center">
                <TextInput value={r.company} onChange={(v) => onUpdate(i, 'company', v)} id={`vc-${category}-co-${i}`} placeholder="Company Name" />
                <TextInput value={r.contact} onChange={(v) => onUpdate(i, 'contact', v)} id={`vc-${category}-ct-${i}`} placeholder="Contact" />
                <TextInput value={r.phone} onChange={(v) => onUpdate(i, 'phone', v)} id={`vc-${category}-ph-${i}`} placeholder="Phone" />
                <TextInput value={r.email} onChange={(v) => onUpdate(i, 'email', v)} id={`vc-${category}-em-${i}`} placeholder="Email" />
                <RatingInput value={r.rating} onChange={(v) => onUpdate(i, 'rating', v)} />
                <TextInput value={r.notes} onChange={(v) => onUpdate(i, 'notes', v)} id={`vc-${category}-nt-${i}`} placeholder="Notes" />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0000CC] hover:text-[#0000AA] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Row
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const VendorContractorList = forwardRef<ToolHandle>(function VendorContractorList(_, ref) {
  const [data, setData] = useState<CategoryData>(initData);

  const handleUpdate = useCallback((category: string, idx: number, key: keyof VendorRow, val: string | number) => {
    setData((prev) => ({
      ...prev,
      [category]: prev[category].map((r, i) => (i === idx ? { ...r, [key]: val } : r)),
    }));
  }, []);

  const handleAdd = useCallback((category: string) => {
    setData((prev) => ({ ...prev, [category]: [...prev[category], emptyVendor()] }));
  }, []);

  const handleRemove = useCallback((category: string, idx: number) => {
    setData((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== idx),
    }));
  }, []);

  const handleReset = useCallback(() => setData(initData()), []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Vendor & Contractor List',
      type: 'template',
      sections: CATEGORIES.map((cat) => {
        const filled = data[cat].filter((r) => r.company);
        return {
          heading: cat,
          table: {
            headers: ['Company', 'Contact', 'Phone', 'Email', 'Rating', 'Notes'],
            rows: filled.length > 0
              ? filled.map((r) => [r.company, r.contact, r.phone, r.email, r.rating ? `${r.rating}/5` : '', r.notes])
              : [['(none)', '', '', '', '', '']],
          },
        };
      }),
    }),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={120}
            height={47}
            className="h-10 w-auto hidden sm:block"
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vendor & Contractor List</h2>
            <p className="mt-1 text-sm text-gray-500">Keep your trusted vendors and contractors organized by category</p>
          </div>
        </div>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
          Reset All
        </button>
      </div>

      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          rows={data[cat]}
          onUpdate={(idx, key, val) => handleUpdate(cat, idx, key, val)}
          onAdd={() => handleAdd(cat)}
          onRemove={(idx) => handleRemove(cat, idx)}
        />
      ))}
    </div>
  );
});

export default VendorContractorList;
