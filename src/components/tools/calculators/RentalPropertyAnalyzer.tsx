'use client';

import { useState, useMemo, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import { pmt, formatCurrency, formatCurrencyDetailed, formatPercent } from '@/lib/calc-utils';

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

function rateColor(value: number, green: number, yellow: number, invert = false) {
  if (invert) {
    if (value <= yellow) return '#16a34a';
    if (value <= green) return '#ca8a04';
    return '#dc2626';
  }
  if (value >= green) return '#16a34a';
  if (value >= yellow) return '#ca8a04';
  return '#dc2626';
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const RentalPropertyAnalyzer = forwardRef<ToolHandle>(function RentalPropertyAnalyzer(_, ref) {
  // -- Property --
  const [address, setAddress] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [downPaymentPct, setDownPaymentPct] = useState(25);
  const [units, setUnits] = useState(1);

  // -- Income --
  const [monthlyRentPerUnit, setMonthlyRentPerUnit] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [vacancyPct, setVacancyPct] = useState(5);

  // -- Expenses --
  const [propertyTax, setPropertyTax] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [maintenance, setMaintenance] = useState(0);
  const [managementPct, setManagementPct] = useState(10);
  const [utilities, setUtilities] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);

  // -- Financing --
  const [interestRate, setInterestRate] = useState(7);
  const [loanTermYears, setLoanTermYears] = useState(30);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  /* ---------------------------------------------------------------- */
  /*  Computed values                                                  */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(() => {
    const grossRent = monthlyRentPerUnit * units * 12;
    const grossIncome = grossRent + otherIncome * 12;
    const vacancyLoss = grossIncome * (vacancyPct / 100);
    const egi = grossIncome - vacancyLoss;

    const managementFee = egi * (managementPct / 100);
    const totalExpenses = propertyTax + insurance + maintenance + managementFee + utilities + otherExpenses;
    const annualExpenses = totalExpenses * 12;

    // Use annual values: propertyTax/insurance/maintenance/utilities/otherExpenses are monthly inputs
    // Actually let's clarify: these are annual amounts
    // Re-reading spec: "property tax, insurance, maintenance, management %, utilities, other" - typically annual
    // Let's treat them as annual for simplicity
    const annualExpensesTotal = propertyTax + insurance + maintenance + managementFee + utilities + otherExpenses;
    const noi = egi - annualExpensesTotal;

    const downPayment = purchasePrice * (downPaymentPct / 100);
    const loanAmount = purchasePrice - downPayment;

    let monthlyDebtService = 0;
    if (loanAmount > 0 && interestRate > 0 && loanTermYears > 0) {
      const monthlyRate = interestRate / 100 / 12;
      const totalPayments = loanTermYears * 12;
      monthlyDebtService = pmt(monthlyRate, totalPayments, loanAmount);
    }
    const annualDebtService = monthlyDebtService * 12;

    const cashFlow = noi - annualDebtService;
    const monthlyCashFlow = cashFlow / 12;
    const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
    const cashOnCash = downPayment > 0 ? cashFlow / downPayment : 0;
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
    const pricePerUnit = units > 0 ? purchasePrice / units : 0;
    const grm = grossRent > 0 ? purchasePrice / grossRent : 0;
    const expenseRatio = egi > 0 ? annualExpensesTotal / egi : 0;

    return {
      grossRent,
      grossIncome,
      vacancyLoss,
      egi,
      managementFee,
      annualExpensesTotal,
      noi,
      downPayment,
      loanAmount,
      monthlyDebtService,
      annualDebtService,
      cashFlow,
      monthlyCashFlow,
      capRate,
      cashOnCash,
      dscr,
      pricePerUnit,
      grm,
      expenseRatio,
    };
  }, [
    purchasePrice, downPaymentPct, units,
    monthlyRentPerUnit, otherIncome, vacancyPct,
    propertyTax, insurance, maintenance, managementPct, utilities, otherExpenses,
    interestRate, loanTermYears,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setAddress(''); setPurchasePrice(0); setDownPaymentPct(25); setUnits(1);
    setMonthlyRentPerUnit(0); setOtherIncome(0); setVacancyPct(5);
    setPropertyTax(0); setInsurance(0); setMaintenance(0); setManagementPct(10);
    setUtilities(0); setOtherExpenses(0);
    setInterestRate(7); setLoanTermYears(30);
  };

  /* ---------------------------------------------------------------- */
  /*  Export                                                           */
  /* ---------------------------------------------------------------- */

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: address ? `Rental Property Analysis — ${address}` : 'Rental Property Analyzer',
      type: 'calculator',
      sections: [
        {
          heading: 'Property Information',
          rows: [
            { label: 'Address', value: address || '-' },
            { label: 'Purchase Price', value: formatCurrency(purchasePrice) },
            { label: 'Down Payment', value: `${downPaymentPct}% (${formatCurrency(computed.downPayment)})` },
            { label: 'Units', value: String(units) },
            { label: 'Price Per Unit', value: formatCurrency(computed.pricePerUnit) },
          ],
        },
        {
          heading: 'Income',
          rows: [
            { label: 'Monthly Rent Per Unit', value: formatCurrency(monthlyRentPerUnit) },
            { label: 'Other Monthly Income', value: formatCurrency(otherIncome) },
            { label: 'Vacancy Rate', value: `${vacancyPct}%` },
            { label: 'Gross Scheduled Rent', value: formatCurrency(computed.grossRent) },
            { label: 'Effective Gross Income', value: formatCurrency(computed.egi) },
          ],
        },
        {
          heading: 'Expenses (Annual)',
          rows: [
            { label: 'Property Tax', value: formatCurrency(propertyTax) },
            { label: 'Insurance', value: formatCurrency(insurance) },
            { label: 'Maintenance', value: formatCurrency(maintenance) },
            { label: 'Management Fee', value: formatCurrency(computed.managementFee) },
            { label: 'Utilities', value: formatCurrency(utilities) },
            { label: 'Other', value: formatCurrency(otherExpenses) },
            { label: 'Total Expenses', value: formatCurrency(computed.annualExpensesTotal) },
          ],
        },
        {
          heading: 'Financing',
          rows: [
            { label: 'Loan Amount', value: formatCurrency(computed.loanAmount) },
            { label: 'Interest Rate', value: `${interestRate}%` },
            { label: 'Loan Term', value: `${loanTermYears} years` },
            { label: 'Monthly Debt Service', value: formatCurrencyDetailed(computed.monthlyDebtService) },
            { label: 'Annual Debt Service', value: formatCurrency(computed.annualDebtService) },
          ],
        },
        {
          heading: 'Key Metrics',
          rows: [
            { label: 'NOI', value: formatCurrency(computed.noi) },
            { label: 'Annual Cash Flow', value: formatCurrency(computed.cashFlow) },
            { label: 'Monthly Cash Flow', value: formatCurrency(computed.monthlyCashFlow) },
            { label: 'Cap Rate', value: formatPercent(computed.capRate) },
            { label: 'Cash-on-Cash Return', value: formatPercent(computed.cashOnCash) },
            { label: 'DSCR', value: computed.dscr.toFixed(2) },
            { label: 'GRM', value: computed.grm.toFixed(2) },
            { label: 'Expense Ratio', value: formatPercent(computed.expenseRatio) },
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
          Monthly Cash Flow
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: computed.monthlyCashFlow >= 0 ? '#16a34a' : '#dc2626' }}
        >
          {formatCurrency(computed.monthlyCashFlow)}
        </p>
      </div>

      <MetricRow label="NOI" value={formatCurrency(computed.noi)} />
      <MetricRow
        label="Cap Rate"
        value={formatPercent(computed.capRate)}
        color={rateColor(computed.capRate * 100, 7, 5)}
      />
      <MetricRow
        label="Cash-on-Cash"
        value={formatPercent(computed.cashOnCash)}
        color={rateColor(computed.cashOnCash * 100, 10, 6)}
        large
      />
      <MetricRow
        label="DSCR"
        value={computed.dscr.toFixed(2)}
        color={rateColor(computed.dscr, 1.25, 1.0)}
      />
      <MetricRow label="EGI" value={formatCurrency(computed.egi)} />
      <MetricRow label="Total Expenses" value={formatCurrency(computed.annualExpensesTotal)} />
      <MetricRow
        label="Expense Ratio"
        value={formatPercent(computed.expenseRatio)}
        color={rateColor(computed.expenseRatio * 100, 50, 60, true)}
      />
      <MetricRow label="Monthly Payment" value={formatCurrencyDetailed(computed.monthlyDebtService)} />
      <MetricRow
        label="Annual Cash Flow"
        value={formatCurrency(computed.cashFlow)}
        color={computed.cashFlow >= 0 ? '#16a34a' : '#dc2626'}
      />
      <MetricRow label="GRM" value={computed.grm.toFixed(2)} />
      <MetricRow label="Price Per Unit" value={formatCurrency(computed.pricePerUnit)} />
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
          className="h-10 w-auto hidden sm:block"
        />
        <h2 className="text-2xl font-bold text-gray-900">Rental Property Analyzer</h2>
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

        <Section title="Property Information">
          <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, ST" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
            <NumberInput label="Down Payment" value={downPaymentPct} onChange={setDownPaymentPct} suffix="%" />
            <NumberInput label="Number of Units" value={units} onChange={setUnits} />
          </div>
          {computed.downPayment > 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-2 flex justify-between items-center">
              <span className="text-sm text-gray-500">Down Payment Amount</span>
              <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatCurrency(computed.downPayment)}</span>
            </div>
          )}
        </Section>

        <Section title="Income">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput label="Monthly Rent / Unit" value={monthlyRentPerUnit} onChange={setMonthlyRentPerUnit} prefix="$" />
            <NumberInput label="Other Monthly Income" value={otherIncome} onChange={setOtherIncome} prefix="$" />
            <NumberInput label="Vacancy Rate" value={vacancyPct} onChange={setVacancyPct} suffix="%" />
          </div>
          <div className="mt-2 rounded-lg bg-blue-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Gross Scheduled Rent</span>
            <span className="text-sm font-bold text-blue-900 tabular-nums">{formatCurrency(computed.grossRent)}</span>
          </div>
          <div className="rounded-lg bg-green-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-green-900">Effective Gross Income</span>
            <span className="text-sm font-bold text-green-900 tabular-nums">{formatCurrency(computed.egi)}</span>
          </div>
        </Section>

        <Section title="Annual Expenses">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label="Property Tax" value={propertyTax} onChange={setPropertyTax} prefix="$" hint="Annual" />
            <NumberInput label="Insurance" value={insurance} onChange={setInsurance} prefix="$" hint="Annual" />
            <NumberInput label="Maintenance" value={maintenance} onChange={setMaintenance} prefix="$" hint="Annual" />
            <NumberInput label="Management Fee" value={managementPct} onChange={setManagementPct} suffix="%" hint="% of EGI" />
            <NumberInput label="Utilities" value={utilities} onChange={setUtilities} prefix="$" hint="Annual" />
            <NumberInput label="Other" value={otherExpenses} onChange={setOtherExpenses} prefix="$" hint="Annual" />
          </div>
          <div className="mt-2 rounded-lg bg-blue-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Total Annual Expenses</span>
            <span className="text-sm font-bold text-blue-900 tabular-nums">{formatCurrency(computed.annualExpensesTotal)}</span>
          </div>
        </Section>

        <Section title="Financing">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" />
            <NumberInput label="Loan Term" value={loanTermYears} onChange={setLoanTermYears} suffix="yrs" />
          </div>
          <div className="mt-2 rounded-lg bg-gray-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Loan Amount</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatCurrency(computed.loanAmount)}</span>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Payment</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatCurrencyDetailed(computed.monthlyDebtService)}</span>
          </div>
        </Section>
      </div>

      {/* Right: Results Sidebar (desktop) */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-6 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Property Analysis
          </h3>
          {resultsContent}
        </div>
      </div>
    </div>
    </div>
  );
});

export default RentalPropertyAnalyzer;
