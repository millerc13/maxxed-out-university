'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function TextInput({ label, value, onChange, id, placeholder }: { label: string; value: string; onChange: (v: string) => void; id: string; placeholder?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
    </label>
  );
}

function DollarInput({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
        <span className="pl-3 text-gray-400 select-none">$</span>
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 pr-3 pl-1 outline-none text-gray-900" />
      </div>
    </label>
  );
}

function SelectInput({ label, value, onChange, id, options }: { label: string; value: string; onChange: (v: string) => void; id: string; options: { value: string; label: string }[] }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all">
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, id, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; id: string; placeholder?: string; rows?: number }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all resize-y" />
    </label>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{title}</h3>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-6 pb-6 pt-0">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface Fields {
  tenantName: string;
  unitAddress: string;
  phone: string;
  email: string;
  requestDate: string;
  category: string;
  priority: string;
  description: string;
  locationInUnit: string;
  permissionToEnter: string;
  assignedTo: string;
  dateScheduled: string;
  workCompletedDate: string;
  cost: string;
  notes: string;
}

const defaults: Fields = {
  tenantName: '', unitAddress: '', phone: '', email: '', requestDate: '',
  category: '', priority: '', description: '', locationInUnit: '', permissionToEnter: '',
  assignedTo: '', dateScheduled: '', workCompletedDate: '', cost: '', notes: '',
};

const CATEGORIES = [
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Appliance', label: 'Appliance' },
  { value: 'Structural', label: 'Structural' },
  { value: 'Pest', label: 'Pest Control' },
  { value: 'Other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Emergency', label: 'Emergency' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const MaintenanceRequest = forwardRef<ToolHandle>(function MaintenanceRequest(_, ref) {
  const [f, setF] = useState<Fields>(defaults);
  const set = useCallback((key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })), []);
  const handleReset = useCallback(() => setF(defaults), []);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Emergency': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Maintenance Request',
      type: 'template',
      sections: [
        {
          heading: 'Tenant Information',
          rows: [
            { label: 'Name', value: f.tenantName || '---' },
            { label: 'Unit/Address', value: f.unitAddress || '---' },
            { label: 'Phone', value: f.phone || '---' },
            { label: 'Email', value: f.email || '---' },
            { label: 'Date of Request', value: f.requestDate || '---' },
          ],
        },
        {
          heading: 'Request Details',
          rows: [
            { label: 'Category', value: f.category || '---' },
            { label: 'Priority', value: f.priority || '---' },
            { label: 'Description', value: f.description || '---' },
            { label: 'Location in Unit', value: f.locationInUnit || '---' },
            { label: 'Permission to Enter', value: f.permissionToEnter || '---' },
          ],
        },
        {
          heading: 'Resolution',
          rows: [
            { label: 'Assigned To', value: f.assignedTo || '---' },
            { label: 'Date Scheduled', value: f.dateScheduled || '---' },
            { label: 'Work Completed Date', value: f.workCompletedDate || '---' },
            { label: 'Cost', value: f.cost ? `$${f.cost}` : '---' },
            { label: 'Notes', value: f.notes || '---' },
          ],
        },
      ],
    }),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={120}
            height={47}
            className="h-10 w-auto"
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Maintenance Request</h2>
            <p className="mt-1 text-sm text-gray-500">Document and track maintenance requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {f.priority && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${priorityColor(f.priority)}`}>
              {f.priority} Priority
            </span>
          )}
          <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
            Reset All
          </button>
        </div>
      </div>

      <Section title="Tenant Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Tenant Name" value={f.tenantName} onChange={set('tenantName')} id="mr-name" />
          <TextInput label="Unit / Address" value={f.unitAddress} onChange={set('unitAddress')} id="mr-unit" placeholder="Unit 3B or 123 Oak St" />
          <TextInput label="Phone" value={f.phone} onChange={set('phone')} id="mr-phone" placeholder="(555) 123-4567" />
          <TextInput label="Email" value={f.email} onChange={set('email')} id="mr-email" placeholder="tenant@email.com" />
          <TextInput label="Date of Request" value={f.requestDate} onChange={set('requestDate')} id="mr-date" placeholder="MM/DD/YYYY" />
        </div>
      </Section>

      <Section title="Request Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput label="Category" value={f.category} onChange={set('category')} id="mr-category" options={CATEGORIES} />
          <SelectInput label="Priority" value={f.priority} onChange={set('priority')} id="mr-priority" options={PRIORITIES} />
          <div className="sm:col-span-2">
            <TextArea label="Description" value={f.description} onChange={set('description')} id="mr-description"
              placeholder="Describe the issue in detail..." rows={4} />
          </div>
          <TextInput label="Location in Unit" value={f.locationInUnit} onChange={set('locationInUnit')} id="mr-location" placeholder="Kitchen, bathroom, etc." />
          <SelectInput label="Permission to Enter" value={f.permissionToEnter} onChange={set('permissionToEnter')} id="mr-enter"
            options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
        </div>
      </Section>

      <Section title="Resolution (Landlord Use)" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Assigned To" value={f.assignedTo} onChange={set('assignedTo')} id="mr-assigned" placeholder="Vendor or contractor name" />
          <TextInput label="Date Scheduled" value={f.dateScheduled} onChange={set('dateScheduled')} id="mr-scheduled" placeholder="MM/DD/YYYY" />
          <TextInput label="Work Completed Date" value={f.workCompletedDate} onChange={set('workCompletedDate')} id="mr-completed" placeholder="MM/DD/YYYY" />
          <DollarInput label="Cost" value={f.cost} onChange={set('cost')} id="mr-cost" />
          <div className="sm:col-span-2">
            <TextArea label="Notes" value={f.notes} onChange={set('notes')} id="mr-notes"
              placeholder="Resolution details, parts ordered, follow-up needed..." rows={3} />
          </div>
        </div>
      </Section>
    </div>
  );
});

export default MaintenanceRequest;
