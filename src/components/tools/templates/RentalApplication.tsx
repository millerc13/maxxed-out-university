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

interface RefRow {
  name: string;
  relationship: string;
  phone: string;
}

const emptyRef = (): RefRow => ({ name: '', relationship: '', phone: '' });

interface Fields {
  fullName: string;
  dob: string;
  ssnLast4: string;
  phone: string;
  email: string;
  currentAddress: string;
  howLongCurrent: string;
  reasonForMoving: string;
  employer: string;
  position: string;
  monthlyIncome: string;
  supervisorName: string;
  supervisorPhone: string;
  employmentLength: string;
  prevLandlordName: string;
  prevLandlordPhone: string;
  prevAddress: string;
  prevMonthlyRent: string;
  prevReasonForLeaving: string;
}

const defaults: Fields = {
  fullName: '', dob: '', ssnLast4: '', phone: '', email: '',
  currentAddress: '', howLongCurrent: '', reasonForMoving: '',
  employer: '', position: '', monthlyIncome: '', supervisorName: '', supervisorPhone: '', employmentLength: '',
  prevLandlordName: '', prevLandlordPhone: '', prevAddress: '', prevMonthlyRent: '', prevReasonForLeaving: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const RentalApplication = forwardRef<ToolHandle>(function RentalApplication(_, ref) {
  const [f, setF] = useState<Fields>(defaults);
  const [refs, setRefs] = useState<RefRow[]>([emptyRef(), emptyRef(), emptyRef()]);

  const set = useCallback((key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })), []);
  const handleReset = useCallback(() => { setF(defaults); setRefs([emptyRef(), emptyRef(), emptyRef()]); }, []);

  const setRef = useCallback((idx: number, key: keyof RefRow, v: string) => {
    setRefs((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: v } : r)));
  }, []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Rental Application',
      type: 'template',
      sections: [
        {
          heading: 'Personal Information',
          rows: [
            { label: 'Full Name', value: f.fullName || '---' },
            { label: 'Date of Birth', value: f.dob || '---' },
            { label: 'SSN (last 4)', value: f.ssnLast4 ? `***-**-${f.ssnLast4}` : '---' },
            { label: 'Phone', value: f.phone || '---' },
            { label: 'Email', value: f.email || '---' },
            { label: 'Current Address', value: f.currentAddress || '---' },
            { label: 'How Long at Current', value: f.howLongCurrent || '---' },
            { label: 'Reason for Moving', value: f.reasonForMoving || '---' },
          ],
        },
        {
          heading: 'Employment',
          rows: [
            { label: 'Employer', value: f.employer || '---' },
            { label: 'Position', value: f.position || '---' },
            { label: 'Monthly Income', value: f.monthlyIncome ? `$${f.monthlyIncome}` : '---' },
            { label: 'Supervisor Name', value: f.supervisorName || '---' },
            { label: 'Supervisor Phone', value: f.supervisorPhone || '---' },
            { label: 'Length of Employment', value: f.employmentLength || '---' },
          ],
        },
        {
          heading: 'Previous Rental',
          rows: [
            { label: 'Landlord Name', value: f.prevLandlordName || '---' },
            { label: 'Landlord Phone', value: f.prevLandlordPhone || '---' },
            { label: 'Address', value: f.prevAddress || '---' },
            { label: 'Monthly Rent', value: f.prevMonthlyRent ? `$${f.prevMonthlyRent}` : '---' },
            { label: 'Reason for Leaving', value: f.prevReasonForLeaving || '---' },
          ],
        },
        {
          heading: 'References',
          table: {
            headers: ['Name', 'Relationship', 'Phone'],
            rows: refs.filter((r) => r.name).map((r) => [r.name, r.relationship, r.phone]),
          },
        },
        {
          heading: 'Authorization',
          paragraphs: [
            'I authorize verification of all information provided in this application. I understand that false or incomplete information may result in denial of my application or termination of my tenancy. I authorize the landlord or their agent to obtain a consumer credit report and/or verify my employment, rental history, and references.',
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
            <h2 className="text-2xl font-bold text-gray-900">Rental Application</h2>
            <p className="mt-1 text-sm text-gray-500">Prospective tenant application form</p>
          </div>
        </div>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
          Reset All
        </button>
      </div>

      <Section title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Full Name" value={f.fullName} onChange={set('fullName')} id="ra-name" />
          <TextInput label="Date of Birth" value={f.dob} onChange={set('dob')} id="ra-dob" placeholder="MM/DD/YYYY" />
          <TextInput label="SSN (last 4 digits)" value={f.ssnLast4} onChange={set('ssnLast4')} id="ra-ssn" placeholder="1234" />
          <TextInput label="Phone" value={f.phone} onChange={set('phone')} id="ra-phone" placeholder="(555) 123-4567" />
          <TextInput label="Email" value={f.email} onChange={set('email')} id="ra-email" />
          <TextInput label="Current Address" value={f.currentAddress} onChange={set('currentAddress')} id="ra-addr" />
          <TextInput label="How Long at Current Address" value={f.howLongCurrent} onChange={set('howLongCurrent')} id="ra-howlong" placeholder="2 years" />
          <TextInput label="Reason for Moving" value={f.reasonForMoving} onChange={set('reasonForMoving')} id="ra-reason" />
        </div>
      </Section>

      <Section title="Employment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Current Employer" value={f.employer} onChange={set('employer')} id="ra-employer" />
          <TextInput label="Position" value={f.position} onChange={set('position')} id="ra-position" />
          <DollarInput label="Monthly Income" value={f.monthlyIncome} onChange={set('monthlyIncome')} id="ra-income" />
          <TextInput label="Supervisor Name" value={f.supervisorName} onChange={set('supervisorName')} id="ra-super" />
          <TextInput label="Supervisor Phone" value={f.supervisorPhone} onChange={set('supervisorPhone')} id="ra-superphone" />
          <TextInput label="Length of Employment" value={f.employmentLength} onChange={set('employmentLength')} id="ra-emplen" placeholder="3 years" />
        </div>
      </Section>

      <Section title="Previous Rental History">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Landlord Name" value={f.prevLandlordName} onChange={set('prevLandlordName')} id="ra-pll" />
          <TextInput label="Landlord Phone" value={f.prevLandlordPhone} onChange={set('prevLandlordPhone')} id="ra-pllphone" />
          <TextInput label="Address" value={f.prevAddress} onChange={set('prevAddress')} id="ra-paddr" />
          <DollarInput label="Monthly Rent" value={f.prevMonthlyRent} onChange={set('prevMonthlyRent')} id="ra-prent" />
          <div className="sm:col-span-2">
            <TextInput label="Reason for Leaving" value={f.prevReasonForLeaving} onChange={set('prevReasonForLeaving')} id="ra-preason" />
          </div>
        </div>
      </Section>

      <Section title="References">
        <div className="space-y-3">
          <div className="hidden sm:grid sm:grid-cols-3 gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            <span>Name</span><span>Relationship</span><span>Phone</span>
          </div>
          {refs.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <TextInput label="" value={r.name} onChange={(v) => setRef(i, 'name', v)} id={`ra-ref-name-${i}`} placeholder="Name" />
              <TextInput label="" value={r.relationship} onChange={(v) => setRef(i, 'relationship', v)} id={`ra-ref-rel-${i}`} placeholder="Friend, Coworker, etc." />
              <TextInput label="" value={r.phone} onChange={(v) => setRef(i, 'phone', v)} id={`ra-ref-phone-${i}`} placeholder="(555) 123-4567" />
            </div>
          ))}
        </div>
      </Section>

      {/* Authorization */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Authorization</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          I authorize verification of all information provided in this application. I understand that false or incomplete information may result in denial of my application or termination of my tenancy. I authorize the landlord or their agent to obtain a consumer credit report and/or verify my employment, rental history, and references.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border-t-2 border-gray-300 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Applicant Signature</p>
          </div>
          <div className="border-t-2 border-gray-300 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Date</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RentalApplication;
