'use client';

import { useState, useMemo, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import { formatCurrency } from '@/lib/calc-utils';

/* ------------------------------------------------------------------ */
/*  Inline helper components                                          */
/* ------------------------------------------------------------------ */

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
/*  Row definitions                                                    */
/* ------------------------------------------------------------------ */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INCOME_ROWS = [
  { key: 'rent', label: 'Rent' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'lateFees', label: 'Late Fees' },
  { key: 'otherIncome', label: 'Other Income' },
] as const;

const EXPENSE_ROWS = [
  { key: 'taxes', label: 'Taxes' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'repairs', label: 'Repairs & Maint.' },
  { key: 'management', label: 'Property Mgmt' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'landscaping', label: 'Landscaping' },
  { key: 'pestControl', label: 'Pest Control' },
  { key: 'otherExpense', label: 'Other Expense' },
] as const;

type IncomeKey = (typeof INCOME_ROWS)[number]['key'];
type ExpenseKey = (typeof EXPENSE_ROWS)[number]['key'];
type RowKey = IncomeKey | ExpenseKey;

type MonthlyGrid = Record<RowKey, number[]>;

function defaultGrid(): MonthlyGrid {
  const grid: Record<string, number[]> = {};
  [...INCOME_ROWS, ...EXPENSE_ROWS].forEach((row) => {
    grid[row.key] = Array(12).fill(0);
  });
  return grid as MonthlyGrid;
}

/* ------------------------------------------------------------------ */
/*  Editable cell component                                            */
/* ------------------------------------------------------------------ */

function CellInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
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
    setDisplay(num === 0 ? '0' : num.toLocaleString('en-US'));
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
    : value === 0
      ? '0'
      : value.toLocaleString('en-US');

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className="w-full min-w-[80px] rounded border border-gray-200 bg-gray-50 py-1.5 px-2 text-xs text-right tabular-nums
        focus:border-[#0000CC] focus:ring-1 focus:ring-[#0000CC]/20 focus:bg-white
        outline-none transition-all"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const T12Analysis = forwardRef<ToolHandle>(function T12Analysis(_, ref) {
  // -- Property Info --
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // -- Grid data --
  const [grid, setGrid] = useState<MonthlyGrid>(defaultGrid);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  /* ---------------------------------------------------------------- */
  /*  Update helper                                                    */
  /* ---------------------------------------------------------------- */

  const updateCell = useCallback(
    (rowKey: RowKey, monthIdx: number, value: number) => {
      setGrid((prev) => {
        const next = { ...prev };
        const row = [...prev[rowKey]];
        row[monthIdx] = value;
        next[rowKey] = row;
        return next;
      });
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Computed values                                                  */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(() => {
    // Row totals and averages
    const rowTotals: Record<RowKey, number> = {} as Record<RowKey, number>;
    const rowAverages: Record<RowKey, number> = {} as Record<RowKey, number>;

    [...INCOME_ROWS, ...EXPENSE_ROWS].forEach((row) => {
      const total = grid[row.key].reduce((s, v) => s + v, 0);
      rowTotals[row.key] = total;
      rowAverages[row.key] = total / 12;
    });

    // Monthly income totals
    const monthlyIncomeTotals = Array.from({ length: 12 }, (_, m) =>
      INCOME_ROWS.reduce((s, row) => s + grid[row.key][m], 0),
    );

    // Monthly expense totals
    const monthlyExpenseTotals = Array.from({ length: 12 }, (_, m) =>
      EXPENSE_ROWS.reduce((s, row) => s + grid[row.key][m], 0),
    );

    // Monthly NOI
    const monthlyNoi = monthlyIncomeTotals.map((inc, m) => inc - monthlyExpenseTotals[m]);

    // Annual totals
    const annualIncome = monthlyIncomeTotals.reduce((s, v) => s + v, 0);
    const annualExpenses = monthlyExpenseTotals.reduce((s, v) => s + v, 0);
    const annualNoi = annualIncome - annualExpenses;

    // Monthly averages
    const avgMonthlyIncome = annualIncome / 12;
    const avgMonthlyExpenses = annualExpenses / 12;
    const avgMonthlyNoi = annualNoi / 12;

    // Expense ratio
    const expenseRatio = annualIncome > 0 ? annualExpenses / annualIncome : 0;

    return {
      rowTotals,
      rowAverages,
      monthlyIncomeTotals,
      monthlyExpenseTotals,
      monthlyNoi,
      annualIncome,
      annualExpenses,
      annualNoi,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      avgMonthlyNoi,
      expenseRatio,
    };
  }, [grid]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setPropertyName(''); setAddress(''); setYear(new Date().getFullYear().toString());
    setGrid(defaultGrid());
  };

  /* ---------------------------------------------------------------- */
  /*  Export                                                           */
  /* ---------------------------------------------------------------- */

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => {
      const incomeTable = {
        heading: 'Income',
        table: {
          headers: ['Category', ...MONTH_LABELS, 'Total', 'Average'],
          rows: [
            ...INCOME_ROWS.map((row) => [
              row.label,
              ...grid[row.key].map((v) => formatCurrency(v)),
              formatCurrency(computed.rowTotals[row.key]),
              formatCurrency(computed.rowAverages[row.key]),
            ]),
            [
              'Total Income',
              ...computed.monthlyIncomeTotals.map((v) => formatCurrency(v)),
              formatCurrency(computed.annualIncome),
              formatCurrency(computed.avgMonthlyIncome),
            ],
          ],
        },
      };

      const expenseTable = {
        heading: 'Expenses',
        table: {
          headers: ['Category', ...MONTH_LABELS, 'Total', 'Average'],
          rows: [
            ...EXPENSE_ROWS.map((row) => [
              row.label,
              ...grid[row.key].map((v) => formatCurrency(v)),
              formatCurrency(computed.rowTotals[row.key]),
              formatCurrency(computed.rowAverages[row.key]),
            ]),
            [
              'Total Expenses',
              ...computed.monthlyExpenseTotals.map((v) => formatCurrency(v)),
              formatCurrency(computed.annualExpenses),
              formatCurrency(computed.avgMonthlyExpenses),
            ],
          ],
        },
      };

      const noiTable = {
        heading: 'Net Operating Income',
        table: {
          headers: ['', ...MONTH_LABELS, 'Total', 'Average'],
          rows: [
            [
              'NOI',
              ...computed.monthlyNoi.map((v) => formatCurrency(v)),
              formatCurrency(computed.annualNoi),
              formatCurrency(computed.avgMonthlyNoi),
            ],
          ],
        },
      };

      return {
        title: propertyName ? `T12 Analysis — ${propertyName}` : 'Trailing 12-Month Analysis',
        type: 'calculator',
        sections: [
          {
            heading: 'Property Information',
            rows: [
              { label: 'Property Name', value: propertyName || '-' },
              { label: 'Address', value: address || '-' },
              { label: 'Year', value: year },
            ],
          },
          incomeTable,
          expenseTable,
          noiTable,
          {
            heading: 'Summary',
            rows: [
              { label: 'Annual Income', value: formatCurrency(computed.annualIncome) },
              { label: 'Annual Expenses', value: formatCurrency(computed.annualExpenses) },
              { label: 'Annual NOI', value: formatCurrency(computed.annualNoi) },
              { label: 'Expense Ratio', value: `${(computed.expenseRatio * 100).toFixed(1)}%` },
            ],
          },
        ],
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
          Annual NOI
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: computed.annualNoi >= 0 ? '#16a34a' : '#dc2626' }}
        >
          {formatCurrency(computed.annualNoi)}
        </p>
      </div>

      <MetricRow label="Annual Income" value={formatCurrency(computed.annualIncome)} />
      <MetricRow label="Annual Expenses" value={formatCurrency(computed.annualExpenses)} />
      <MetricRow
        label="Avg Monthly Income"
        value={formatCurrency(computed.avgMonthlyIncome)}
      />
      <MetricRow
        label="Avg Monthly Expenses"
        value={formatCurrency(computed.avgMonthlyExpenses)}
      />
      <MetricRow
        label="Avg Monthly NOI"
        value={formatCurrency(computed.avgMonthlyNoi)}
        color={computed.avgMonthlyNoi >= 0 ? '#16a34a' : '#dc2626'}
        large
      />
      <MetricRow
        label="Expense Ratio"
        value={`${(computed.expenseRatio * 100).toFixed(1)}%`}
        color={computed.expenseRatio <= 0.5 ? '#16a34a' : computed.expenseRatio <= 0.6 ? '#ca8a04' : '#dc2626'}
      />
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Spreadsheet-style table                                          */
  /* ---------------------------------------------------------------- */

  function GridTable({
    rows,
    type,
  }: {
    rows: readonly { key: RowKey; label: string }[];
    type: 'income' | 'expense';
  }) {
    const monthlyTotals = type === 'income' ? computed.monthlyIncomeTotals : computed.monthlyExpenseTotals;
    const annualTotal = type === 'income' ? computed.annualIncome : computed.annualExpenses;
    const avgMonthly = type === 'income' ? computed.avgMonthlyIncome : computed.avgMonthlyExpenses;

    return (
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500 sticky left-0 bg-white z-10 min-w-[120px]">
                Category
              </th>
              {MONTH_LABELS.map((m) => (
                <th key={m} className="text-right py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                  {m}
                </th>
              ))}
              <th className="text-right py-2 px-2 font-semibold text-gray-600 min-w-[90px] bg-blue-50/50">
                Total
              </th>
              <th className="text-right py-2 px-3 font-semibold text-gray-600 min-w-[90px] bg-green-50/50">
                Average
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50/40">
                <td className="py-1.5 px-3 font-medium text-gray-700 sticky left-0 bg-white z-10">
                  {row.label}
                </td>
                {grid[row.key].map((val, m) => (
                  <td key={m} className="py-1 px-1">
                    <CellInput
                      value={val}
                      onChange={(v) => updateCell(row.key, m, v)}
                    />
                  </td>
                ))}
                <td className="py-1.5 px-2 text-right font-semibold text-gray-800 tabular-nums bg-blue-50/50">
                  {formatCurrency(computed.rowTotals[row.key])}
                </td>
                <td className="py-1.5 px-3 text-right font-semibold text-gray-700 tabular-nums bg-green-50/50">
                  {formatCurrency(computed.rowAverages[row.key])}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className={`border-t-2 ${type === 'income' ? 'border-blue-200 bg-blue-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <td className="py-2 px-3 font-bold text-gray-900 sticky left-0 bg-inherit z-10">
                {type === 'income' ? 'Total Income' : 'Total Expenses'}
              </td>
              {monthlyTotals.map((val, m) => (
                <td key={m} className="py-2 px-2 text-right font-bold text-gray-800 tabular-nums">
                  {formatCurrency(val)}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-bold text-gray-900 tabular-nums bg-blue-100/50">
                {formatCurrency(annualTotal)}
              </td>
              <td className="py-2 px-3 text-right font-bold text-gray-800 tabular-nums bg-green-100/50">
                {formatCurrency(avgMonthly)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

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
        <h2 className="text-2xl font-bold text-gray-900">Trailing 12-Month Analysis</h2>
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
              T12 Summary
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextInput label="Property Name" value={propertyName} onChange={setPropertyName} placeholder="Property name" />
            <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main St" />
            <TextInput label="Year" value={year} onChange={setYear} placeholder="2026" />
          </div>
        </Section>

        <Section title="Income">
          <GridTable rows={INCOME_ROWS} type="income" />
        </Section>

        <Section title="Expenses">
          <GridTable rows={EXPENSE_ROWS} type="expense" />
        </Section>

        {/* NOI Summary Row */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Net Operating Income
            </h3>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500 sticky left-0 bg-white z-10 min-w-[120px]" />
                    {MONTH_LABELS.map((m) => (
                      <th key={m} className="text-right py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                        {m}
                      </th>
                    ))}
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 min-w-[90px] bg-blue-50/50">
                      Total
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 min-w-[90px] bg-green-50/50">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-green-50/40 border-t-2 border-green-200">
                    <td className="py-2.5 px-3 font-bold text-gray-900 sticky left-0 bg-inherit z-10">
                      NOI
                    </td>
                    {computed.monthlyNoi.map((val, m) => (
                      <td
                        key={m}
                        className="py-2.5 px-2 text-right font-bold tabular-nums"
                        style={{ color: val >= 0 ? '#16a34a' : '#dc2626' }}
                      >
                        {formatCurrency(val)}
                      </td>
                    ))}
                    <td
                      className="py-2.5 px-2 text-right font-bold tabular-nums bg-blue-100/50"
                      style={{ color: computed.annualNoi >= 0 ? '#16a34a' : '#dc2626' }}
                    >
                      {formatCurrency(computed.annualNoi)}
                    </td>
                    <td
                      className="py-2.5 px-3 text-right font-bold tabular-nums bg-green-100/50"
                      style={{ color: computed.avgMonthlyNoi >= 0 ? '#16a34a' : '#dc2626' }}
                    >
                      {formatCurrency(computed.avgMonthlyNoi)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Results Sidebar (desktop) */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-6 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            T12 Summary
          </h3>
          {resultsContent}
        </div>
      </div>
    </div>
    </div>
  );
});

export default T12Analysis;
