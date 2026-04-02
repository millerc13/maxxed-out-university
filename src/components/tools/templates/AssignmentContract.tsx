'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function TextInput({
  label,
  value,
  onChange,
  id,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
  placeholder?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
      />
    </label>
  );
}

function DollarInput({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
        <span className="pl-3 text-gray-400 select-none">$</span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 pr-3 pl-1 outline-none text-gray-900"
        />
      </div>
    </label>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{title}</h3>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-6 pb-6 pt-0">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  State shape                                                        */
/* ------------------------------------------------------------------ */

interface Fields {
  assignorName: string;
  assignorAddress: string;
  assignorPhone: string;
  assignorEmail: string;
  assigneeName: string;
  assigneeAddress: string;
  assigneePhone: string;
  propertyAddress: string;
  originalContractDate: string;
  originalSellerName: string;
  originalPurchasePrice: string;
  closingDate: string;
  assignmentFee: string;
  depositAmount: string;
  depositDueDate: string;
  assignmentDate: string;
}

const defaults: Fields = {
  assignorName: '',
  assignorAddress: '',
  assignorPhone: '',
  assignorEmail: '',
  assigneeName: '',
  assigneeAddress: '',
  assigneePhone: '',
  propertyAddress: '',
  originalContractDate: '',
  originalSellerName: '',
  originalPurchasePrice: '',
  closingDate: '',
  assignmentFee: '',
  depositAmount: '',
  depositDueDate: '',
  assignmentDate: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const AssignmentContract = forwardRef<ToolHandle>(function AssignmentContract(_, ref) {
  const [f, setF] = useState<Fields>(defaults);

  const set = useCallback(
    (key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })),
    [],
  );

  const handleReset = useCallback(() => setF(defaults), []);

  const or = (v: string, fallback = '___________') => v || fallback;

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Assignment Contract',
      type: 'template',
      sections: [
        {
          heading: 'Disclaimer',
          paragraphs: [
            'This is a template only. Laws vary by state. Always consult with a licensed real estate attorney before using this document in any transaction.',
          ],
        },
        {
          heading: 'Parties',
          rows: [
            { label: 'Assignor Name', value: or(f.assignorName) },
            { label: 'Assignor Address', value: or(f.assignorAddress) },
            { label: 'Assignor Phone', value: or(f.assignorPhone) },
            { label: 'Assignor Email', value: or(f.assignorEmail) },
            { label: 'Assignee Name', value: or(f.assigneeName) },
            { label: 'Assignee Address', value: or(f.assigneeAddress) },
            { label: 'Assignee Phone', value: or(f.assigneePhone) },
          ],
        },
        {
          heading: 'Original Contract Details',
          rows: [
            { label: 'Property Address', value: or(f.propertyAddress) },
            { label: 'Original Contract Date', value: or(f.originalContractDate) },
            { label: 'Original Seller Name', value: or(f.originalSellerName) },
            { label: 'Original Purchase Price', value: f.originalPurchasePrice ? `$${f.originalPurchasePrice}` : '___________' },
            { label: 'Closing Date', value: or(f.closingDate) },
          ],
        },
        {
          heading: 'Assignment Terms',
          rows: [
            { label: 'Assignment Fee', value: f.assignmentFee ? `$${f.assignmentFee}` : '___________' },
            { label: 'Deposit Amount', value: f.depositAmount ? `$${f.depositAmount}` : '___________' },
            { label: 'Deposit Due Date', value: or(f.depositDueDate) },
            { label: 'Assignment Date', value: or(f.assignmentDate) },
          ],
        },
        {
          heading: 'Key Provisions',
          paragraphs: [
            `This Assignment of Contract is entered into on ${or(f.assignmentDate)} by and between ${or(f.assignorName)} ("Assignor") and ${or(f.assigneeName)} ("Assignee").`,
            `The Assignor hereby assigns all rights, title, and interest in the Purchase Agreement dated ${or(f.originalContractDate)} for the property located at ${or(f.propertyAddress)}, originally executed between the Assignor and ${or(f.originalSellerName)} ("Seller"), with an original purchase price of $${or(f.originalPurchasePrice, '___')}.`,
            `In consideration of this assignment, the Assignee agrees to pay the Assignor an assignment fee of $${or(f.assignmentFee, '___')}. A non-refundable deposit of $${or(f.depositAmount, '___')} shall be due on or before ${or(f.depositDueDate)}.`,
            `The Assignee agrees to fulfill all terms and conditions of the original purchase contract and shall close on or before ${or(f.closingDate)}.`,
            `The Assignor warrants that the original contract is in good standing, that no defaults exist, and that the Assignor has the right to assign said contract.`,
          ],
        },
      ],
    }),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
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
            <h2 className="text-2xl font-bold text-gray-900">Assignment Contract</h2>
            <p className="mt-1 text-sm text-gray-500">Fill in the fields to generate your assignment of contract</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
        >
          Reset All
        </button>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Disclaimer:</span> This is a template only. Laws vary by state. Always consult with a licensed real estate attorney before using this document in any transaction.
        </p>
      </div>

      {/* Parties */}
      <Section title="Parties">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Assignor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Assignor Name" value={f.assignorName} onChange={set('assignorName')} id="ac-assignor-name" />
            <TextInput label="Assignor Address" value={f.assignorAddress} onChange={set('assignorAddress')} id="ac-assignor-address" />
            <TextInput label="Assignor Phone" value={f.assignorPhone} onChange={set('assignorPhone')} id="ac-assignor-phone" />
            <TextInput label="Assignor Email" value={f.assignorEmail} onChange={set('assignorEmail')} id="ac-assignor-email" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-2">Assignee</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Assignee Name" value={f.assigneeName} onChange={set('assigneeName')} id="ac-assignee-name" />
            <TextInput label="Assignee Address" value={f.assigneeAddress} onChange={set('assigneeAddress')} id="ac-assignee-address" />
            <TextInput label="Assignee Phone" value={f.assigneePhone} onChange={set('assigneePhone')} id="ac-assignee-phone" />
          </div>
        </div>
      </Section>

      {/* Original Contract Details */}
      <Section title="Original Contract Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Property Address" value={f.propertyAddress} onChange={set('propertyAddress')} id="ac-property" placeholder="123 Main St, City, ST 12345" />
          <TextInput label="Original Contract Date" value={f.originalContractDate} onChange={set('originalContractDate')} id="ac-contract-date" placeholder="MM/DD/YYYY" />
          <TextInput label="Original Seller Name" value={f.originalSellerName} onChange={set('originalSellerName')} id="ac-seller" />
          <DollarInput label="Original Purchase Price" value={f.originalPurchasePrice} onChange={set('originalPurchasePrice')} id="ac-purchase-price" />
          <TextInput label="Closing Date" value={f.closingDate} onChange={set('closingDate')} id="ac-closing" placeholder="MM/DD/YYYY" />
        </div>
      </Section>

      {/* Assignment Terms */}
      <Section title="Assignment Terms">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DollarInput label="Assignment Fee" value={f.assignmentFee} onChange={set('assignmentFee')} id="ac-fee" />
          <DollarInput label="Deposit Amount" value={f.depositAmount} onChange={set('depositAmount')} id="ac-deposit" />
          <TextInput label="Deposit Due Date" value={f.depositDueDate} onChange={set('depositDueDate')} id="ac-deposit-due" placeholder="MM/DD/YYYY" />
          <TextInput label="Assignment Date" value={f.assignmentDate} onChange={set('assignmentDate')} id="ac-assign-date" placeholder="MM/DD/YYYY" />
        </div>
      </Section>

      {/* Preview of Key Provisions */}
      <Section title="Key Provisions (Preview)">
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            This Assignment of Contract is entered into on <span className="font-semibold text-[#0000CC]">{or(f.assignmentDate, '[Date]')}</span> by and between <span className="font-semibold text-[#0000CC]">{or(f.assignorName, '[Assignor]')}</span> (&quot;Assignor&quot;) and <span className="font-semibold text-[#0000CC]">{or(f.assigneeName, '[Assignee]')}</span> (&quot;Assignee&quot;).
          </p>
          <p>
            The Assignor hereby assigns all rights, title, and interest in the Purchase Agreement dated <span className="font-semibold text-[#0000CC]">{or(f.originalContractDate, '[Date]')}</span> for the property located at <span className="font-semibold text-[#0000CC]">{or(f.propertyAddress, '[Address]')}</span>, originally executed between the Assignor and <span className="font-semibold text-[#0000CC]">{or(f.originalSellerName, '[Seller]')}</span> (&quot;Seller&quot;), with an original purchase price of <span className="font-semibold text-[#0000CC]">${or(f.originalPurchasePrice, '___')}</span>.
          </p>
          <p>
            In consideration of this assignment, the Assignee agrees to pay the Assignor an assignment fee of <span className="font-semibold text-[#0000CC]">${or(f.assignmentFee, '___')}</span>. A non-refundable deposit of <span className="font-semibold text-[#0000CC]">${or(f.depositAmount, '___')}</span> shall be due on or before <span className="font-semibold text-[#0000CC]">{or(f.depositDueDate, '[Date]')}</span>.
          </p>
          <p>
            The Assignee agrees to fulfill all terms and conditions of the original purchase contract and shall close on or before <span className="font-semibold text-[#0000CC]">{or(f.closingDate, '[Date]')}</span>.
          </p>
          <p>
            The Assignor warrants that the original contract is in good standing, that no defaults exist, and that the Assignor has the right to assign said contract.
          </p>
        </div>
      </Section>
    </div>
  );
});

export default AssignmentContract;
