'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

const ROLES = [
  'Real Estate Agent',
  'Lender / Mortgage Broker',
  'Inspector',
  'Appraiser',
  'Title / Closing Attorney',
  'Accountant / CPA',
  'Property Manager',
  'Insurance Agent',
  'General Contractor',
  'Handyman',
  'Mentor / Coach',
] as const;

interface TeamRow {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyRow = (): TeamRow => ({ name: '', company: '', phone: '', email: '', notes: '' });

type TeamData = Record<string, TeamRow[]>;

function initData(): TeamData {
  const d: TeamData = {};
  for (const r of ROLES) d[r] = [emptyRow()];
  return d;
}

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

function RoleSection({
  role,
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  role: string;
  rows: TeamRow[];
  onUpdate: (idx: number, key: keyof TeamRow, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const filled = rows.filter((r) => r.name).length;

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">{role}</h3>
          {filled > 0 && (
            <span className="inline-flex items-center rounded-full bg-[#0000CC]/10 px-2 py-0.5 text-xs font-semibold text-[#0000CC]">
              {filled}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 pt-1 space-y-4">
          {rows.map((r, i) => (
            <div key={i} className="relative rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name" value={r.name} onChange={(v) => onUpdate(i, 'name', v)} placeholder="Full name" />
                <Field label="Company" value={r.company} onChange={(v) => onUpdate(i, 'company', v)} placeholder="Optional" />
                <Field label="Phone" value={r.phone} onChange={(v) => onUpdate(i, 'phone', v)} type="tel" placeholder="(555) 555-5555" />
                <Field label="Email" value={r.email} onChange={(v) => onUpdate(i, 'email', v)} type="email" placeholder="name@company.com" />
              </div>
              <div className="mt-3">
                <Field label="Notes" value={r.notes} onChange={(v) => onUpdate(i, 'notes', v)} placeholder="How you met, specialties, etc." />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label="Remove contact"
                  className="absolute top-2 right-2 w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-white transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0000CC] hover:text-[#0000AA] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another {role.split('/')[0].trim().toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}

export const TeamContactSheet = forwardRef<ToolHandle>(function TeamContactSheet(_, ref) {
  const [data, setData] = useState<TeamData>(initData);

  const handleUpdate = useCallback((role: string, idx: number, key: keyof TeamRow, val: string) => {
    setData((prev) => ({
      ...prev,
      [role]: prev[role].map((r, i) => (i === idx ? { ...r, [key]: val } : r)),
    }));
  }, []);

  const handleAdd = useCallback((role: string) => {
    setData((prev) => ({ ...prev, [role]: [...prev[role], emptyRow()] }));
  }, []);

  const handleRemove = useCallback((role: string, idx: number) => {
    setData((prev) => ({
      ...prev,
      [role]: prev[role].length <= 1 ? [emptyRow()] : prev[role].filter((_, i) => i !== idx),
    }));
  }, []);

  const handleReset = useCallback(() => setData(initData()), []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Team Contact Sheet',
      type: 'template',
      sections: ROLES.map((role) => {
        const filled = data[role].filter((r) => r.name);
        return {
          heading: role,
          table: {
            headers: ['Name', 'Company', 'Phone', 'Email', 'Notes'],
            rows:
              filled.length > 0
                ? filled.map((r) => [r.name, r.company, r.phone, r.email, r.notes])
                : [['(no contacts)', '', '', '', '']],
          },
        };
      }),
    }),
  }));

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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Team Contact Sheet</h2>
            <p className="mt-1 text-sm text-gray-500">Keep your dream team of advisors + pros in one place.</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="rounded-lg border border-gray-200 bg-white px-4 h-10 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 cursor-pointer"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-3">
        {ROLES.map((role) => (
          <RoleSection
            key={role}
            role={role}
            rows={data[role]}
            onUpdate={(idx, key, val) => handleUpdate(role, idx, key, val)}
            onAdd={() => handleAdd(role)}
            onRemove={(idx) => handleRemove(role, idx)}
          />
        ))}
      </div>
    </div>
  );
});

export default TeamContactSheet;
