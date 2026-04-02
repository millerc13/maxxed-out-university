'use client';

import { useState, useMemo, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import { formatCurrency, formatPercent } from '@/lib/calc-utils';

/* ------------------------------------------------------------------ */
/*  Inline helper components                                          */
/* ------------------------------------------------------------------ */

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  const [display, setDisplay] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    setDisplay(value === 0 ? '' : String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(display);
    const num = isNaN(parsed) ? 0 : parsed;
    onChange(num);
    if (prefix === '$') {
      setDisplay(num.toLocaleString('en-US'));
    } else {
      setDisplay(String(num));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const displayValue = focused
    ? display
    : prefix === '$'
      ? (value === 0 ? '0' : value.toLocaleString('en-US'))
      : String(value);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={`
            w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm
            focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
            outline-none transition-all
            ${prefix ? 'pl-7' : 'pl-3'}
            ${suffix ? 'pr-8' : 'pr-3'}
          `}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm
          focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
          outline-none transition-all"
      />
    </div>
  );
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {title}
        </h3>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
  large,
}: {
  label: string;
  value: string;
  color?: string;
  large?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${large ? 'py-3' : 'py-2'}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`font-semibold tabular-nums ${large ? 'text-lg' : 'text-sm'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const FixFlipCalculator = forwardRef<ToolHandle>(function FixFlipCalculator(_, ref) {
  // -- Purchase Analysis --
  const [propertyAddress, setPropertyAddress] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [arv, setArv] = useState(0);
  const [holdingPeriodMonths, setHoldingPeriodMonths] = useState(6);

  // -- Rehab Budget --
  const [kitchen, setKitchen] = useState(0);
  const [bathroom, setBathroom] = useState(0);
  const [flooring, setFlooring] = useState(0);
  const [exterior, setExterior] = useState(0);
  const [systemsHvac, setSystemsHvac] = useState(0);
  const [otherRehab, setOtherRehab] = useState(0);

  // -- Holding Costs (monthly) --
  const [monthlyInsurance, setMonthlyInsurance] = useState(0);
  const [monthlyUtilities, setMonthlyUtilities] = useState(0);
  const [monthlyTaxes, setMonthlyTaxes] = useState(0);
  const [monthlyLoanInterest, setMonthlyLoanInterest] = useState(0);

  // -- Selling Costs --
  const [agentCommissionPct, setAgentCommissionPct] = useState(6);
  const [closingCostPct, setClosingCostPct] = useState(2);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  /* ---------------------------------------------------------------- */
  /*  Computed values                                                  */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(() => {
    const totalRehab = kitchen + bathroom + flooring + exterior + systemsHvac + otherRehab;
    const monthlyHolding = monthlyInsurance + monthlyUtilities + monthlyTaxes + monthlyLoanInterest;
    const totalHoldingCosts = monthlyHolding * holdingPeriodMonths;
    const totalSellingCosts = arv * (agentCommissionPct / 100) + arv * (closingCostPct / 100);
    const totalInvestment = purchasePrice + totalRehab + totalHoldingCosts + totalSellingCosts;
    const netProfit = arv - totalInvestment;
    const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0;
    const profitPerMonth = holdingPeriodMonths > 0 ? netProfit / holdingPeriodMonths : 0;
    const seventyPctRule = arv * 0.7 - totalRehab;

    return {
      totalRehab,
      monthlyHolding,
      totalHoldingCosts,
      totalSellingCosts,
      totalInvestment,
      netProfit,
      roi,
      profitPerMonth,
      seventyPctRule,
    };
  }, [
    purchasePrice, arv, holdingPeriodMonths,
    kitchen, bathroom, flooring, exterior, systemsHvac, otherRehab,
    monthlyInsurance, monthlyUtilities, monthlyTaxes, monthlyLoanInterest,
    agentCommissionPct, closingCostPct,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setPropertyAddress(''); setPurchasePrice(0); setArv(0); setHoldingPeriodMonths(6);
    setKitchen(0); setBathroom(0); setFlooring(0); setExterior(0);
    setSystemsHvac(0); setOtherRehab(0);
    setMonthlyInsurance(0); setMonthlyUtilities(0); setMonthlyTaxes(0); setMonthlyLoanInterest(0);
    setAgentCommissionPct(6); setClosingCostPct(2);
  };

  /* ---------------------------------------------------------------- */
  /*  Export                                                           */
  /* ---------------------------------------------------------------- */

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: propertyAddress ? `Fix & Flip Analysis — ${propertyAddress}` : 'Fix & Flip Calculator',
      type: 'calculator',
      sections: [
        {
          heading: 'Purchase Analysis',
          rows: [
            { label: 'Property Address', value: propertyAddress || '-' },
            { label: 'Purchase Price', value: formatCurrency(purchasePrice) },
            { label: 'After Repair Value (ARV)', value: formatCurrency(arv) },
            { label: 'Holding Period', value: `${holdingPeriodMonths} months` },
          ],
        },
        {
          heading: 'Rehab Budget',
          rows: [
            { label: 'Kitchen', value: formatCurrency(kitchen) },
            { label: 'Bathroom', value: formatCurrency(bathroom) },
            { label: 'Flooring', value: formatCurrency(flooring) },
            { label: 'Exterior', value: formatCurrency(exterior) },
            { label: 'Systems / HVAC', value: formatCurrency(systemsHvac) },
            { label: 'Other', value: formatCurrency(otherRehab) },
            { label: 'Total Rehab', value: formatCurrency(computed.totalRehab) },
          ],
        },
        {
          heading: 'Holding Costs',
          rows: [
            { label: 'Monthly Insurance', value: formatCurrency(monthlyInsurance) },
            { label: 'Monthly Utilities', value: formatCurrency(monthlyUtilities) },
            { label: 'Monthly Taxes', value: formatCurrency(monthlyTaxes) },
            { label: 'Monthly Loan Interest', value: formatCurrency(monthlyLoanInterest) },
            { label: 'Total Holding Costs', value: formatCurrency(computed.totalHoldingCosts) },
          ],
        },
        {
          heading: 'Selling Costs',
          rows: [
            { label: 'Agent Commission', value: `${agentCommissionPct}%` },
            { label: 'Closing Costs', value: `${closingCostPct}%` },
            { label: 'Total Selling Costs', value: formatCurrency(computed.totalSellingCosts) },
          ],
        },
        {
          heading: 'Results',
          rows: [
            { label: 'Total Investment', value: formatCurrency(computed.totalInvestment) },
            { label: 'Net Profit', value: formatCurrency(computed.netProfit) },
            { label: 'ROI', value: formatPercent(computed.roi) },
            { label: 'Profit Per Month', value: formatCurrency(computed.profitPerMonth) },
            { label: '70% Rule Max Offer', value: formatCurrency(computed.seventyPctRule) },
          ],
        },
      ],
    }),
  }));

  /* ---------------------------------------------------------------- */
  /*  Results Card                                                     */
  /* ---------------------------------------------------------------- */

  const resultsContent = (
    <div className="space-y-1 divide-y divide-gray-100">
      <div className="pb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Net Profit
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: computed.netProfit >= 0 ? '#16a34a' : '#dc2626' }}
        >
          {formatCurrency(computed.netProfit)}
        </p>
      </div>

      <MetricRow
        label="Total Investment"
        value={formatCurrency(computed.totalInvestment)}
      />
      <MetricRow
        label="Total Rehab"
        value={formatCurrency(computed.totalRehab)}
      />
      <MetricRow
        label="Holding Costs"
        value={formatCurrency(computed.totalHoldingCosts)}
      />
      <MetricRow
        label="Selling Costs"
        value={formatCurrency(computed.totalSellingCosts)}
      />
      <MetricRow
        label="ROI"
        value={formatPercent(computed.roi)}
        color={computed.roi >= 0.15 ? '#16a34a' : computed.roi >= 0.08 ? '#ca8a04' : '#dc2626'}
        large
      />
      <MetricRow
        label="Profit / Month"
        value={formatCurrency(computed.profitPerMonth)}
        color={computed.profitPerMonth > 0 ? '#16a34a' : '#dc2626'}
      />
      <MetricRow
        label="70% Rule Max Offer"
        value={formatCurrency(computed.seventyPctRule)}
        color={purchasePrice <= computed.seventyPctRule && computed.seventyPctRule > 0 ? '#16a34a' : '#ca8a04'}
      />
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Image
          src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
          alt="Maxxed Out"
          width={120}
          height={47}
          className="h-10 w-auto"
        />
        <h2 className="text-2xl font-bold text-gray-900">Fix &amp; Flip Calculator</h2>
      </div>
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Inputs */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Reset */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Reset All
          </button>
        </div>

        {/* Mobile Summary Toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full flex items-center justify-between rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Results Summary
            </span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${mobileSummaryOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileSummaryOpen && (
            <div className="mt-2 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
              {resultsContent}
            </div>
          )}
        </div>

        <Section title="Purchase Analysis">
          <TextInput label="Property Address" value={propertyAddress} onChange={setPropertyAddress} placeholder="123 Main St, City, ST" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
            <NumberInput label="After Repair Value (ARV)" value={arv} onChange={setArv} prefix="$" />
            <NumberInput label="Holding Period" value={holdingPeriodMonths} onChange={setHoldingPeriodMonths} suffix="mo" />
          </div>
        </Section>

        <Section title="Rehab Budget">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label="Kitchen" value={kitchen} onChange={setKitchen} prefix="$" />
            <NumberInput label="Bathroom" value={bathroom} onChange={setBathroom} prefix="$" />
            <NumberInput label="Flooring" value={flooring} onChange={setFlooring} prefix="$" />
            <NumberInput label="Exterior" value={exterior} onChange={setExterior} prefix="$" />
            <NumberInput label="Systems / HVAC" value={systemsHvac} onChange={setSystemsHvac} prefix="$" />
            <NumberInput label="Other" value={otherRehab} onChange={setOtherRehab} prefix="$" />
          </div>
          <div className="mt-2 rounded-lg bg-blue-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Total Rehab</span>
            <span className="text-sm font-bold text-blue-900 tabular-nums">{formatCurrency(computed.totalRehab)}</span>
          </div>
        </Section>

        <Section title="Holding Costs (Monthly)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label="Insurance" value={monthlyInsurance} onChange={setMonthlyInsurance} prefix="$" />
            <NumberInput label="Utilities" value={monthlyUtilities} onChange={setMonthlyUtilities} prefix="$" />
            <NumberInput label="Property Taxes" value={monthlyTaxes} onChange={setMonthlyTaxes} prefix="$" />
            <NumberInput label="Loan Interest" value={monthlyLoanInterest} onChange={setMonthlyLoanInterest} prefix="$" />
          </div>
          <div className="mt-2 rounded-lg bg-blue-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Monthly Total</span>
            <span className="text-sm font-bold text-blue-900 tabular-nums">{formatCurrency(computed.monthlyHolding)}</span>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total ({holdingPeriodMonths} months)</span>
            <span className="text-sm font-bold text-gray-700 tabular-nums">{formatCurrency(computed.totalHoldingCosts)}</span>
          </div>
        </Section>

        <Section title="Selling Costs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label="Agent Commission" value={agentCommissionPct} onChange={setAgentCommissionPct} suffix="%" hint="Applied to ARV" />
            <NumberInput label="Closing Costs" value={closingCostPct} onChange={setClosingCostPct} suffix="%" hint="Applied to ARV" />
          </div>
          <div className="mt-2 rounded-lg bg-blue-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Total Selling Costs</span>
            <span className="text-sm font-bold text-blue-900 tabular-nums">{formatCurrency(computed.totalSellingCosts)}</span>
          </div>
        </Section>
      </div>

      {/* Right: Results Sidebar (desktop) */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-6 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Deal Analysis
          </h3>
          {resultsContent}
        </div>
      </div>
    </div>
    </div>
  );
});

export default FixFlipCalculator;
