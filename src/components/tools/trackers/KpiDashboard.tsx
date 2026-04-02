'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const WEEKLY_METRICS = [
  'Leads Generated',
  'Offers Made',
  'Properties Analyzed',
  'Seller Calls',
  'Agent Contacts',
];

const MONTHLY_METRICS = [
  'Deals Under Contract',
  'Deals Closed',
  'Revenue',
  'Marketing Spend',
  'Net Profit',
];

interface KpiRow {
  metric: string;
  target: string;
  actual: string;
}

interface GoalRow {
  id: string;
  goal: string;
  target: string;
  actual: string;
}

interface DealRow {
  id: string;
  address: string;
  strategy: string;
  purchasePrice: string;
  saleValue: string;
  profit: string;
  status: string;
}

const STATUSES = ['Active', 'Pending', 'Closed', 'Dead'];

let rowId = 0;
const nextId = () => `row-${++rowId}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const KpiDashboard = forwardRef<ToolHandle>(function KpiDashboard(_props, ref) {
  const [weeklyKpis, setWeeklyKpis] = useState<KpiRow[]>(
    WEEKLY_METRICS.map((m) => ({ metric: m, target: '', actual: '' }))
  );

  const [monthlyKpis, setMonthlyKpis] = useState<KpiRow[]>(
    MONTHLY_METRICS.map((m) => ({ metric: m, target: '', actual: '' }))
  );

  const [quarterlyGoals, setQuarterlyGoals] = useState<GoalRow[]>([
    { id: nextId(), goal: '', target: '', actual: '' },
  ]);

  const [dealScorecard, setDealScorecard] = useState<DealRow[]>([
    { id: nextId(), address: '', strategy: '', purchasePrice: '', saleValue: '', profit: '', status: 'Active' },
  ]);

  const computePct = (target: string, actual: string): string => {
    const t = parseFloat(target);
    const a = parseFloat(actual);
    if (!t || isNaN(t) || isNaN(a)) return '-';
    return `${Math.round((a / t) * 100)}%`;
  };

  const pctColor = (target: string, actual: string): string => {
    const t = parseFloat(target);
    const a = parseFloat(actual);
    if (!t || isNaN(t) || isNaN(a)) return 'text-gray-400';
    const pct = (a / t) * 100;
    if (pct >= 100) return 'text-emerald-600';
    if (pct >= 75) return 'text-amber-600';
    return 'text-red-600';
  };

  const addQuarterlyRow = () => {
    setQuarterlyGoals((prev) => [...prev, { id: nextId(), goal: '', target: '', actual: '' }]);
  };

  const removeQuarterlyRow = (id: string) => {
    setQuarterlyGoals((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  };

  const addDealRow = () => {
    setDealScorecard((prev) => [
      ...prev,
      { id: nextId(), address: '', strategy: '', purchasePrice: '', saleValue: '', profit: '', status: 'Active' },
    ]);
  };

  const removeDealRow = (id: string) => {
    setDealScorecard((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  };

  const resetAll = () => {
    setWeeklyKpis(WEEKLY_METRICS.map((m) => ({ metric: m, target: '', actual: '' })));
    setMonthlyKpis(MONTHLY_METRICS.map((m) => ({ metric: m, target: '', actual: '' })));
    setQuarterlyGoals([{ id: nextId(), goal: '', target: '', actual: '' }]);
    setDealScorecard([{ id: nextId(), address: '', strategy: '', purchasePrice: '', saleValue: '', profit: '', status: 'Active' }]);
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'KPI Dashboard',
      type: 'tracker',
      sections: [
        {
          heading: 'Weekly KPIs',
          table: {
            headers: ['Metric', 'Target', 'Actual', '% of Goal'],
            rows: weeklyKpis.map((r) => [r.metric, r.target || '-', r.actual || '-', computePct(r.target, r.actual)]),
          },
        },
        {
          heading: 'Monthly KPIs',
          table: {
            headers: ['Metric', 'Target', 'Actual', '% of Goal'],
            rows: monthlyKpis.map((r) => [r.metric, r.target || '-', r.actual || '-', computePct(r.target, r.actual)]),
          },
        },
        {
          heading: 'Quarterly Goals',
          table: {
            headers: ['Goal', 'Target', 'Actual'],
            rows: quarterlyGoals.map((r) => [r.goal || '-', r.target || '-', r.actual || '-']),
          },
        },
        {
          heading: 'Deal Scorecard',
          table: {
            headers: ['Property Address', 'Strategy', 'Purchase Price', 'Sale/Value', 'Profit', 'Status'],
            rows: dealScorecard.map((r) => [
              r.address || '-',
              r.strategy || '-',
              r.purchasePrice ? `$${r.purchasePrice}` : '-',
              r.saleValue ? `$${r.saleValue}` : '-',
              r.profit ? `$${r.profit}` : '-',
              r.status,
            ]),
          },
        },
      ],
    }),
  }));

  const tableInputCls = "w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all";
  const numInputCls = `${tableInputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

  const renderKpiTable = (
    title: string,
    rows: KpiRow[],
    setRows: React.Dispatch<React.SetStateAction<KpiRow[]>>,
    isCurrency = false,
  ) => (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-2 font-semibold text-gray-600 w-2/5">Metric</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/5">Target</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/5">Actual</th>
              <th className="text-right py-2 pl-2 font-semibold text-gray-600 w-1/5">% of Goal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const shouldShowDollar = isCurrency && ['Revenue', 'Marketing Spend', 'Net Profit'].includes(row.metric);
              return (
                <tr key={row.metric} className="border-b border-gray-50">
                  <td className="py-2 pr-2 text-gray-700 font-medium">{row.metric}</td>
                  <td className="py-1.5 px-1">
                    {shouldShowDollar ? (
                      <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                        <span className="pl-2 text-gray-400 select-none text-xs">$</span>
                        <input
                          type="number"
                          value={row.target}
                          onChange={(e) => {
                            const next = [...rows];
                            next[ri] = { ...next[ri], target: e.target.value };
                            setRows(next);
                          }}
                          className="w-full bg-transparent py-1.5 px-1 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={row.target}
                        onChange={(e) => {
                          const next = [...rows];
                          next[ri] = { ...next[ri], target: e.target.value };
                          setRows(next);
                        }}
                        className={numInputCls}
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className="py-1.5 px-1">
                    {shouldShowDollar ? (
                      <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                        <span className="pl-2 text-gray-400 select-none text-xs">$</span>
                        <input
                          type="number"
                          value={row.actual}
                          onChange={(e) => {
                            const next = [...rows];
                            next[ri] = { ...next[ri], actual: e.target.value };
                            setRows(next);
                          }}
                          className="w-full bg-transparent py-1.5 px-1 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={row.actual}
                        onChange={(e) => {
                          const next = [...rows];
                          next[ri] = { ...next[ri], actual: e.target.value };
                          setRows(next);
                        }}
                        className={numInputCls}
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <span className={`font-bold tabular-nums ${pctColor(row.target, row.actual)}`}>
                      {computePct(row.target, row.actual)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

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
      </div>
      {/* Weekly KPIs */}
      {renderKpiTable('Weekly KPIs', weeklyKpis, setWeeklyKpis)}

      {/* Monthly KPIs */}
      {renderKpiTable('Monthly KPIs', monthlyKpis, setMonthlyKpis, true)}

      {/* Quarterly Goals */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Quarterly Goals
          </h3>
          <button
            type="button"
            onClick={addQuarterlyRow}
            className="px-3 py-1.5 text-xs font-medium text-[#0000CC] bg-[#0000CC]/5 hover:bg-[#0000CC]/10 rounded-lg transition-colors"
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-2 font-semibold text-gray-600 w-2/5">Goal</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/4">Target</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/4">Actual</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {quarterlyGoals.map((row, ri) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-1">
                    <input
                      type="text"
                      value={row.goal}
                      onChange={(e) => {
                        const next = [...quarterlyGoals];
                        next[ri] = { ...next[ri], goal: e.target.value };
                        setQuarterlyGoals(next);
                      }}
                      className={tableInputCls}
                      placeholder="Describe goal..."
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.target}
                      onChange={(e) => {
                        const next = [...quarterlyGoals];
                        next[ri] = { ...next[ri], target: e.target.value };
                        setQuarterlyGoals(next);
                      }}
                      className={tableInputCls}
                      placeholder="Target value..."
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.actual}
                      onChange={(e) => {
                        const next = [...quarterlyGoals];
                        next[ri] = { ...next[ri], actual: e.target.value };
                        setQuarterlyGoals(next);
                      }}
                      className={tableInputCls}
                      placeholder="Actual value..."
                    />
                  </td>
                  <td className="py-1.5 pl-1">
                    <button
                      type="button"
                      onClick={() => removeQuarterlyRow(row.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deal Scorecard */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Deal Scorecard
          </h3>
          <button
            type="button"
            onClick={addDealRow}
            className="px-3 py-1.5 text-xs font-medium text-[#0000CC] bg-[#0000CC]/5 hover:bg-[#0000CC]/10 rounded-lg transition-colors"
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-2 font-semibold text-gray-600">Address</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-24">Strategy</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-28">Purchase $</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-28">Sale/Value $</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-24">Profit $</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-24">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {dealScorecard.map((row, ri) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-1">
                    <input
                      type="text"
                      value={row.address}
                      onChange={(e) => {
                        const next = [...dealScorecard];
                        next[ri] = { ...next[ri], address: e.target.value };
                        setDealScorecard(next);
                      }}
                      className={tableInputCls}
                      placeholder="Property address..."
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.strategy}
                      onChange={(e) => {
                        const next = [...dealScorecard];
                        next[ri] = { ...next[ri], strategy: e.target.value };
                        setDealScorecard(next);
                      }}
                      className={tableInputCls}
                      placeholder="Flip..."
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      value={row.purchasePrice}
                      onChange={(e) => {
                        const next = [...dealScorecard];
                        next[ri] = { ...next[ri], purchasePrice: e.target.value };
                        setDealScorecard(next);
                      }}
                      className={numInputCls}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      value={row.saleValue}
                      onChange={(e) => {
                        const next = [...dealScorecard];
                        next[ri] = { ...next[ri], saleValue: e.target.value };
                        setDealScorecard(next);
                      }}
                      className={numInputCls}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      value={row.profit}
                      onChange={(e) => {
                        const next = [...dealScorecard];
                        next[ri] = { ...next[ri], profit: e.target.value };
                        setDealScorecard(next);
                      }}
                      className={numInputCls}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <select
                      value={row.status}
                      onChange={(e) => {
                        const next = [...dealScorecard];
                        next[ri] = { ...next[ri], status: e.target.value };
                        setDealScorecard(next);
                      }}
                      className={`${tableInputCls} appearance-none cursor-pointer`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 pl-1">
                    <button
                      type="button"
                      onClick={() => removeDealRow(row.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="py-2 pr-2 text-gray-900 font-bold">Total Profit</td>
                <td className="py-2 px-1 text-emerald-600 font-bold tabular-nums">
                  ${dealScorecard.reduce((sum, r) => sum + (parseFloat(r.profit) || 0), 0).toLocaleString()}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={resetAll}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Reset All
        </button>
      </div>
    </div>
  );
});

export default KpiDashboard;
