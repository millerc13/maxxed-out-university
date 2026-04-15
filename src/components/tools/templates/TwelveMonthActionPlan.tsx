'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

interface StartingPoint {
  cashAvailable: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  creditScore: string;
  currentDeals: string;
  strengths: string;
  gaps: string;
}

interface Goal {
  target: string;
  why: string;
}

interface Quarter {
  focus: string;
  milestones: string;
  deals: string;
  learning: string;
}

interface Weekly {
  lead: string;
  analyze: string;
  network: string;
  learn: string;
}

interface PlanData {
  start: StartingPoint;
  oneYear: Goal;
  threeYear: Goal;
  quarters: Quarter[];
  weekly: Weekly;
}

const EMPTY: PlanData = {
  start: {
    cashAvailable: '',
    monthlyIncome: '',
    monthlyExpenses: '',
    creditScore: '',
    currentDeals: '',
    strengths: '',
    gaps: '',
  },
  oneYear: { target: '', why: '' },
  threeYear: { target: '', why: '' },
  quarters: [
    { focus: '', milestones: '', deals: '', learning: '' },
    { focus: '', milestones: '', deals: '', learning: '' },
    { focus: '', milestones: '', deals: '', learning: '' },
    { focus: '', milestones: '', deals: '', learning: '' },
  ],
  weekly: { lead: '', analyze: '', network: '', learn: '' },
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text';
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
      />
    </label>
  );
}

function TextArea({
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
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all resize-none"
      />
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export const TwelveMonthActionPlan = forwardRef<ToolHandle>(function TwelveMonthActionPlan(_, ref) {
  const [data, setData] = useState<PlanData>(EMPTY);

  const setStart = useCallback(<K extends keyof StartingPoint>(k: K, v: string) => {
    setData((p) => ({ ...p, start: { ...p.start, [k]: v } }));
  }, []);

  const setGoal = useCallback((which: 'oneYear' | 'threeYear', k: keyof Goal, v: string) => {
    setData((p) => ({ ...p, [which]: { ...p[which], [k]: v } }));
  }, []);

  const setQ = useCallback((i: number, k: keyof Quarter, v: string) => {
    setData((p) => ({
      ...p,
      quarters: p.quarters.map((q, idx) => (idx === i ? { ...q, [k]: v } : q)),
    }));
  }, []);

  const setWeekly = useCallback((k: keyof Weekly, v: string) => {
    setData((p) => ({ ...p, weekly: { ...p.weekly, [k]: v } }));
  }, []);

  const reset = useCallback(() => setData(EMPTY), []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: '12-Month Action Plan',
      type: 'template',
      sections: [
        {
          heading: 'Starting Point',
          table: {
            headers: ['Metric', 'Value'],
            rows: [
              ['Cash available', data.start.cashAvailable],
              ['Monthly income', data.start.monthlyIncome],
              ['Monthly expenses', data.start.monthlyExpenses],
              ['Credit score', data.start.creditScore],
              ['Current deals / doors', data.start.currentDeals],
              ['Strengths', data.start.strengths],
              ['Gaps to close', data.start.gaps],
            ],
          },
        },
        {
          heading: 'Goals',
          table: {
            headers: ['Horizon', 'Target', 'Why it matters'],
            rows: [
              ['1 year', data.oneYear.target, data.oneYear.why],
              ['3 year', data.threeYear.target, data.threeYear.why],
            ],
          },
        },
        {
          heading: 'Quarterly Plan',
          table: {
            headers: ['Quarter', 'Focus', 'Milestones', 'Deals', 'Learning'],
            rows: data.quarters.map((q, i) => [`Q${i + 1}`, q.focus, q.milestones, q.deals, q.learning]),
          },
        },
        {
          heading: 'Weekly Commitments',
          table: {
            headers: ['Activity', 'Commitment'],
            rows: [
              ['Lead generation', data.weekly.lead],
              ['Deal analysis', data.weekly.analyze],
              ['Networking', data.weekly.network],
              ['Learning', data.weekly.learn],
            ],
          },
        },
      ],
    }),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={120}
            height={47}
            className="h-10 w-auto hidden sm:block"
          />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">12-Month Action Plan</h2>
            <p className="mt-1 text-sm text-gray-500">Where you are, where you're going, and the exact moves to get there.</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-lg border border-gray-200 bg-white px-4 h-10 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 cursor-pointer"
        >
          Reset
        </button>
      </div>

      <Card title="Starting Point">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cash Available" value={data.start.cashAvailable} onChange={(v) => setStart('cashAvailable', v)} placeholder="$10,000" />
          <Field label="Monthly Income" value={data.start.monthlyIncome} onChange={(v) => setStart('monthlyIncome', v)} placeholder="$6,500" />
          <Field label="Monthly Expenses" value={data.start.monthlyExpenses} onChange={(v) => setStart('monthlyExpenses', v)} placeholder="$4,200" />
          <Field label="Credit Score" value={data.start.creditScore} onChange={(v) => setStart('creditScore', v)} placeholder="720" />
          <Field label="Current Deals / Doors" value={data.start.currentDeals} onChange={(v) => setStart('currentDeals', v)} placeholder="0" />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextArea label="Strengths" value={data.start.strengths} onChange={(v) => setStart('strengths', v)} placeholder="What you already do well…" />
          <TextArea label="Gaps to Close" value={data.start.gaps} onChange={(v) => setStart('gaps', v)} placeholder="Skills, knowledge, network…" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="1-Year Goal">
          <div className="space-y-3">
            <Field label="Target" value={data.oneYear.target} onChange={(v) => setGoal('oneYear', 'target', v)} placeholder="Own 4 rental units" />
            <TextArea label="Why it matters" value={data.oneYear.why} onChange={(v) => setGoal('oneYear', 'why', v)} />
          </div>
        </Card>
        <Card title="3-Year Vision">
          <div className="space-y-3">
            <Field label="Target" value={data.threeYear.target} onChange={(v) => setGoal('threeYear', 'target', v)} placeholder="$10k/mo passive income" />
            <TextArea label="Why it matters" value={data.threeYear.why} onChange={(v) => setGoal('threeYear', 'why', v)} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data.quarters.map((q, i) => (
          <Card key={i} title={`Q${i + 1}`}>
            <div className="space-y-3">
              <Field label="Focus" value={q.focus} onChange={(v) => setQ(i, 'focus', v)} placeholder="Theme for the quarter" />
              <TextArea label="Milestones" value={q.milestones} onChange={(v) => setQ(i, 'milestones', v)} placeholder="3 key outcomes…" />
              <TextArea label="Deals to Close" value={q.deals} onChange={(v) => setQ(i, 'deals', v)} rows={2} />
              <TextArea label="Learning / Skills" value={q.learning} onChange={(v) => setQ(i, 'learning', v)} rows={2} />
            </div>
          </Card>
        ))}
      </div>

      <Card title="Weekly Commitments">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Lead Generation" value={data.weekly.lead} onChange={(v) => setWeekly('lead', v)} placeholder="20 calls / 50 letters" />
          <Field label="Deal Analysis" value={data.weekly.analyze} onChange={(v) => setWeekly('analyze', v)} placeholder="5 deals / week" />
          <Field label="Networking" value={data.weekly.network} onChange={(v) => setWeekly('network', v)} placeholder="2 meetups / month" />
          <Field label="Learning" value={data.weekly.learn} onChange={(v) => setWeekly('learn', v)} placeholder="3 hrs / week" />
        </div>
      </Card>
    </div>
  );
});

export default TwelveMonthActionPlan;
