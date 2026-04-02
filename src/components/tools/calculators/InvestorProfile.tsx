'use client';

import { useState, useMemo, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import { formatCurrency } from '@/lib/calc-utils';

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

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm
          focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
          outline-none transition-all resize-y"
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
/*  Strategy options                                                   */
/* ------------------------------------------------------------------ */

const STRATEGIES = [
  { key: 'wholesale', label: 'Wholesale' },
  { key: 'flip', label: 'Fix & Flip' },
  { key: 'brrrr', label: 'BRRRR' },
  { key: 'buyHold', label: 'Buy & Hold' },
  { key: 'commercial', label: 'Commercial' },
] as const;

type StrategyKey = (typeof STRATEGIES)[number]['key'];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const InvestorProfile = forwardRef<ToolHandle>(function InvestorProfile(_, ref) {
  // -- Personal Info --
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // -- Investment Criteria --
  const [strategies, setStrategies] = useState<Record<StrategyKey, boolean>>({
    wholesale: false,
    flip: false,
    brrrr: false,
    buyHold: false,
    commercial: false,
  });
  const [targetMarkets, setTargetMarkets] = useState('');
  const [minBudget, setMinBudget] = useState(0);
  const [maxBudget, setMaxBudget] = useState(0);

  // -- Financial Position --
  const [availableCash, setAvailableCash] = useState(0);
  const [creditScore, setCreditScore] = useState(0);
  const [currentIncome, setCurrentIncome] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [existingDebt, setExistingDebt] = useState(0);

  // -- Goals --
  const [goals12Month, setGoals12Month] = useState('');
  const [fiveYearVision, setFiveYearVision] = useState('');
  const [timePerWeek, setTimePerWeek] = useState(0);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  /* ---------------------------------------------------------------- */
  /*  Strategy toggle                                                  */
  /* ---------------------------------------------------------------- */

  const toggleStrategy = (key: StrategyKey) => {
    setStrategies((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------------------------------------------------------------- */
  /*  Computed values                                                  */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(() => {
    const netWorth = portfolioValue - existingDebt;
    const debtToIncomeRatio = currentIncome > 0 ? existingDebt / (currentIncome * 12) : 0;
    const selectedStrategies = STRATEGIES.filter((s) => strategies[s.key]).map((s) => s.label);
    const completionPct = [
      name, email, location,
      selectedStrategies.length > 0 ? 'yes' : '',
      availableCash > 0 ? 'yes' : '',
      goals12Month,
    ].filter(Boolean).length / 6;

    return {
      netWorth,
      debtToIncomeRatio,
      selectedStrategies,
      completionPct,
    };
  }, [name, email, location, strategies, availableCash, currentIncome, portfolioValue, existingDebt, goals12Month]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setName(''); setEmail(''); setPhone(''); setLocation('');
    setStrategies({ wholesale: false, flip: false, brrrr: false, buyHold: false, commercial: false });
    setTargetMarkets(''); setMinBudget(0); setMaxBudget(0);
    setAvailableCash(0); setCreditScore(0); setCurrentIncome(0);
    setPortfolioValue(0); setExistingDebt(0);
    setGoals12Month(''); setFiveYearVision(''); setTimePerWeek(0);
  };

  /* ---------------------------------------------------------------- */
  /*  Export                                                           */
  /* ---------------------------------------------------------------- */

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: name ? `Investor Profile — ${name}` : 'Investor Profile Worksheet',
      type: 'calculator',
      sections: [
        {
          heading: 'Personal Information',
          rows: [
            { label: 'Name', value: name || '-' },
            { label: 'Email', value: email || '-' },
            { label: 'Phone', value: phone || '-' },
            { label: 'Location', value: location || '-' },
          ],
        },
        {
          heading: 'Investment Criteria',
          rows: [
            { label: 'Strategies', value: computed.selectedStrategies.length > 0 ? computed.selectedStrategies.join(', ') : '-' },
            { label: 'Target Markets', value: targetMarkets || '-' },
            { label: 'Min Budget', value: minBudget > 0 ? formatCurrency(minBudget) : '-' },
            { label: 'Max Budget', value: maxBudget > 0 ? formatCurrency(maxBudget) : '-' },
          ],
        },
        {
          heading: 'Financial Position',
          rows: [
            { label: 'Available Cash', value: formatCurrency(availableCash) },
            { label: 'Credit Score', value: creditScore > 0 ? String(creditScore) : '-' },
            { label: 'Current Annual Income', value: formatCurrency(currentIncome) },
            { label: 'Portfolio Value', value: formatCurrency(portfolioValue) },
            { label: 'Existing Debt', value: formatCurrency(existingDebt) },
            { label: 'Net Worth', value: formatCurrency(computed.netWorth) },
          ],
        },
        {
          heading: 'Goals',
          paragraphs: [
            `12-Month Goals: ${goals12Month || '-'}`,
            `5-Year Vision: ${fiveYearVision || '-'}`,
            `Time Available: ${timePerWeek > 0 ? `${timePerWeek} hours/week` : '-'}`,
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
      {/* Completion progress */}
      <div className="pb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Profile Completion
        </p>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${computed.completionPct * 100}%`,
              backgroundColor: computed.completionPct >= 0.8 ? '#16a34a' : computed.completionPct >= 0.5 ? '#ca8a04' : '#dc2626',
            }}
          />
        </div>
        <p className="text-xs text-gray-400 tabular-nums">{Math.round(computed.completionPct * 100)}% complete</p>
      </div>

      <MetricRow
        label="Net Worth"
        value={formatCurrency(computed.netWorth)}
        color={computed.netWorth >= 0 ? '#16a34a' : '#dc2626'}
        large
      />
      <MetricRow
        label="Available Cash"
        value={formatCurrency(availableCash)}
      />
      <MetricRow
        label="Credit Score"
        value={creditScore > 0 ? String(creditScore) : '-'}
        color={creditScore >= 740 ? '#16a34a' : creditScore >= 680 ? '#ca8a04' : creditScore > 0 ? '#dc2626' : undefined}
      />
      <MetricRow
        label="Portfolio Value"
        value={formatCurrency(portfolioValue)}
      />
      <MetricRow
        label="Existing Debt"
        value={formatCurrency(existingDebt)}
      />

      {computed.selectedStrategies.length > 0 && (
        <div className="pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Strategies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {computed.selectedStrategies.map((s) => (
              <span
                key={s}
                className="inline-block rounded-full bg-[#0000CC]/10 text-[#0000CC] px-2.5 py-0.5 text-xs font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {(minBudget > 0 || maxBudget > 0) && (
        <div className="pt-2">
          <MetricRow
            label="Budget Range"
            value={`${minBudget > 0 ? formatCurrency(minBudget) : '$0'} - ${maxBudget > 0 ? formatCurrency(maxBudget) : '...'}`}
          />
        </div>
      )}

      {timePerWeek > 0 && (
        <MetricRow label="Time / Week" value={`${timePerWeek} hrs`} />
      )}
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
        <h2 className="text-2xl font-bold text-gray-900">Investor Profile Worksheet</h2>
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
              Profile Summary
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

        <Section title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
            <TextInput label="Email" value={email} onChange={setEmail} placeholder="john@example.com" />
            <TextInput label="Phone" value={phone} onChange={setPhone} placeholder="(555) 123-4567" />
            <TextInput label="Location" value={location} onChange={setLocation} placeholder="City, State" />
          </div>
        </Section>

        <Section title="Investment Criteria">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Investment Strategies</label>
            <div className="flex flex-wrap gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleStrategy(s.key)}
                  className={`
                    rounded-full px-4 py-2 text-sm font-medium transition-all
                    ${strategies[s.key]
                      ? 'bg-[#0000CC] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <TextAreaInput
            label="Target Markets"
            value={targetMarkets}
            onChange={setTargetMarkets}
            placeholder="e.g., Dallas-Fort Worth, Phoenix metro, Central Florida..."
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label="Min Budget" value={minBudget} onChange={setMinBudget} prefix="$" />
            <NumberInput label="Max Budget" value={maxBudget} onChange={setMaxBudget} prefix="$" />
          </div>
        </Section>

        <Section title="Financial Position">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label="Available Cash" value={availableCash} onChange={setAvailableCash} prefix="$" />
            <NumberInput label="Credit Score" value={creditScore} onChange={setCreditScore} hint="300-850" />
            <NumberInput label="Current Annual Income" value={currentIncome} onChange={setCurrentIncome} prefix="$" />
            <NumberInput label="Current Portfolio Value" value={portfolioValue} onChange={setPortfolioValue} prefix="$" />
            <NumberInput label="Existing Debt" value={existingDebt} onChange={setExistingDebt} prefix="$" />
          </div>
          <div className="mt-2 rounded-lg bg-blue-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Estimated Net Worth</span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: computed.netWorth >= 0 ? '#16a34a' : '#dc2626' }}
            >
              {formatCurrency(computed.netWorth)}
            </span>
          </div>
        </Section>

        <Section title="Goals & Vision">
          <TextAreaInput
            label="12-Month Goals"
            value={goals12Month}
            onChange={setGoals12Month}
            placeholder="What do you want to accomplish in the next 12 months?"
            rows={3}
          />
          <TextAreaInput
            label="5-Year Vision"
            value={fiveYearVision}
            onChange={setFiveYearVision}
            placeholder="Where do you see your real estate portfolio in 5 years?"
            rows={3}
          />
          <NumberInput
            label="Time Available Per Week"
            value={timePerWeek}
            onChange={setTimePerWeek}
            suffix="hrs"
            hint="Hours you can dedicate to real estate investing"
          />
        </Section>
      </div>

      {/* Right: Results Sidebar (desktop) */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-6 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Profile Summary
          </h3>
          {resultsContent}
        </div>
      </div>
    </div>
    </div>
  );
});

export default InvestorProfile;
