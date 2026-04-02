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
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  coTenantName: string;
  propertyAddress: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  securityDeposit: string;
  lateFee: string;
  gracePeriod: string;
  rentDueDay: string;
  petsAllowed: string;
  petDeposit: string;
  maxOccupants: string;
  smoking: string;
  parkingSpots: string;
  landlordSignDate: string;
  tenantSignDate: string;
}

const defaults: Fields = {
  landlordName: '', landlordAddress: '', landlordPhone: '',
  tenantName: '', tenantPhone: '', tenantEmail: '', coTenantName: '',
  propertyAddress: '', unit: '', city: '', state: '', zip: '', propertyType: '',
  leaseStart: '', leaseEnd: '', monthlyRent: '', securityDeposit: '', lateFee: '', gracePeriod: '5', rentDueDay: '1',
  petsAllowed: '', petDeposit: '', maxOccupants: '', smoking: '', parkingSpots: '',
  landlordSignDate: '', tenantSignDate: '',
};

const PROPERTY_TYPES = [
  { value: 'House', label: 'House' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Duplex', label: 'Duplex' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ResidentialLease = forwardRef<ToolHandle>(function ResidentialLease(_, ref) {
  const [f, setF] = useState<Fields>(defaults);
  const set = useCallback((key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })), []);
  const handleReset = useCallback(() => setF(defaults), []);
  const or = (v: string, fallback = '___________') => v || fallback;

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Residential Lease Agreement',
      type: 'template',
      sections: [
        {
          heading: 'Parties',
          rows: [
            { label: 'Landlord Name', value: or(f.landlordName) },
            { label: 'Landlord Address', value: or(f.landlordAddress) },
            { label: 'Landlord Phone', value: or(f.landlordPhone) },
            { label: 'Tenant Name', value: or(f.tenantName) },
            { label: 'Tenant Phone', value: or(f.tenantPhone) },
            { label: 'Tenant Email', value: or(f.tenantEmail) },
            { label: 'Co-Tenant Name', value: or(f.coTenantName, 'N/A') },
          ],
        },
        {
          heading: 'Premises',
          rows: [
            { label: 'Property Address', value: or(f.propertyAddress) },
            { label: 'Unit', value: or(f.unit, 'N/A') },
            { label: 'City', value: or(f.city) },
            { label: 'State', value: or(f.state) },
            { label: 'Zip', value: or(f.zip) },
            { label: 'Property Type', value: or(f.propertyType) },
          ],
        },
        {
          heading: 'Terms',
          rows: [
            { label: 'Lease Start Date', value: or(f.leaseStart) },
            { label: 'Lease End Date', value: or(f.leaseEnd) },
            { label: 'Monthly Rent', value: f.monthlyRent ? `$${f.monthlyRent}` : '___________' },
            { label: 'Security Deposit', value: f.securityDeposit ? `$${f.securityDeposit}` : '___________' },
            { label: 'Late Fee', value: f.lateFee ? `$${f.lateFee}` : '___________' },
            { label: 'Grace Period', value: `${or(f.gracePeriod)} days` },
            { label: 'Rent Due Day', value: `Day ${or(f.rentDueDay)} of each month` },
          ],
        },
        {
          heading: 'Rules & Policies',
          rows: [
            { label: 'Pets Allowed', value: or(f.petsAllowed) },
            { label: 'Pet Deposit', value: f.petDeposit ? `$${f.petDeposit}` : 'N/A' },
            { label: 'Max Occupants', value: or(f.maxOccupants) },
            { label: 'Smoking', value: or(f.smoking) },
            { label: 'Parking Spots', value: or(f.parkingSpots) },
          ],
        },
        {
          heading: 'Signatures',
          rows: [
            { label: 'Landlord Signature Date', value: or(f.landlordSignDate) },
            { label: 'Tenant Signature Date', value: or(f.tenantSignDate) },
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
            <h2 className="text-2xl font-bold text-gray-900">Residential Lease Agreement</h2>
            <p className="mt-1 text-sm text-gray-500">Fill-in lease template for residential rental properties</p>
          </div>
        </div>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
          Reset All
        </button>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Disclaimer:</span> This is a template only. Landlord-tenant laws vary significantly by state and locality. Always consult with a licensed attorney before using this lease in any tenancy.
        </p>
      </div>

      <Section title="Landlord (Lessor)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Landlord Name" value={f.landlordName} onChange={set('landlordName')} id="rl-ll-name" />
          <TextInput label="Landlord Address" value={f.landlordAddress} onChange={set('landlordAddress')} id="rl-ll-addr" />
          <TextInput label="Landlord Phone" value={f.landlordPhone} onChange={set('landlordPhone')} id="rl-ll-phone" />
        </div>
      </Section>

      <Section title="Tenant (Lessee)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Tenant Name" value={f.tenantName} onChange={set('tenantName')} id="rl-t-name" />
          <TextInput label="Tenant Phone" value={f.tenantPhone} onChange={set('tenantPhone')} id="rl-t-phone" />
          <TextInput label="Tenant Email" value={f.tenantEmail} onChange={set('tenantEmail')} id="rl-t-email" />
          <TextInput label="Co-Tenant Name" value={f.coTenantName} onChange={set('coTenantName')} id="rl-co-name" placeholder="Optional" />
        </div>
      </Section>

      <Section title="Premises">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <TextInput label="Property Address" value={f.propertyAddress} onChange={set('propertyAddress')} id="rl-addr" placeholder="123 Main St" />
          </div>
          <TextInput label="Unit" value={f.unit} onChange={set('unit')} id="rl-unit" placeholder="Apt 1A" />
          <TextInput label="City" value={f.city} onChange={set('city')} id="rl-city" />
          <TextInput label="State" value={f.state} onChange={set('state')} id="rl-state" />
          <TextInput label="Zip" value={f.zip} onChange={set('zip')} id="rl-zip" />
          <SelectInput label="Property Type" value={f.propertyType} onChange={set('propertyType')} id="rl-type" options={PROPERTY_TYPES} />
        </div>
      </Section>

      <Section title="Lease Terms">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Lease Start Date" value={f.leaseStart} onChange={set('leaseStart')} id="rl-start" placeholder="MM/DD/YYYY" />
          <TextInput label="Lease End Date" value={f.leaseEnd} onChange={set('leaseEnd')} id="rl-end" placeholder="MM/DD/YYYY" />
          <DollarInput label="Monthly Rent" value={f.monthlyRent} onChange={set('monthlyRent')} id="rl-rent" />
          <DollarInput label="Security Deposit" value={f.securityDeposit} onChange={set('securityDeposit')} id="rl-deposit" />
          <DollarInput label="Late Fee" value={f.lateFee} onChange={set('lateFee')} id="rl-late" />
          <TextInput label="Grace Period (days)" value={f.gracePeriod} onChange={set('gracePeriod')} id="rl-grace" />
          <TextInput label="Rent Due Day of Month" value={f.rentDueDay} onChange={set('rentDueDay')} id="rl-due" />
        </div>
      </Section>

      <Section title="Rules & Policies">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput label="Pets Allowed" value={f.petsAllowed} onChange={set('petsAllowed')} id="rl-pets"
            options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
          {f.petsAllowed === 'Yes' && (
            <DollarInput label="Pet Deposit" value={f.petDeposit} onChange={set('petDeposit')} id="rl-pet-dep" />
          )}
          <TextInput label="Max Occupants" value={f.maxOccupants} onChange={set('maxOccupants')} id="rl-occ" />
          <SelectInput label="Smoking" value={f.smoking} onChange={set('smoking')} id="rl-smoke"
            options={[{ value: 'Allowed', label: 'Allowed' }, { value: 'Not Allowed', label: 'Not Allowed' }]} />
          <TextInput label="Parking Spots" value={f.parkingSpots} onChange={set('parkingSpots')} id="rl-parking" />
        </div>
      </Section>

      <Section title="Signatures">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Landlord Signature Date" value={f.landlordSignDate} onChange={set('landlordSignDate')} id="rl-ll-sign" placeholder="MM/DD/YYYY" />
          <TextInput label="Tenant Signature Date" value={f.tenantSignDate} onChange={set('tenantSignDate')} id="rl-t-sign" placeholder="MM/DD/YYYY" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border-t-2 border-gray-300 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Landlord Signature</p>
          </div>
          <div className="border-t-2 border-gray-300 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Tenant Signature</p>
          </div>
        </div>
      </Section>
    </div>
  );
});

export default ResidentialLease;
