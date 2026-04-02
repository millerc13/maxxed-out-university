'use client';

import { useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
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

function SelectInput({
  label,
  value,
  onChange,
  id,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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

interface CompRow {
  address: string;
  bedBath: string;
  sqFt: string;
  salePrice: string;
  date: string;
}

const emptyComp = (): CompRow => ({ address: '', bedBath: '', sqFt: '', salePrice: '', date: '' });

interface Fields {
  address: string;
  cityStateZip: string;
  propertyType: string;
  beds: string;
  baths: string;
  sqFt: string;
  yearBuilt: string;
  lotSize: string;
  purchasePrice: string;
  arvMarketValue: string;
  rehabBudget: string;
  monthlyRent: string;
  annualNOI: string;
  exitStrategy: string;
  expectedTimeline: string;
  targetProfit: string;
  financingMethod: string;
  notes: string;
}

const defaults: Fields = {
  address: '', cityStateZip: '', propertyType: '', beds: '', baths: '', sqFt: '', yearBuilt: '', lotSize: '',
  purchasePrice: '', arvMarketValue: '', rehabBudget: '', monthlyRent: '', annualNOI: '',
  exitStrategy: '', expectedTimeline: '', targetProfit: '', financingMethod: '', notes: '',
};

const PROPERTY_TYPES = [
  { value: 'SFH', label: 'Single Family Home' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'Triplex', label: 'Triplex' },
  { value: 'Quad', label: 'Quad' },
  { value: 'Multi-Family', label: 'Multi-Family' },
  { value: 'Commercial', label: 'Commercial' },
];

const EXIT_STRATEGIES = [
  { value: 'Wholesale', label: 'Wholesale' },
  { value: 'Fix & Flip', label: 'Fix & Flip' },
  { value: 'BRRRR', label: 'BRRRR' },
  { value: 'Buy & Hold', label: 'Buy & Hold' },
  { value: 'Subject To', label: 'Subject To' },
  { value: 'Owner Finance', label: 'Owner Finance' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const DealSummary = forwardRef<ToolHandle>(function DealSummary(_, ref) {
  const [f, setF] = useState<Fields>(defaults);
  const [comps, setComps] = useState<CompRow[]>([emptyComp(), emptyComp(), emptyComp()]);

  const set = useCallback(
    (key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })),
    [],
  );

  const capRate = useMemo(() => {
    const noi = parseFloat(f.annualNOI);
    const price = parseFloat(f.purchasePrice);
    if (noi > 0 && price > 0) return ((noi / price) * 100).toFixed(2) + '%';
    return '';
  }, [f.annualNOI, f.purchasePrice]);

  const handleReset = useCallback(() => {
    setF(defaults);
    setComps([emptyComp(), emptyComp(), emptyComp()]);
  }, []);

  const setComp = useCallback((idx: number, key: keyof CompRow, v: string) => {
    setComps((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: v } : c)));
  }, []);

  const addComp = useCallback(() => setComps((prev) => [...prev, emptyComp()]), []);

  const removeComp = useCallback((idx: number) => {
    setComps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Deal Summary',
      type: 'template',
      sections: [
        {
          heading: 'Property Details',
          rows: [
            { label: 'Address', value: f.address || '---' },
            { label: 'City/State/Zip', value: f.cityStateZip || '---' },
            { label: 'Property Type', value: f.propertyType || '---' },
            { label: 'Beds', value: f.beds || '---' },
            { label: 'Baths', value: f.baths || '---' },
            { label: 'Sq Ft', value: f.sqFt || '---' },
            { label: 'Year Built', value: f.yearBuilt || '---' },
            { label: 'Lot Size', value: f.lotSize || '---' },
          ],
        },
        {
          heading: 'Financial Analysis',
          rows: [
            { label: 'Purchase Price', value: f.purchasePrice ? `$${f.purchasePrice}` : '---' },
            { label: 'ARV / Market Value', value: f.arvMarketValue ? `$${f.arvMarketValue}` : '---' },
            { label: 'Rehab Budget', value: f.rehabBudget ? `$${f.rehabBudget}` : '---' },
            { label: 'Monthly Rent', value: f.monthlyRent ? `$${f.monthlyRent}` : '---' },
            { label: 'Annual NOI', value: f.annualNOI ? `$${f.annualNOI}` : '---' },
            { label: 'Cap Rate', value: capRate || '---' },
          ],
        },
        {
          heading: 'Comparable Sales',
          table: {
            headers: ['Address', 'Bed/Bath', 'Sq Ft', 'Sale Price', 'Date'],
            rows: comps
              .filter((c) => c.address || c.salePrice)
              .map((c) => [c.address, c.bedBath, c.sqFt, c.salePrice ? `$${c.salePrice}` : '', c.date]),
          },
        },
        {
          heading: 'Exit Strategy',
          rows: [
            { label: 'Strategy', value: f.exitStrategy || '---' },
            { label: 'Expected Timeline', value: f.expectedTimeline || '---' },
            { label: 'Target Profit', value: f.targetProfit ? `$${f.targetProfit}` : '---' },
            { label: 'Financing Method', value: f.financingMethod || '---' },
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
            <h2 className="text-2xl font-bold text-gray-900">Deal Summary</h2>
            <p className="mt-1 text-sm text-gray-500">Comprehensive deal analysis worksheet</p>
          </div>
        </div>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
          Reset All
        </button>
      </div>

      <Section title="Property Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <TextInput label="Address" value={f.address} onChange={set('address')} id="ds-address" placeholder="123 Main St" />
          </div>
          <TextInput label="City / State / Zip" value={f.cityStateZip} onChange={set('cityStateZip')} id="ds-csz" placeholder="Tampa, FL 33602" />
          <SelectInput label="Property Type" value={f.propertyType} onChange={set('propertyType')} id="ds-type" options={PROPERTY_TYPES} />
          <TextInput label="Beds" value={f.beds} onChange={set('beds')} id="ds-beds" />
          <TextInput label="Baths" value={f.baths} onChange={set('baths')} id="ds-baths" />
          <TextInput label="Sq Ft" value={f.sqFt} onChange={set('sqFt')} id="ds-sqft" />
          <TextInput label="Year Built" value={f.yearBuilt} onChange={set('yearBuilt')} id="ds-year" />
          <TextInput label="Lot Size" value={f.lotSize} onChange={set('lotSize')} id="ds-lot" placeholder="0.25 acres" />
        </div>
      </Section>

      <Section title="Financial Analysis">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DollarInput label="Purchase Price" value={f.purchasePrice} onChange={set('purchasePrice')} id="ds-price" />
          <DollarInput label="ARV / Market Value" value={f.arvMarketValue} onChange={set('arvMarketValue')} id="ds-arv" />
          <DollarInput label="Rehab Budget" value={f.rehabBudget} onChange={set('rehabBudget')} id="ds-rehab" />
          <DollarInput label="Monthly Rent" value={f.monthlyRent} onChange={set('monthlyRent')} id="ds-rent" />
          <DollarInput label="Annual NOI" value={f.annualNOI} onChange={set('annualNOI')} id="ds-noi" />
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Cap Rate (computed)</span>
            <div className="rounded-lg border border-gray-200 bg-gray-100 py-2 px-3 text-gray-900 font-medium">
              {capRate || 'Enter NOI & Purchase Price'}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Comparable Sales">
        <div className="space-y-3">
          <div className="hidden sm:grid sm:grid-cols-[1fr_0.6fr_0.5fr_0.7fr_0.6fr_auto] gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            <span>Address</span><span>Bed/Bath</span><span>Sq Ft</span><span>Sale Price</span><span>Date</span><span></span>
          </div>
          {comps.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_0.6fr_0.5fr_0.7fr_0.6fr_auto] gap-2 items-end">
              <TextInput label="" value={c.address} onChange={(v) => setComp(i, 'address', v)} id={`ds-comp-addr-${i}`} placeholder="Address" />
              <TextInput label="" value={c.bedBath} onChange={(v) => setComp(i, 'bedBath', v)} id={`ds-comp-bb-${i}`} placeholder="3/2" />
              <TextInput label="" value={c.sqFt} onChange={(v) => setComp(i, 'sqFt', v)} id={`ds-comp-sf-${i}`} placeholder="1,500" />
              <DollarInput label="" value={c.salePrice} onChange={(v) => setComp(i, 'salePrice', v)} id={`ds-comp-sp-${i}`} />
              <TextInput label="" value={c.date} onChange={(v) => setComp(i, 'date', v)} id={`ds-comp-dt-${i}`} placeholder="MM/YYYY" />
              <button
                type="button"
                onClick={() => removeComp(i)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors self-end"
                title="Remove row"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addComp}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0000CC] hover:text-[#0000AA] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Comparable
          </button>
        </div>
      </Section>

      <Section title="Exit Strategy">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput label="Strategy" value={f.exitStrategy} onChange={set('exitStrategy')} id="ds-exit" options={EXIT_STRATEGIES} />
          <TextInput label="Expected Timeline" value={f.expectedTimeline} onChange={set('expectedTimeline')} id="ds-timeline" placeholder="6 months" />
          <DollarInput label="Target Profit" value={f.targetProfit} onChange={set('targetProfit')} id="ds-profit" />
          <TextInput label="Financing Method" value={f.financingMethod} onChange={set('financingMethod')} id="ds-financing" placeholder="Hard money, conventional, etc." />
          <div className="sm:col-span-2">
            <label htmlFor="ds-notes" className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 font-medium">Notes</span>
              <textarea
                id="ds-notes"
                value={f.notes}
                onChange={(e) => set('notes')(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all resize-y"
              />
            </label>
          </div>
        </div>
      </Section>
    </div>
  );
});

export default DealSummary;
