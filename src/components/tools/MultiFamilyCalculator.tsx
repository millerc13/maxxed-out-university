'use client';

import { useState, useMemo, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
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
/*  Per-year state type                                                */
/* ------------------------------------------------------------------ */

interface YearState {
  gpri: number;
  vacancyPct: number;
  vacancyDollar: number;
  otherIncome: number;
  expenseDollar: number;
  expenseRatio: number;
  primaryLoan: number;
  primaryRate: number;
  primaryTerm: number;
  primaryAmort: number;
  primaryPeriods: number;
  primaryIO: boolean;
  secondaryLoan: number;
  secondaryRate: number;
  secondaryTerm: number;
  secondaryAmort: number;
  secondaryPeriods: number;
  secondaryIO: boolean;
  closingPct: number;
  rentProrations: number;
  capExFund: number;
  mortgageReserves: number;
  investors: Investor[];
  marketCapRate: number;
}

function defaultYearState(): YearState {
  return {
    gpri: 0, vacancyPct: 5, vacancyDollar: 0, otherIncome: 0,
    expenseDollar: 0, expenseRatio: 50,
    primaryLoan: 0, primaryRate: 0, primaryTerm: 30, primaryAmort: 30,
    primaryPeriods: 12, primaryIO: false,
    secondaryLoan: 0, secondaryRate: 0, secondaryTerm: 30, secondaryAmort: 30,
    secondaryPeriods: 12, secondaryIO: false,
    closingPct: 2, rentProrations: 0, capExFund: 0, mortgageReserves: 0,
    investors: Array.from({ length: 8 }, () => ({ ...EMPTY_INVESTOR })),
    marketCapRate: 7,
  };
}

/* ------------------------------------------------------------------ */
/*  Compute results for a given year state + shared property info      */
/* ------------------------------------------------------------------ */

interface ComputedResults {
  vacancyAmount: number;
  egi: number;
  expenseAmount: number;
  expensesPerUnit: number;
  noi: number;
  capRate: number;
  marketValue: number;
  primaryMonthly: number;
  secondaryMonthly: number;
  totalMonthly: number;
  annualDebtService: number;
  cashFlow: number;
  dscr: number;
  downPayment: number;
  closingCosts: number;
  investorTotal: number;
  investorReturns: number[];
  totalInvestorReturn: number;
  totalCashInvested: number;
  cashOnCash: number;
  breakEven: number;
  cltv: number;
  loanConstant: number;
  pricePerUnit: number;
}

function computeYear(y: YearState, units: number, purchasePrice: number): ComputedResults {
  const vacancyAmount = Math.max(y.vacancyDollar, y.gpri * y.vacancyPct / 100);
  const egi = y.gpri - vacancyAmount + y.otherIncome;

  const expenseFromRatio = egi * y.expenseRatio / 100;
  const expenseAmount = Math.max(y.expenseDollar, expenseFromRatio);
  const expensesPerUnit = units > 0 ? expenseAmount / units : 0;

  const noi = egi - expenseAmount;
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
  const marketValue = y.marketCapRate > 0 ? noi / (y.marketCapRate / 100) : 0;

  let primaryMonthly = 0;
  if (y.primaryLoan > 0 && y.primaryRate > 0) {
    if (y.primaryIO) {
      primaryMonthly = y.primaryLoan * (y.primaryRate / 100) / y.primaryPeriods;
    } else {
      const monthlyRate = y.primaryRate / 100 / y.primaryPeriods;
      const totalPayments = y.primaryAmort * y.primaryPeriods;
      primaryMonthly = pmt(monthlyRate, totalPayments, y.primaryLoan);
    }
  }

  let secondaryMonthly = 0;
  if (y.secondaryLoan > 0 && y.secondaryRate > 0) {
    if (y.secondaryIO) {
      secondaryMonthly = y.secondaryLoan * (y.secondaryRate / 100) / y.secondaryPeriods;
    } else {
      const monthlyRate = y.secondaryRate / 100 / y.secondaryPeriods;
      const totalPayments = y.secondaryAmort * y.secondaryPeriods;
      secondaryMonthly = pmt(monthlyRate, totalPayments, y.secondaryLoan);
    }
  }

  const totalMonthly = primaryMonthly + secondaryMonthly;
  const annualDebtService = totalMonthly * 12;
  const cashFlow = noi - annualDebtService;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const downPayment = purchasePrice - y.primaryLoan - y.secondaryLoan;
  const closingCosts = purchasePrice * y.closingPct / 100;

  const investorTotal = y.investors.reduce((sum, inv) => sum + inv.amount, 0);
  const investorReturns = y.investors.map((inv) => inv.amount * inv.rate / 100);
  const totalInvestorReturn = investorReturns.reduce((s, r) => s + r, 0);

  const totalCashInvested = downPayment + closingCosts + y.rentProrations + y.capExFund + y.mortgageReserves;
  const cashOnCash = totalCashInvested > 0 ? cashFlow / totalCashInvested : 0;
  const breakEven = egi > 0 ? (annualDebtService + expenseAmount) / egi : 0;
  const cltv = purchasePrice > 0 ? (y.primaryLoan + y.secondaryLoan) / purchasePrice : 0;
  const loanConstant = y.primaryLoan > 0 ? (primaryMonthly * 12) / y.primaryLoan : 0;
  const pricePerUnit = units > 0 ? purchasePrice / units : 0;

  return {
    vacancyAmount, egi, expenseAmount, expensesPerUnit, noi, capRate, marketValue,
    primaryMonthly, secondaryMonthly, totalMonthly, annualDebtService,
    cashFlow, dscr, downPayment, closingCosts,
    investorTotal, investorReturns, totalInvestorReturn,
    totalCashInvested, cashOnCash, breakEven, cltv, loanConstant, pricePerUnit,
  };
}

/* ------------------------------------------------------------------ */
/*  Year tab labels                                                    */
/* ------------------------------------------------------------------ */

const YEAR_LABELS = ['Initial (Yr 1)', 'Year 2', 'Year 3', 'Year 4'];
const YEAR_SHORT = ['Yr 1', 'Yr 2', 'Yr 3', 'Yr 4'];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const MultiFamilyCalculator = forwardRef<ToolHandle>(function MultiFamilyCalculator(_, ref) {
  // -- Shared Property Info --
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [units, setUnits] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);

  // -- Per-year state (4 years) --
  const [years, setYears] = useState<YearState[]>([
    defaultYearState(),
    defaultYearState(),
    defaultYearState(),
    defaultYearState(),
  ]);

  // -- Active year tab --
  const [activeYear, setActiveYear] = useState(0);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  // -- Convenience: update a field in the active year --
  const setField = useCallback(<K extends keyof YearState>(key: K, value: YearState[K]) => {
    setYears(prev => {
      const next = [...prev];
      next[activeYear] = { ...next[activeYear], [key]: value };
      return next;
    });
  }, [activeYear]);

  const updateInvestor = useCallback(
    (idx: number, field: keyof Investor, val: string | number) => {
      setYears(prev => {
        const next = [...prev];
        const investors = [...next[activeYear].investors];
        investors[idx] = { ...investors[idx], [field]: val };
        next[activeYear] = { ...next[activeYear], investors };
        return next;
      });
    },
    [activeYear],
  );

  const copyFromPrevious = useCallback(() => {
    if (activeYear === 0) return;
    setYears(prev => {
      const next = [...prev];
      next[activeYear] = JSON.parse(JSON.stringify(prev[activeYear - 1]));
      return next;
    });
  }, [activeYear]);

  // Active year shortcut
  const y = years[activeYear];

  /* ---------------------------------------------------------------- */
  /*  Computed values for active year                                   */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(
    () => computeYear(y, units, purchasePrice),
    [y, units, purchasePrice],
  );

  /* ---------------------------------------------------------------- */
  /*  Computed values for ALL years (for comparison table)              */
  /* ---------------------------------------------------------------- */

  const allYearResults = useMemo(
    () => years.map(yr => computeYear(yr, units, purchasePrice)),
    [years, units, purchasePrice],
  );

  // Check if any non-initial year has data
  const hasMultiYearData = years.slice(1).some(yr => yr.gpri > 0);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setPropertyName(''); setAddress(''); setUnits(0); setPurchasePrice(0);
    setYears([defaultYearState(), defaultYearState(), defaultYearState(), defaultYearState()]);
    setActiveYear(0);
  };

  const resetYear = () => {
    setYears(prev => {
      const next = [...prev];
      next[activeYear] = defaultYearState();
      return next;
    });
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => {
      const buildYearSection = (yr: YearState, res: ComputedResults, label: string) => ([
        {
          heading: `${label} — Income & Expenses`,
          rows: [
            { label: 'GPRI', value: formatCurrency(yr.gpri) },
            { label: 'Vacancy', value: formatCurrency(res.vacancyAmount) },
            { label: 'Other Income', value: formatCurrency(yr.otherIncome) },
            { label: 'EGI', value: formatCurrency(res.egi) },
            { label: 'Operating Expenses', value: formatCurrency(res.expenseAmount) },
            { label: 'Expenses Per Unit', value: formatCurrency(res.expensesPerUnit) },
            { label: 'NOI', value: formatCurrency(res.noi) },
          ],
        },
        {
          heading: `${label} — Financing`,
          rows: [
            { label: 'Primary Loan', value: formatCurrency(yr.primaryLoan) },
            { label: 'Primary Rate', value: `${yr.primaryRate}%` },
            { label: 'Primary Monthly', value: formatCurrency(res.primaryMonthly) },
            ...(yr.secondaryLoan > 0 ? [
              { label: 'Secondary Loan', value: formatCurrency(yr.secondaryLoan) },
              { label: 'Secondary Rate', value: `${yr.secondaryRate}%` },
              { label: 'Secondary Monthly', value: formatCurrency(res.secondaryMonthly) },
            ] : []),
            { label: 'Annual Debt Service', value: formatCurrency(res.annualDebtService) },
          ],
        },
        {
          heading: `${label} — Key Metrics`,
          rows: [
            { label: 'Cap Rate', value: formatPercent(res.capRate) },
            { label: 'Market Value', value: formatCurrency(res.marketValue) },
            { label: 'Cash Flow', value: formatCurrency(res.cashFlow) },
            { label: 'DSCR', value: res.dscr.toFixed(2) },
            { label: 'Cash-on-Cash', value: formatPercent(res.cashOnCash) },
            { label: 'Break Even Ratio', value: formatPercent(res.breakEven) },
            { label: 'CLTV', value: formatPercent(res.cltv) },
            { label: 'Loan Constant', value: formatPercent(res.loanConstant) },
            { label: 'Down Payment', value: formatCurrency(res.downPayment) },
            { label: 'Total Cash Invested', value: formatCurrency(res.totalCashInvested) },
          ],
        },
      ]);

      const sections: ExportPayload['sections'] = [
        {
          heading: 'Property Information',
          rows: [
            { label: 'Property Name', value: propertyName || '-' },
            { label: 'Address', value: address || '-' },
            { label: 'Units', value: String(units) },
            { label: 'Purchase Price', value: formatCurrency(purchasePrice) },
            { label: 'Price Per Unit', value: formatCurrency(computed.pricePerUnit) },
          ],
        },
      ];

      // Add sections for each year that has data
      years.forEach((yr, i) => {
        if (yr.gpri > 0 || i === 0) {
          const res = allYearResults[i];
          sections.push(...buildYearSection(yr, res, YEAR_SHORT[i]));
        }
      });

      // Year-over-year comparison table if multiple years
      if (hasMultiYearData) {
        const activeYears = years.map((yr, i) => ({ yr, res: allYearResults[i], i })).filter(x => x.yr.gpri > 0 || x.i === 0);
        sections.push({
          heading: 'Year-over-Year Comparison',
          table: {
            headers: ['Metric', ...activeYears.map(x => YEAR_SHORT[x.i])],
            rows: [
              ['NOI', ...activeYears.map(x => formatCurrency(x.res.noi))],
              ['Cap Rate', ...activeYears.map(x => formatPercent(x.res.capRate))],
              ['Market Value', ...activeYears.map(x => formatCurrency(x.res.marketValue))],
              ['Cash Flow', ...activeYears.map(x => formatCurrency(x.res.cashFlow))],
              ['DSCR', ...activeYears.map(x => x.res.dscr.toFixed(2))],
              ['Cash-on-Cash', ...activeYears.map(x => formatPercent(x.res.cashOnCash))],
            ],
          },
        });
      }

      return {
        title: propertyName ? `Multi-Family Analysis — ${propertyName}` : 'Multi-Family Investment Calculator',
        type: 'calculator',
        sections,
      };
    },
  }));

  /* ---------------------------------------------------------------- */
  /*  Results Card                                                     */
  /* ---------------------------------------------------------------- */

  const resultsContent = (
    <div className="space-y-1 divide-y divide-gray-100">
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
            value={y.marketCapRate}
            onChange={(v) => setField('marketCapRate', v)}
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
  /*  Financing toggle                                                 */
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
  /*  Year-over-Year Comparison Table                                  */
  /* ---------------------------------------------------------------- */

  const comparisonTable = hasMultiYearData && (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => {}}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Year-over-Year Comparison
        </h3>
      </button>
      <div className="px-5 pb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 font-medium text-gray-500 whitespace-nowrap">Metric</th>
              {YEAR_SHORT.map((label, i) => (
                <th key={i} className={`text-right py-2 px-2 font-medium whitespace-nowrap ${
                  i === activeYear ? 'text-[#0000CC]' : 'text-gray-500'
                }`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="py-2 pr-4 text-gray-600">GPRI</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? formatCurrency(years[i].gpri) : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">EGI</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? formatCurrency(r.egi) : '-'}
                </td>
              ))}
            </tr>
            <tr className="bg-green-50/50">
              <td className="py-2 pr-4 font-medium text-green-800">NOI</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums font-semibold ${
                  years[i].gpri > 0 ? 'text-green-700' : 'text-gray-400'
                }`}>
                  {years[i].gpri > 0 ? formatCurrency(r.noi) : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Cap Rate</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? formatPercent(r.capRate) : '-'}
                </td>
              ))}
            </tr>
            <tr className="bg-green-50/50">
              <td className="py-2 pr-4 font-medium text-green-800">Market Value</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums font-semibold ${
                  years[i].gpri > 0 ? 'text-green-700' : 'text-gray-400'
                }`}>
                  {years[i].gpri > 0 ? formatCurrency(r.marketValue) : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Debt Service</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? formatCurrency(r.annualDebtService) : '-'}
                </td>
              ))}
            </tr>
            <tr className="bg-green-50/50">
              <td className="py-2 pr-4 font-medium text-green-800">Cash Flow</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums font-semibold ${
                  years[i].gpri > 0
                    ? r.cashFlow >= 0 ? 'text-green-700' : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {years[i].gpri > 0 ? formatCurrency(r.cashFlow) : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">DSCR</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? r.dscr.toFixed(2) : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Cash-on-Cash</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? formatPercent(r.cashOnCash) : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Break Even</td>
              {allYearResults.map((r, i) => (
                <td key={i} className={`text-right py-2 px-2 tabular-nums ${i === activeYear ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {years[i].gpri > 0 ? formatPercent(r.breakEven) : '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={120}
            height={47}
            className="h-10 w-auto hidden sm:block"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Multi-Family Investment Calculator
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Analyze rental property deals with detailed income, expense, and financing projections across 4 years.
            </p>
          </div>
        </div>

        {/* Year Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {YEAR_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveYear(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeYear === i
                    ? 'bg-[#0000CC] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {activeYear > 0 && (
            <button
              type="button"
              onClick={copyFromPrevious}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0000CC] hover:text-[#0000AA] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Copy from {YEAR_LABELS[activeYear - 1]}
            </button>
          )}
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
            {/* 1. Property Info (shared across years) */}
            <Section title="Property Info">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="Property Name" value={propertyName} onChange={setPropertyName} placeholder="e.g. Sunset Apartments" />
                <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, ST" />
                <NumberInput label="Number of Units" value={units} onChange={setUnits} min={0} />
                <NumberInput label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
              </div>
              <p className="text-xs text-gray-400 -mt-2">Property info is shared across all years.</p>
            </Section>

            {/* 2. Income */}
            <Section title={`Income — ${YEAR_SHORT[activeYear]}`}>
              <NumberInput label="Gross Potential Rental Income (Annual)" value={y.gpri} onChange={(v) => setField('gpri', v)} prefix="$" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Vacancy %" value={y.vacancyPct} onChange={(v) => setField('vacancyPct', v)} suffix="%" hint="Uses whichever is larger: % or $" />
                <NumberInput label="Vacancy $" value={y.vacancyDollar} onChange={(v) => setField('vacancyDollar', v)} prefix="$" />
              </div>
              <NumberInput label="Other Income" value={y.otherIncome} onChange={(v) => setField('otherIncome', v)} prefix="$" hint="Laundry, late fees, parking, etc." />
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
            <Section title={`Expenses — ${YEAR_SHORT[activeYear]}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Total Operating Expenses" value={y.expenseDollar} onChange={(v) => setField('expenseDollar', v)} prefix="$" hint="Uses whichever is larger: $ or %" />
                <NumberInput label="Operating Ratio" value={y.expenseRatio} onChange={(v) => setField('expenseRatio', v)} suffix="%" />
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
            <Section title={`Primary Financing — ${YEAR_SHORT[activeYear]}`}>
              <NumberInput label="Loan Amount" value={y.primaryLoan} onChange={(v) => setField('primaryLoan', v)} prefix="$" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Interest Rate" value={y.primaryRate} onChange={(v) => setField('primaryRate', v)} suffix="%" step={0.125} />
                <NumberInput label="Term (years)" value={y.primaryTerm} onChange={(v) => setField('primaryTerm', v)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Amortization (years)" value={y.primaryAmort} onChange={(v) => setField('primaryAmort', v)} />
                <NumberInput label="Periods Per Year" value={y.primaryPeriods} onChange={(v) => setField('primaryPeriods', v)} />
              </div>
              <FinancingToggle interestOnly={y.primaryIO} onToggle={(v) => setField('primaryIO', v)} />
              {y.primaryLoan > 0 && y.primaryRate > 0 && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">Monthly Payment</span>
                    <span className="text-sm font-bold text-green-900 tabular-nums">{formatCurrency(computed.primaryMonthly)}</span>
                  </div>
                </div>
              )}
            </Section>

            {/* 5. Secondary Financing */}
            <Section title={`Secondary Financing — ${YEAR_SHORT[activeYear]}`} defaultOpen={false}>
              <NumberInput label="Loan Amount" value={y.secondaryLoan} onChange={(v) => setField('secondaryLoan', v)} prefix="$" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Interest Rate" value={y.secondaryRate} onChange={(v) => setField('secondaryRate', v)} suffix="%" step={0.125} />
                <NumberInput label="Term (years)" value={y.secondaryTerm} onChange={(v) => setField('secondaryTerm', v)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Amortization (years)" value={y.secondaryAmort} onChange={(v) => setField('secondaryAmort', v)} />
                <NumberInput label="Periods Per Year" value={y.secondaryPeriods} onChange={(v) => setField('secondaryPeriods', v)} />
              </div>
              <FinancingToggle interestOnly={y.secondaryIO} onToggle={(v) => setField('secondaryIO', v)} />
              {y.secondaryLoan > 0 && y.secondaryRate > 0 && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">Monthly Payment</span>
                    <span className="text-sm font-bold text-green-900 tabular-nums">{formatCurrency(computed.secondaryMonthly)}</span>
                  </div>
                </div>
              )}
            </Section>

            {/* 6. Closing & Other Costs */}
            <Section title={`Closing & Other Costs — ${YEAR_SHORT[activeYear]}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="Closing Cost %" value={y.closingPct} onChange={(v) => setField('closingPct', v)} suffix="%" />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Closing Cost $</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-100 py-2 px-3 text-sm text-gray-600 tabular-nums">
                    {formatCurrency(computed.closingCosts)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberInput label="Rent Prorations" value={y.rentProrations} onChange={(v) => setField('rentProrations', v)} prefix="$" />
                <NumberInput label="CapEx Fund" value={y.capExFund} onChange={(v) => setField('capExFund', v)} prefix="$" />
                <NumberInput label="Mortgage Reserves" value={y.mortgageReserves} onChange={(v) => setField('mortgageReserves', v)} prefix="$" />
              </div>
            </Section>

            {/* 7. Investors */}
            <Section title={`Investors — ${YEAR_SHORT[activeYear]}`} defaultOpen={false}>
              <div className="space-y-3">
                {y.investors.map((inv, idx) => (
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

            {/* Year-over-Year Comparison */}
            {comparisonTable}

            {/* Reset buttons */}
            <div className="flex justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={resetYear}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700
                  hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
              >
                Reset {YEAR_SHORT[activeYear]}
              </button>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                    Key Results
                  </h3>
                  <span className="text-xs font-medium text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                    {YEAR_SHORT[activeYear]}
                  </span>
                </div>
              </div>
              <div className="px-5 py-4">{resultsContent}</div>
              <div className="px-5 pb-5 space-y-2">
                <button
                  type="button"
                  onClick={resetYear}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600
                    hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  Reset {YEAR_SHORT[activeYear]}
                </button>
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
