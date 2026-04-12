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

function TextArea({ label, value, onChange, id, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; id: string; placeholder?: string; rows?: number }) {
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
  address: string;
  unitNumber: string;
  landlordName: string;
  quietFrom: string;
  quietTo: string;
  parkingSpot: string;
  maxVehicles: string;
  petsAllowed: string;
  petDeposit: string;
  petWeightLimit: string;
  smokingAllowed: string;
  smokingArea: string;
  maxGuestNights: string;
  guestNotification: string;
  maintenanceResponsibilities: string;
  commonAreaRules: string;
  trashPickupDay: string;
  binLocation: string;
  landlordSignDate: string;
  tenantSignDate: string;
}

const defaults: Fields = {
  address: '', unitNumber: '', landlordName: '',
  quietFrom: '10:00 PM', quietTo: '8:00 AM',
  parkingSpot: '', maxVehicles: '2',
  petsAllowed: '', petDeposit: '', petWeightLimit: '',
  smokingAllowed: '', smokingArea: '',
  maxGuestNights: '7', guestNotification: '',
  maintenanceResponsibilities: '', commonAreaRules: '',
  trashPickupDay: '', binLocation: '',
  landlordSignDate: '', tenantSignDate: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const HouseRulesAddendum = forwardRef<ToolHandle>(function HouseRulesAddendum(_, ref) {
  const [f, setF] = useState<Fields>(defaults);
  const set = useCallback((key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })), []);
  const handleReset = useCallback(() => setF(defaults), []);
  const or = (v: string, fallback = '___________') => v || fallback;

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'House Rules Addendum',
      type: 'template',
      sections: [
        {
          heading: 'Property Information',
          rows: [
            { label: 'Address', value: or(f.address) },
            { label: 'Unit Number', value: or(f.unitNumber) },
            { label: 'Landlord Name', value: or(f.landlordName) },
          ],
        },
        {
          heading: 'Rules',
          paragraphs: [
            `Quiet Hours: All tenants and guests shall observe quiet hours from ${or(f.quietFrom)} to ${or(f.quietTo)} daily.`,
            `Parking: Assigned parking spot: ${or(f.parkingSpot)}. Maximum vehicles allowed: ${or(f.maxVehicles)}.`,
            `Pets: Pets are ${or(f.petsAllowed, 'not specified')}. ${f.petsAllowed === 'Allowed' ? `Pet deposit: $${or(f.petDeposit)}. Weight limit: ${or(f.petWeightLimit)} lbs.` : ''}`,
            `Smoking: Smoking is ${or(f.smokingAllowed, 'not specified')}. ${f.smokingAllowed === 'Allowed' ? `Designated area: ${or(f.smokingArea)}.` : ''}`,
            `Guests: Maximum consecutive overnight guest stay: ${or(f.maxGuestNights)} nights. Notification required: ${or(f.guestNotification, 'not specified')}.`,
            `Maintenance: Tenant responsibilities: ${or(f.maintenanceResponsibilities, 'Not specified')}.`,
            `Common Areas: ${or(f.commonAreaRules, 'Not specified')}.`,
            `Trash/Recycling: Pickup day: ${or(f.trashPickupDay)}. Bin location: ${or(f.binLocation)}.`,
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
            <h2 className="text-2xl font-bold text-gray-900">House Rules Addendum</h2>
            <p className="mt-1 text-sm text-gray-500">Create a house rules addendum for your rental property</p>
          </div>
        </div>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
          Reset All
        </button>
      </div>

      <Section title="Property Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextInput label="Property Address" value={f.address} onChange={set('address')} id="hr-address" placeholder="123 Main St" />
          <TextInput label="Unit Number" value={f.unitNumber} onChange={set('unitNumber')} id="hr-unit" placeholder="Apt 2B" />
          <TextInput label="Landlord Name" value={f.landlordName} onChange={set('landlordName')} id="hr-landlord" />
        </div>
      </Section>

      <Section title="Quiet Hours">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Quiet Hours From" value={f.quietFrom} onChange={set('quietFrom')} id="hr-quiet-from" placeholder="10:00 PM" />
          <TextInput label="Quiet Hours To" value={f.quietTo} onChange={set('quietTo')} id="hr-quiet-to" placeholder="8:00 AM" />
        </div>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          All tenants and guests shall observe quiet hours from <span className="font-semibold text-[#0000CC]">{or(f.quietFrom, '[time]')}</span> to <span className="font-semibold text-[#0000CC]">{or(f.quietTo, '[time]')}</span> daily. Excessive noise during these hours may result in lease violations.
        </p>
      </Section>

      <Section title="Parking">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Assigned Parking Spot" value={f.parkingSpot} onChange={set('parkingSpot')} id="hr-parking" placeholder="Spot #3" />
          <TextInput label="Maximum Vehicles" value={f.maxVehicles} onChange={set('maxVehicles')} id="hr-vehicles" />
        </div>
      </Section>

      <Section title="Pets">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectInput label="Pets Allowed" value={f.petsAllowed} onChange={set('petsAllowed')} id="hr-pets"
            options={[{ value: 'Allowed', label: 'Allowed' }, { value: 'Not Allowed', label: 'Not Allowed' }]} />
          {f.petsAllowed === 'Allowed' && (
            <>
              <DollarInput label="Pet Deposit" value={f.petDeposit} onChange={set('petDeposit')} id="hr-pet-deposit" />
              <TextInput label="Weight Limit (lbs)" value={f.petWeightLimit} onChange={set('petWeightLimit')} id="hr-pet-weight" />
            </>
          )}
        </div>
      </Section>

      <Section title="Smoking">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput label="Smoking Allowed" value={f.smokingAllowed} onChange={set('smokingAllowed')} id="hr-smoking"
            options={[{ value: 'Allowed', label: 'Allowed' }, { value: 'Not Allowed', label: 'Not Allowed' }]} />
          {f.smokingAllowed === 'Allowed' && (
            <TextInput label="Designated Smoking Area" value={f.smokingArea} onChange={set('smokingArea')} id="hr-smoking-area" placeholder="Back patio only" />
          )}
        </div>
      </Section>

      <Section title="Guests">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Max Consecutive Nights" value={f.maxGuestNights} onChange={set('maxGuestNights')} id="hr-guest-nights" />
          <SelectInput label="Notification Required" value={f.guestNotification} onChange={set('guestNotification')} id="hr-guest-notify"
            options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
        </div>
      </Section>

      <Section title="Maintenance">
        <TextArea label="Tenant Maintenance Responsibilities" value={f.maintenanceResponsibilities} onChange={set('maintenanceResponsibilities')} id="hr-maintenance"
          placeholder="e.g., Lawn care, changing light bulbs, replacing HVAC filters monthly..." />
      </Section>

      <Section title="Common Areas">
        <TextArea label="Common Area Usage Rules" value={f.commonAreaRules} onChange={set('commonAreaRules')} id="hr-common"
          placeholder="e.g., Clean up after use, no personal items left in common areas..." />
      </Section>

      <Section title="Trash / Recycling">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Pickup Day" value={f.trashPickupDay} onChange={set('trashPickupDay')} id="hr-trash-day" placeholder="Tuesday" />
          <TextInput label="Bin Location" value={f.binLocation} onChange={set('binLocation')} id="hr-bin" placeholder="Side of building" />
        </div>
      </Section>

      <Section title="Signatures">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Landlord Signature Date" value={f.landlordSignDate} onChange={set('landlordSignDate')} id="hr-ll-sign" placeholder="MM/DD/YYYY" />
          <TextInput label="Tenant Signature Date" value={f.tenantSignDate} onChange={set('tenantSignDate')} id="hr-t-sign" placeholder="MM/DD/YYYY" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

export default HouseRulesAddendum;
