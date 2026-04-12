'use client';

import { useState, useMemo, useCallback, forwardRef, useImperativeHandle, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import { pmt, formatCurrency, formatCurrencyDetailed, formatPercent } from '@/lib/calc-utils';

/* ------------------------------------------------------------------ */
/*  Inline helper components                                          */
/* ------------------------------------------------------------------ */

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
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 pr-3 pl-1 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </label>
  );
}

function PercentInput({
  label,
  value,
  onChange,
  id,
  step = '0.25',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
  step?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
        <input
          id={id}
          type="number"
          min={0}
          max={100}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 pl-3 pr-1 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pr-3 text-gray-400 select-none">%</span>
      </div>
    </label>
  );
}

function NumberInput({
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
        <input
          id={id}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 px-3 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </label>
  );
}

function ResultRow({
  label,
  value,
  bold,
  color,
  large,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: 'green' | 'yellow' | 'red' | 'default';
  large?: boolean;
}) {
  const colorClass =
    color === 'green'
      ? 'text-emerald-600'
      : color === 'yellow'
        ? 'text-amber-600'
        : color === 'red'
          ? 'text-red-600'
          : 'text-gray-900';

  return (
    <div className={`flex items-center justify-between py-1.5 ${large ? 'py-2.5' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </span>
      <span
        className={`tabular-nums ${colorClass} ${bold ? 'font-bold' : 'font-medium'} ${large ? 'text-lg' : 'text-sm'}`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="pt-4 pb-1 first:pt-0">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h4>
      <div className="mt-1 h-px bg-gray-100" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ScenarioInputs {
  purchasePrice: string;
  annualTaxes: string;
  rehabBudget: string;
  bed1Units: string;
  bed1Rent: string;
  bed2Units: string;
  bed2Rent: string;
  bed3Units: string;
  bed3Rent: string;
}

const defaultScenario: ScenarioInputs = {
  purchasePrice: '',
  annualTaxes: '',
  rehabBudget: '',
  bed1Units: '',
  bed1Rent: '',
  bed2Units: '',
  bed2Rent: '',
  bed3Units: '',
  bed3Rent: '',
};

interface SharedInputs {
  vacancyPct: string;
  expenseRatio: string;
  closingPct: string;
  targetCapRate: string;
  ltv: string;
  interestRate: string;
  loanTerm: string;
}

const defaultShared: SharedInputs = {
  vacancyPct: '5',
  expenseRatio: '25',
  closingPct: '1.5',
  targetCapRate: '7',
  ltv: '75',
  interestRate: '5',
  loanTerm: '30',
};

/* ------------------------------------------------------------------ */
/*  Computed results                                                  */
/* ------------------------------------------------------------------ */

function useScenarioResults(scenario: ScenarioInputs, shared: SharedInputs) {
  return useMemo(() => {
    const n = (v: string) => (v === '' ? 0 : parseFloat(v) || 0);

    const purchasePrice = n(scenario.purchasePrice);
    const annualTaxes = n(scenario.annualTaxes);
    const rehabBudget = n(scenario.rehabBudget);
    const bed1Units = n(scenario.bed1Units);
    const bed1Rent = n(scenario.bed1Rent);
    const bed2Units = n(scenario.bed2Units);
    const bed2Rent = n(scenario.bed2Rent);
    const bed3Units = n(scenario.bed3Units);
    const bed3Rent = n(scenario.bed3Rent);

    const vacancyPct = n(shared.vacancyPct);
    const expenseRatio = n(shared.expenseRatio);
    const closingPct = n(shared.closingPct);
    const targetCapRate = n(shared.targetCapRate);
    const ltv = n(shared.ltv);
    const interestRate = n(shared.interestRate);
    const loanTerm = n(shared.loanTerm);

    // Rental Income
    const totalUnits = bed1Units + bed2Units + bed3Units;
    const monthlyRent =
      bed1Units * bed1Rent + bed2Units * bed2Rent + bed3Units * bed3Rent;
    const annualRent = monthlyRent * 12;

    // Deal Costs
    const closingCosts = purchasePrice * (closingPct / 100);
    const allInCost = purchasePrice + closingCosts + rehabBudget;

    // Analysis
    const vacancyLoss = annualRent * (vacancyPct / 100);
    const grossIncome = annualRent - vacancyLoss;
    const expenses = grossIncome * (expenseRatio / 100);
    const noi = grossIncome - expenses;

    const capRate = allInCost > 0 ? noi / allInCost : 0;
    const arv = targetCapRate > 0 ? noi / (targetCapRate / 100) : 0;
    const brrrTakeOut = arv * 0.7;

    // Financed
    const loanAmount = allInCost * (ltv / 100);
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = loanTerm * 12;
    const monthlyPI =
      loanAmount > 0 && totalPayments > 0
        ? pmt(monthlyRate, totalPayments, loanAmount)
        : 0;
    const monthlyTaxes = annualTaxes / 12;
    const monthlyPITI = monthlyPI + monthlyTaxes;
    const monthlyNet = noi / 12 - monthlyPI - monthlyTaxes;
    const financedCapRate =
      allInCost > 0 ? (noi - monthlyPI * 12) / allInCost : 0;

    return {
      totalUnits,
      monthlyRent,
      annualRent,
      closingCosts,
      allInCost,
      vacancyLoss,
      grossIncome,
      expenses,
      noi,
      capRate,
      arv,
      brrrTakeOut,
      loanAmount,
      monthlyPI,
      monthlyTaxes,
      monthlyPITI,
      monthlyNet,
      financedCapRate,
    };
  }, [scenario, shared]);
}

function capColor(rate: number): 'green' | 'yellow' | 'red' {
  if (rate >= 0.07) return 'green';
  if (rate >= 0.05) return 'yellow';
  return 'red';
}

function cashFlowColor(value: number): 'green' | 'red' {
  return value >= 0 ? 'green' : 'red';
}

/* ------------------------------------------------------------------ */
/*  Scenario Column                                                   */
/* ------------------------------------------------------------------ */

function ScenarioColumn({
  title,
  accentColor,
  inputs,
  setInputs,
  shared,
  prefix,
}: {
  title: string;
  accentColor: string;
  inputs: ScenarioInputs;
  setInputs: (fn: (prev: ScenarioInputs) => ScenarioInputs) => void;
  shared: SharedInputs;
  prefix: string;
}) {
  const r = useScenarioResults(inputs, shared);

  const set = useCallback(
    (key: keyof ScenarioInputs) => (v: string) =>
      setInputs((prev) => ({ ...prev, [key]: v })),
    [setInputs],
  );

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      {/* Header strip */}
      <div className={`px-6 py-3 ${accentColor}`}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
      </div>

      <div className="flex flex-col gap-5 p-6">
        {/* --- Inputs --- */}
        <DollarInput label="Purchase Price" value={inputs.purchasePrice} onChange={set('purchasePrice')} id={`${prefix}-price`} />
        <DollarInput label="Annual Taxes" value={inputs.annualTaxes} onChange={set('annualTaxes')} id={`${prefix}-taxes`} />
        <DollarInput label="Rehab Budget" value={inputs.rehabBudget} onChange={set('rehabBudget')} id={`${prefix}-rehab`} />

        {/* Unit rows */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Unit Mix</p>
          {([
            ['1-Bed', 'bed1Units', 'bed1Rent'],
            ['2-Bed', 'bed2Units', 'bed2Rent'],
            ['3-Bed', 'bed3Units', 'bed3Rent'],
          ] as const).map(([label, unitsKey, rentKey]) => (
            <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <NumberInput
                label={`${label} Units`}
                value={inputs[unitsKey]}
                onChange={set(unitsKey)}
                id={`${prefix}-${unitsKey}`}
              />
              <span className="pb-2.5 text-gray-300 text-sm select-none">x</span>
              <DollarInput
                label="Monthly Rent"
                value={inputs[rentKey]}
                onChange={set(rentKey)}
                id={`${prefix}-${rentKey}`}
              />
            </div>
          ))}
        </div>

        {/* --- Results --- */}
        <div className="mt-2 space-y-0">
          <SectionDivider title="Rental Income" />
          <ResultRow label="Total Units" value={`${r.totalUnits}`} />
          <ResultRow label="Monthly Rent" value={formatCurrency(r.monthlyRent)} />
          <ResultRow label="Annual Rent" value={formatCurrency(r.annualRent)} />

          <SectionDivider title="Deal Costs" />
          <ResultRow label="Closing Costs" value={formatCurrency(r.closingCosts)} />
          <ResultRow label="All-In Cost" value={formatCurrency(r.allInCost)} bold />

          <SectionDivider title="Analysis" />
          <ResultRow label="Vacancy Loss" value={formatCurrency(r.vacancyLoss)} color="red" />
          <ResultRow label="Gross Income" value={formatCurrency(r.grossIncome)} />
          <ResultRow label="Operating Expenses" value={formatCurrency(r.expenses)} />
          <ResultRow
            label="NOI"
            value={formatCurrency(r.noi)}
            bold
            large
            color={r.noi >= 0 ? 'green' : 'red'}
          />
          <ResultRow
            label="Cap Rate"
            value={formatPercent(r.capRate)}
            bold
            large
            color={capColor(r.capRate)}
          />

          <SectionDivider title="Valuation" />
          <ResultRow label="ARV (After Repair Value)" value={formatCurrency(r.arv)} />
          <ResultRow label="BRRRR Take-Out (70%)" value={formatCurrency(r.brrrTakeOut)} />

          <SectionDivider title="Financed Returns" />
          <ResultRow label="Loan Amount" value={formatCurrency(r.loanAmount)} />
          <ResultRow label="Monthly P&I" value={formatCurrencyDetailed(r.monthlyPI)} />
          <ResultRow label="Monthly PITI" value={formatCurrencyDetailed(r.monthlyPITI)} />
          <ResultRow
            label="Monthly Net Cash Flow"
            value={formatCurrencyDetailed(r.monthlyNet)}
            bold
            large
            color={cashFlowColor(r.monthlyNet)}
          />
          <ResultRow
            label="Financed Cap Rate"
            value={formatPercent(r.financedCapRate)}
            bold
            color={capColor(r.financedCapRate)}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export const CapRateUnderwriter = forwardRef<ToolHandle>(function CapRateUnderwriter(_, ref) {
  const [shared, setShared] = useState<SharedInputs>(defaultShared);
  const [current, setCurrent] = useState<ScenarioInputs>(defaultScenario);
  const [asking, setAsking] = useState<ScenarioInputs>(defaultScenario);

  const currentResults = useScenarioResults(current, shared);
  const askingResults = useScenarioResults(asking, shared);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Cap Rate Underwriter',
      type: 'calculator',
      sections: [
        {
          heading: 'Shared Assumptions',
          rows: [
            { label: 'Vacancy Rate', value: `${shared.vacancyPct}%` },
            { label: 'Expense Ratio', value: `${shared.expenseRatio}%` },
            { label: 'Closing Cost %', value: `${shared.closingPct}%` },
            { label: 'Target Cap Rate', value: `${shared.targetCapRate}%` },
            { label: 'LTV', value: `${shared.ltv}%` },
            { label: 'Interest Rate', value: `${shared.interestRate}%` },
            { label: 'Loan Term', value: `${shared.loanTerm} years` },
          ],
        },
        {
          heading: 'Current Scenario',
          rows: [
            { label: 'Purchase Price', value: formatCurrency(Number(current.purchasePrice) || 0) },
            { label: 'NOI', value: formatCurrency(currentResults.noi) },
            { label: 'Cap Rate', value: formatPercent(currentResults.capRate) },
            { label: 'Monthly Cash Flow', value: formatCurrency(currentResults.monthlyNet) },
          ],
        },
        {
          heading: 'Asking Scenario',
          rows: [
            { label: 'Purchase Price', value: formatCurrency(Number(asking.purchasePrice) || 0) },
            { label: 'NOI', value: formatPercent(askingResults.noi) },
            { label: 'Cap Rate', value: formatPercent(askingResults.capRate) },
            { label: 'Monthly Cash Flow', value: formatCurrency(askingResults.monthlyNet) },
          ],
        },
      ],
    }),
  }));

  const setSharedField = useCallback(
    (key: keyof SharedInputs) => (v: string) =>
      setShared((prev) => ({ ...prev, [key]: v })),
    [],
  );

  const handleReset = useCallback(() => {
    setShared(defaultShared);
    setCurrent(defaultScenario);
    setAsking(defaultScenario);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title + Reset */}
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
            <h2 className="text-2xl font-bold text-gray-900">Cap Rate Underwriter</h2>
            <p className="mt-1 text-sm text-gray-500">
              Compare two deal scenarios side by side
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
        >
          Reset All
        </button>
      </div>

      {/* Shared Assumptions */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
          Shared Assumptions
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <PercentInput label="Vacancy Rate" value={shared.vacancyPct} onChange={setSharedField('vacancyPct')} id="shared-vacancy" />
          <PercentInput label="Expense Ratio" value={shared.expenseRatio} onChange={setSharedField('expenseRatio')} id="shared-expense" />
          <PercentInput label="Closing Cost" value={shared.closingPct} onChange={setSharedField('closingPct')} id="shared-closing" />
          <PercentInput label="Target Cap Rate" value={shared.targetCapRate} onChange={setSharedField('targetCapRate')} id="shared-target" />
          <PercentInput label="LTV" value={shared.ltv} onChange={setSharedField('ltv')} id="shared-ltv" />
          <PercentInput label="Interest Rate" value={shared.interestRate} onChange={setSharedField('interestRate')} id="shared-interest" step="0.125" />
          <NumberInput label="Loan Term (yrs)" value={shared.loanTerm} onChange={setSharedField('loanTerm')} id="shared-term" />
        </div>
      </div>

      {/* Side-by-side columns */}
      <div className="grid gap-6 md:grid-cols-2">
        <ScenarioColumn
          title="Current"
          accentColor="bg-[#0000CC]"
          inputs={current}
          setInputs={setCurrent}
          shared={shared}
          prefix="current"
        />
        <ScenarioColumn
          title="Asking"
          accentColor="bg-gray-500"
          inputs={asking}
          setInputs={setAsking}
          shared={shared}
          prefix="asking"
        />
      </div>
    </div>
  );
});

export default CapRateUnderwriter;
