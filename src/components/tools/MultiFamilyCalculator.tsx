'use client';

import { useState, useMemo, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import type { CalculatorHandle } from '@/components/tools/ToolWrapper';
import { pmt, formatCurrency, formatPercent } from '@/lib/calc-utils';

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
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  min?: number;
  step?: number;
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

  // Sync display when value changes externally (e.g. reset)
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
          min={min}
          step={step}
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
/*  Investor row type                                                  */
/* ------------------------------------------------------------------ */

interface Investor {
  name: string;
  amount: number;
  rate: number;
}

const EMPTY_INVESTOR: Investor = { name: '', amount: 0, rate: 0 };
const INVESTOR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const MultiFamilyCalculator = forwardRef<CalculatorHandle>(function MultiFamilyCalculator(_, ref) {
  // -- Property Info --
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [units, setUnits] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);

  // -- Income --
  const [gpri, setGpri] = useState(0);
  const [vacancyPct, setVacancyPct] = useState(5);
  const [vacancyDollar, setVacancyDollar] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);

  // -- Expenses --
  const [expenseDollar, setExpenseDollar] = useState(0);
  const [expenseRatio, setExpenseRatio] = useState(50);

  // -- Primary Financing --
  const [primaryLoan, setPrimaryLoan] = useState(0);
  const [primaryRate, setPrimaryRate] = useState(0);
  const [primaryTerm, setPrimaryTerm] = useState(30);
  const [primaryAmort, setPrimaryAmort] = useState(30);
  const [primaryPeriods, setPrimaryPeriods] = useState(12);
  const [primaryIO, setPrimaryIO] = useState(false);

  // -- Secondary Financing --
  const [secondaryLoan, setSecondaryLoan] = useState(0);
  const [secondaryRate, setSecondaryRate] = useState(0);
  const [secondaryTerm, setSecondaryTerm] = useState(30);
  const [secondaryAmort, setSecondaryAmort] = useState(30);
  const [secondaryPeriods, setSecondaryPeriods] = useState(12);
  const [secondaryIO, setSecondaryIO] = useState(false);

  // -- Closing & Other --
  const [closingPct, setClosingPct] = useState(2);
  const [rentProrations, setRentProrations] = useState(0);
  const [capExFund, setCapExFund] = useState(0);
  const [mortgageReserves, setMortgageReserves] = useState(0);

  // -- Investors --
  const [investors, setInvestors] = useState<Investor[]>(
    Array.from({ length: 8 }, () => ({ ...EMPTY_INVESTOR })),
  );

  // -- Market cap rate for valuation --
  const [marketCapRate, setMarketCapRate] = useState(7);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  const updateInvestor = useCallback(
    (idx: number, field: keyof Investor, val: string | number) => {
      setInvestors((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: val };
        return next;
      });
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Computed values                                                  */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(() => {
    // Income
    const vacancyAmount = Math.max(vacancyDollar, gpri * vacancyPct / 100);
    const egi = gpri - vacancyAmount + otherIncome;

    // Expenses — use whichever is larger
    const expenseFromRatio = egi * expenseRatio / 100;
    const expenseAmount = Math.max(expenseDollar, expenseFromRatio);
    const expensesPerUnit = units > 0 ? expenseAmount / units : 0;

    // NOI
    const noi = egi - expenseAmount;

    // Cap Rate
    const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;

    // Market Value
    const marketValue = marketCapRate > 0 ? noi / (marketCapRate / 100) : 0;

    // Primary financing
    let primaryMonthly = 0;
    if (primaryLoan > 0 && primaryRate > 0) {
      if (primaryIO) {
        primaryMonthly = primaryLoan * (primaryRate / 100) / primaryPeriods;
      } else {
        const monthlyRate = primaryRate / 100 / primaryPeriods;
        const totalPayments = primaryAmort * primaryPeriods;
        primaryMonthly = pmt(monthlyRate, totalPayments, primaryLoan);
      }
    }

    // Secondary financing
    let secondaryMonthly = 0;
    if (secondaryLoan > 0 && secondaryRate > 0) {
      if (secondaryIO) {
        secondaryMonthly = secondaryLoan * (secondaryRate / 100) / secondaryPeriods;
      } else {
        const monthlyRate = secondaryRate / 100 / secondaryPeriods;
        const totalPayments = secondaryAmort * secondaryPeriods;
        secondaryMonthly = pmt(monthlyRate, totalPayments, secondaryLoan);
      }
    }

    const totalMonthly = primaryMonthly + secondaryMonthly;
    const annualDebtService = totalMonthly * 12;

    // Cash Flow
    const cashFlow = noi - annualDebtService;

    // DSCR
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

    // Down Payment
    const downPayment = purchasePrice - primaryLoan - secondaryLoan;

    // Closing costs
    const closingCosts = purchasePrice * closingPct / 100;

    // Investors
    const investorTotal = investors.reduce((sum, inv) => sum + inv.amount, 0);
    const investorReturns = investors.map(
      (inv) => inv.amount * inv.rate / 100,
    );
    const totalInvestorReturn = investorReturns.reduce((s, r) => s + r, 0);

    // Total cash invested
    const totalCashInvested = downPayment + closingCosts + rentProrations + capExFund + mortgageReserves;

    // Cash-on-Cash
    const cashOnCash = totalCashInvested > 0 ? cashFlow / totalCashInvested : 0;

    // Break Even Ratio
    const breakEven = egi > 0 ? (annualDebtService + expenseAmount) / egi : 0;

    // CLTV
    const cltv = purchasePrice > 0 ? (primaryLoan + secondaryLoan) / purchasePrice : 0;

    // Loan Constant (primary)
    const loanConstant = primaryLoan > 0 ? (primaryMonthly * 12) / primaryLoan : 0;

    // Price per unit
    const pricePerUnit = units > 0 ? purchasePrice / units : 0;

    return {
      vacancyAmount,
      egi,
      expenseAmount,
      expensesPerUnit,
      noi,
      capRate,
      marketValue,
      primaryMonthly,
      secondaryMonthly,
      totalMonthly,
      annualDebtService,
      cashFlow,
      dscr,
      downPayment,
      closingCosts,
      investorTotal,
      investorReturns,
      totalInvestorReturn,
      totalCashInvested,
      cashOnCash,
      breakEven,
      cltv,
      loanConstant,
      pricePerUnit,
    };
  }, [
    gpri, vacancyPct, vacancyDollar, otherIncome,
    expenseDollar, expenseRatio, units, purchasePrice,
    marketCapRate,
    primaryLoan, primaryRate, primaryTerm, primaryAmort, primaryPeriods, primaryIO,
    secondaryLoan, secondaryRate, secondaryTerm, secondaryAmort, secondaryPeriods, secondaryIO,
    closingPct, rentProrations, capExFund, mortgageReserves,
    investors,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setPropertyName(''); setAddress(''); setUnits(0); setPurchasePrice(0);
    setGpri(0); setVacancyPct(5); setVacancyDollar(0); setOtherIncome(0);
    setExpenseDollar(0); setExpenseRatio(50);
    setPrimaryLoan(0); setPrimaryRate(0); setPrimaryTerm(30); setPrimaryAmort(30);
    setPrimaryPeriods(12); setPrimaryIO(false);
    setSecondaryLoan(0); setSecondaryRate(0); setSecondaryTerm(30); setSecondaryAmort(30);
    setSecondaryPeriods(12); setSecondaryIO(false);
    setClosingPct(2); setRentProrations(0); setCapExFund(0); setMortgageReserves(0);
    setInvestors(Array.from({ length: 8 }, () => ({ ...EMPTY_INVESTOR })));
    setMarketCapRate(7);
  };

  useImperativeHandle(ref, () => ({
    getState: () => ({
      inputs: {
        propertyName, address, units, purchasePrice,
        gpri, vacancyPct, vacancyDollar, otherIncome,
        expenseDollar, expenseRatio,
        primaryLoan, primaryRate, primaryTerm, primaryAmort, primaryPeriods, primaryIO,
        secondaryLoan, secondaryRate, secondaryTerm, secondaryAmort, secondaryPeriods, secondaryIO,
        closingPct, rentProrations, capExFund, mortgageReserves,
        investors, marketCapRate,
      },
      results: {
        noi: computed.noi,
        capRate: computed.capRate,
        cashFlow: computed.cashFlow,
        dscr: computed.dscr,
        cashOnCash: computed.cashOnCash,
        marketValue: computed.marketValue,
        totalMonthly: computed.totalMonthly,
      },
    }),
    loadState: (inputs: Record<string, any>) => {
      if (inputs.propertyName !== undefined) setPropertyName(inputs.propertyName);
      if (inputs.address !== undefined) setAddress(inputs.address);
      if (inputs.units !== undefined) setUnits(inputs.units);
      if (inputs.purchasePrice !== undefined) setPurchasePrice(inputs.purchasePrice);
      if (inputs.gpri !== undefined) setGpri(inputs.gpri);
      if (inputs.vacancyPct !== undefined) setVacancyPct(inputs.vacancyPct);
      if (inputs.vacancyDollar !== undefined) setVacancyDollar(inputs.vacancyDollar);
      if (inputs.otherIncome !== undefined) setOtherIncome(inputs.otherIncome);
      if (inputs.expenseDollar !== undefined) setExpenseDollar(inputs.expenseDollar);
      if (inputs.expenseRatio !== undefined) setExpenseRatio(inputs.expenseRatio);
      if (inputs.primaryLoan !== undefined) setPrimaryLoan(inputs.primaryLoan);
      if (inputs.primaryRate !== undefined) setPrimaryRate(inputs.primaryRate);
      if (inputs.primaryTerm !== undefined) setPrimaryTerm(inputs.primaryTerm);
      if (inputs.primaryAmort !== undefined) setPrimaryAmort(inputs.primaryAmort);
      if (inputs.primaryPeriods !== undefined) setPrimaryPeriods(inputs.primaryPeriods);
      if (inputs.primaryIO !== undefined) setPrimaryIO(inputs.primaryIO);
      if (inputs.secondaryLoan !== undefined) setSecondaryLoan(inputs.secondaryLoan);
      if (inputs.secondaryRate !== undefined) setSecondaryRate(inputs.secondaryRate);
      if (inputs.secondaryTerm !== undefined) setSecondaryTerm(inputs.secondaryTerm);
      if (inputs.secondaryAmort !== undefined) setSecondaryAmort(inputs.secondaryAmort);
      if (inputs.secondaryPeriods !== undefined) setSecondaryPeriods(inputs.secondaryPeriods);
      if (inputs.secondaryIO !== undefined) setSecondaryIO(inputs.secondaryIO);
      if (inputs.closingPct !== undefined) setClosingPct(inputs.closingPct);
      if (inputs.rentProrations !== undefined) setRentProrations(inputs.rentProrations);
      if (inputs.capExFund !== undefined) setCapExFund(inputs.capExFund);
      if (inputs.mortgageReserves !== undefined) setMortgageReserves(inputs.mortgageReserves);
      if (inputs.investors) setInvestors(inputs.investors);
      if (inputs.marketCapRate !== undefined) setMarketCapRate(inputs.marketCapRate);
    },
    getName: () => propertyName || 'Untitled Report',
  }));

  /* ---------------------------------------------------------------- */
  /*  Results Card (shared between desktop sidebar and mobile top)     */
  /* ---------------------------------------------------------------- */

  const resultsContent = (
    <div className="space-y-1 divide-y divide-gray-100">
      {/* NOI */}
      <div className="pb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Net Operating Income
        </p>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(computed.noi)}
        </p>
      </div>

      <MetricRow
        label="Cap Rate"
        value={formatPercent(computed.capRate)}
        color={rateColor(computed.capRate * 100, 7, 5)}
      />
      <MetricRow
        label="Market Value"
        value={formatCurrency(computed.marketValue)}
      />

      <div className="pt-1">
        <div className="py-2">
          <label className="text-xs text-gray-400">Market Cap Rate</label>
          <NumberInput
            label=""
            value={marketCapRate}
            onChange={setMarketCapRate}
            suffix="%"
          />
        </div>
      </div>

      <MetricRow
        label="Monthly Payment"
        value={formatCurrency(computed.totalMonthly)}
      />
      <MetricRow
        label="Annual Debt Service"
        value={formatCurrency(computed.annualDebtService)}
      />
      <MetricRow
        label="Cash Flow"
        value={formatCurrency(computed.cashFlow)}
        color={computed.cashFlow >= 0 ? '#16a34a' : '#dc2626'}
        large
      />
      <MetricRow
        label="DSCR"
        value={computed.dscr.toFixed(2)}
        color={rateColor(computed.dscr, 1.25, 1.0)}
      />
      <MetricRow
        label="Cash-on-Cash"
        value={formatPercent(computed.cashOnCash)}
        color={rateColor(computed.cashOnCash * 100, 10, 6)}
      />
      <MetricRow
        label="Down Payment"
        value={formatCurrency(computed.downPayment)}
      />
      <MetricRow
        label="Total Cash Invested"
        value={formatCurrency(computed.totalCashInvested)}
      />
      <MetricRow
        label="Break Even Ratio"
        value={formatPercent(computed.breakEven)}
        color={rateColor(computed.breakEven * 100, 85, 95, true)}
      />
      <MetricRow
        label="CLTV"
        value={formatPercent(computed.cltv)}
      />
      <MetricRow
        label="Loan Constant"
        value={formatPercent(computed.loanConstant)}
      />
      <MetricRow
        label="Price Per Unit"
        value={formatCurrency(computed.pricePerUnit)}
      />

      {computed.investorTotal > 0 && (
        <>
          <MetricRow
            label="Investor Capital"
            value={formatCurrency(computed.investorTotal)}
          />
          <MetricRow
            label="Investor Annual Return"
            value={formatCurrency(computed.totalInvestorReturn)}
          />
        </>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Toggle component for financing type                              */
  /* ---------------------------------------------------------------- */

  function FinancingToggle({
    interestOnly,
    onToggle,
  }: {
    interestOnly: boolean;
    onToggle: (v: boolean) => void;
  }) {
    return (
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`flex-1 px-3 py-1.5 font-medium transition-colors ${
            !interestOnly
              ? 'bg-[#0000CC] text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Fully Amortizing
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`flex-1 px-3 py-1.5 font-medium transition-colors ${
            interestOnly
              ? 'bg-[#0000CC] text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Interest Only
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Multi-Family Investment Calculator
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analyze rental property deals with detailed income, expense, and financing projections.
          </p>
        </div>

        {/* Mobile Results Summary */}
        <div className="lg:hidden mb-6">
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
              className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Key Results
                </h3>
                <span className="text-lg font-bold text-[#0000CC] tabular-nums">
                  {formatCurrency(computed.noi)}
                </span>
              </div>
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
              <div className="px-5 pb-5">{resultsContent}</div>
            )}
          </div>
        </div>

        <div className="flex gap-8 items-start">
          {/* Left column — Inputs */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* 1. Property Info */}
            <Section title="Property Info">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="Property Name" value={propertyName} onChange={setPropertyName} placeholder="e.g. Sunset Apartments" />
                <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, ST" />
                <NumberInput label="Number of Units" value={units} onChange={setUnits} min={0} />
                <NumberInput label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
              </div>
            </Section>

            {/* 2. Income */}
            <Section title="Income">
              <NumberInput label="Gross Potential Rental Income (Annual)" value={gpri} onChange={setGpri} prefix="$" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Vacancy %" value={vacancyPct} onChange={setVacancyPct} suffix="%" hint="Uses whichever is larger: % or $" />
                <NumberInput label="Vacancy $" value={vacancyDollar} onChange={setVacancyDollar} prefix="$" />
              </div>
              <NumberInput label="Other Income" value={otherIncome} onChange={setOtherIncome} prefix="$" hint="Laundry, late fees, parking, etc." />
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Effective Gross Income (EGI)</span>
                  <span className="text-sm font-bold text-blue-900 tabular-nums">{formatCurrency(computed.egi)}</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Vacancy applied: {formatCurrency(computed.vacancyAmount)}
                </p>
              </div>
            </Section>

            {/* 3. Expenses */}
            <Section title="Expenses">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Total Operating Expenses" value={expenseDollar} onChange={setExpenseDollar} prefix="$" hint="Uses whichever is larger: $ or %" />
                <NumberInput label="Operating Ratio" value={expenseRatio} onChange={setExpenseRatio} suffix="%" />
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expenses Applied</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(computed.expenseAmount)}</span>
                </div>
                {units > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">Expenses Per Unit</span>
                    <span className="text-xs font-medium text-gray-500 tabular-nums">{formatCurrency(computed.expensesPerUnit)}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* 4. Primary Financing */}
            <Section title="Primary Financing">
              <NumberInput label="Loan Amount" value={primaryLoan} onChange={setPrimaryLoan} prefix="$" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Interest Rate" value={primaryRate} onChange={setPrimaryRate} suffix="%" step={0.125} />
                <NumberInput label="Term (years)" value={primaryTerm} onChange={setPrimaryTerm} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Amortization (years)" value={primaryAmort} onChange={setPrimaryAmort} />
                <NumberInput label="Periods Per Year" value={primaryPeriods} onChange={setPrimaryPeriods} />
              </div>
              <FinancingToggle interestOnly={primaryIO} onToggle={setPrimaryIO} />
              {primaryLoan > 0 && primaryRate > 0 && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">Monthly Payment</span>
                    <span className="text-sm font-bold text-green-900 tabular-nums">{formatCurrency(computed.primaryMonthly)}</span>
                  </div>
                </div>
              )}
            </Section>

            {/* 5. Secondary Financing */}
            <Section title="Secondary Financing" defaultOpen={false}>
              <NumberInput label="Loan Amount" value={secondaryLoan} onChange={setSecondaryLoan} prefix="$" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Interest Rate" value={secondaryRate} onChange={setSecondaryRate} suffix="%" step={0.125} />
                <NumberInput label="Term (years)" value={secondaryTerm} onChange={setSecondaryTerm} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Amortization (years)" value={secondaryAmort} onChange={setSecondaryAmort} />
                <NumberInput label="Periods Per Year" value={secondaryPeriods} onChange={setSecondaryPeriods} />
              </div>
              <FinancingToggle interestOnly={secondaryIO} onToggle={setSecondaryIO} />
              {secondaryLoan > 0 && secondaryRate > 0 && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">Monthly Payment</span>
                    <span className="text-sm font-bold text-green-900 tabular-nums">{formatCurrency(computed.secondaryMonthly)}</span>
                  </div>
                </div>
              )}
            </Section>

            {/* 6. Closing & Other Costs */}
            <Section title="Closing & Other Costs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Closing Cost %" value={closingPct} onChange={setClosingPct} suffix="%" />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Closing Cost $</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-100 py-2 px-3 text-sm text-gray-600 tabular-nums">
                    {formatCurrency(computed.closingCosts)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberInput label="Rent Prorations" value={rentProrations} onChange={setRentProrations} prefix="$" />
                <NumberInput label="CapEx Fund" value={capExFund} onChange={setCapExFund} prefix="$" />
                <NumberInput label="Mortgage Reserves" value={mortgageReserves} onChange={setMortgageReserves} prefix="$" />
              </div>
            </Section>

            {/* 7. Investors */}
            <Section title="Investors" defaultOpen={false}>
              <div className="space-y-3">
                {investors.map((inv, idx) => (
                  <div key={idx} className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-3 items-end">
                    <span className="text-sm font-medium text-gray-400 pb-2">
                      {INVESTOR_LABELS[idx]}
                    </span>
                    <TextInput
                      label={idx === 0 ? 'Name' : ''}
                      value={inv.name}
                      onChange={(v) => updateInvestor(idx, 'name', v)}
                      placeholder="Name"
                    />
                    <NumberInput
                      label={idx === 0 ? 'Amount' : ''}
                      value={inv.amount}
                      onChange={(v) => updateInvestor(idx, 'amount', v)}
                      prefix="$"
                    />
                    <div>
                      <NumberInput
                        label={idx === 0 ? 'Rate of Return' : ''}
                        value={inv.rate}
                        onChange={(v) => updateInvestor(idx, 'rate', v)}
                        suffix="%"
                      />
                      {inv.amount > 0 && inv.rate > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                          = {formatCurrency(computed.investorReturns[idx])}/yr
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {computed.investorTotal > 0 && (
                <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-900">Total Investor Capital</span>
                    <span className="text-sm font-bold text-purple-900 tabular-nums">{formatCurrency(computed.investorTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-purple-600">Total Annual Returns</span>
                    <span className="text-xs font-medium text-purple-700 tabular-nums">{formatCurrency(computed.totalInvestorReturn)}</span>
                  </div>
                </div>
              )}
            </Section>

            {/* Reset */}
            <div className="flex justify-end pb-8">
              <button
                type="button"
                onClick={resetAll}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700
                  hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Right sidebar — Results (desktop) */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-8 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 bg-[#0000CC]">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Key Results
                </h3>
              </div>
              <div className="px-5 py-4">{resultsContent}</div>
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={resetAll}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600
                    hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MultiFamilyCalculator;
