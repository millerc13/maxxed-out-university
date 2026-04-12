'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function TextInput({ label, value, onChange, id, placeholder }: { label: string; value: string; onChange: (v: string) => void; id: string; placeholder?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
    </label>
  );
}

function InlineField({ value, placeholder }: { value: string; placeholder: string }) {
  return (
    <span className={`font-semibold ${value ? 'text-[#0000CC]' : 'text-[#0000CC]/50 italic'}`}>
      {value || `[${placeholder}]`}
    </span>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star === value ? 0 : star)}
          className={`text-lg leading-none transition-colors ${star <= value ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}>
          &#9733;
        </button>
      ))}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
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

interface AgentRow {
  name: string;
  brokerage: string;
  phone: string;
  rating: number;
  notes: string;
}

const emptyAgent = (): AgentRow => ({ name: '', brokerage: '', phone: '', rating: 0, notes: '' });

interface Fields {
  yourName: string;
  numProperties: string;
  investmentStrategy: string;
}

const defaults: Fields = {
  yourName: '',
  numProperties: '',
  investmentStrategy: '',
};

const KEY_POINTS = [
  { topic: 'Speed', message: 'I can close quickly and make decisions fast. No analysis paralysis.' },
  { topic: 'Volume', message: 'I plan to do multiple deals this year and want a consistent partner.' },
  { topic: 'No Emotions', message: 'I buy based on numbers, not emotions. Less hand-holding needed.' },
  { topic: 'Commissions', message: 'You\'ll earn commissions on every deal, and I won\'t ask for rebates.' },
  { topic: 'Referrals', message: 'I network with other investors and will refer you to them.' },
  { topic: 'Easy to Work With', message: 'I know the process and won\'t waste your time on showings I\'m not serious about.' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const AgentOutreachScript = forwardRef<ToolHandle>(function AgentOutreachScript(_, ref) {
  const [f, setF] = useState<Fields>(defaults);
  const [agents, setAgents] = useState<AgentRow[]>([emptyAgent(), emptyAgent(), emptyAgent()]);

  const set = useCallback((key: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [key]: v })), []);

  const handleReset = useCallback(() => {
    setF(defaults);
    setAgents([emptyAgent(), emptyAgent(), emptyAgent()]);
  }, []);

  const setAgent = useCallback((idx: number, key: keyof AgentRow, v: string | number) => {
    setAgents((prev) => prev.map((a, i) => (i === idx ? { ...a, [key]: v } : a)));
  }, []);

  const addAgent = useCallback(() => setAgents((prev) => [...prev, emptyAgent()]), []);
  const removeAgent = useCallback((idx: number) => setAgents((prev) => prev.filter((_, i) => i !== idx)), []);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Agent Outreach Script',
      type: 'script',
      sections: [
        {
          heading: 'Your Information',
          rows: [
            { label: 'Your Name', value: f.yourName || '---' },
            { label: 'Target Properties This Year', value: f.numProperties || '---' },
            { label: 'Investment Strategy', value: f.investmentStrategy || '---' },
          ],
        },
        {
          heading: 'Initial Contact Script',
          paragraphs: [
            `"Hi [Agent Name], my name is ${f.yourName || '[Your Name]'} and I'm a local real estate investor."`,
            `"I'm looking to purchase ${f.numProperties || '[X]'} properties this year and I'm building relationships with agents who enjoy working with investors."`,
            `"My primary strategy is ${f.investmentStrategy || '[your strategy]'}, so I'm looking for someone familiar with those types of deals."`,
            `"Do you have a few minutes to chat about potentially working together?"`,
          ],
        },
        {
          heading: 'Qualifying Questions',
          paragraphs: [
            '1. How many investor clients do you currently work with?',
            '2. What areas do you specialize in?',
            '3. How quickly can you set up showings?',
            '4. Are you comfortable writing offers below asking?',
            '5. Can you pull comps and run a CMA for me?',
          ],
        },
        {
          heading: 'Key Points to Communicate',
          table: {
            headers: ['Topic', 'What to Communicate'],
            rows: KEY_POINTS.map((kp) => [kp.topic, kp.message]),
          },
        },
        {
          heading: 'Agent Tracker',
          table: {
            headers: ['Agent Name', 'Brokerage', 'Phone', 'Rating', 'Notes'],
            rows: agents.filter((a) => a.name).map((a) => [a.name, a.brokerage, a.phone, a.rating ? `${a.rating}/5` : '', a.notes]),
          },
        },
      ],
    }),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            <h2 className="text-2xl font-bold text-gray-900">Agent Outreach Script</h2>
            <p className="mt-1 text-sm text-gray-500">Script for connecting with real estate agents as an investor</p>
          </div>
        </div>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100">
          Reset All
        </button>
      </div>

      {/* Fill-in fields */}
      <Section title="Your Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextInput label="Your Name" value={f.yourName} onChange={set('yourName')} id="ao-name" />
          <TextInput label="# Properties This Year" value={f.numProperties} onChange={set('numProperties')} id="ao-num" placeholder="10" />
          <TextInput label="Investment Strategy" value={f.investmentStrategy} onChange={set('investmentStrategy')} id="ao-strategy" placeholder="Buy & Hold, BRRRR, etc." />
        </div>
      </Section>

      {/* Script */}
      <Section title="Initial Contact Script">
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div className="rounded-lg bg-gray-50 p-4 border-l-4 border-[#0000CC]">
            <p className="mb-3">
              &ldquo;Hi [Agent Name], my name is <InlineField value={f.yourName} placeholder="Your Name" /> and I&apos;m a local real estate investor.&rdquo;
            </p>
            <p className="mb-3">
              &ldquo;I&apos;m looking to purchase <InlineField value={f.numProperties} placeholder="X" /> properties this year and I&apos;m building relationships with agents who enjoy working with investors.&rdquo;
            </p>
            <p className="mb-3">
              &ldquo;My primary strategy is <InlineField value={f.investmentStrategy} placeholder="your strategy" />, so I&apos;m looking for someone familiar with those types of deals.&rdquo;
            </p>
            <p>
              &ldquo;Do you have a few minutes to chat about potentially working together?&rdquo;
            </p>
          </div>
        </div>
      </Section>

      {/* Qualifying Questions */}
      <Section title="Qualifying Questions">
        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside leading-relaxed">
          <li>How many investor clients do you currently work with?</li>
          <li>What areas do you specialize in?</li>
          <li>How quickly can you set up showings?</li>
          <li>Are you comfortable writing offers below asking?</li>
          <li>Can you pull comps and run a CMA for me?</li>
        </ol>
      </Section>

      {/* Key Points */}
      <Section title="Key Points to Communicate">
        <div className="space-y-2">
          {KEY_POINTS.map((kp, i) => (
            <div key={i} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-[#0000CC]/10 px-2.5 py-0.5 text-xs font-bold text-[#0000CC]">
                {kp.topic}
              </span>
              <span className="text-sm text-gray-700">{kp.message}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Agent Tracker */}
      <Section title="Agent Tracker" defaultOpen={false}>
        <div className="space-y-2">
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_0.8fr_auto_1fr_auto] gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            <span>Agent Name</span><span>Brokerage</span><span>Phone</span><span>Rating</span><span>Notes</span><span></span>
          </div>
          {agents.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_0.8fr_auto_1fr_auto] gap-2 items-center">
              <input type="text" value={a.name} onChange={(e) => setAgent(i, 'name', e.target.value)} placeholder="Name"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-sm outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
              <input type="text" value={a.brokerage} onChange={(e) => setAgent(i, 'brokerage', e.target.value)} placeholder="Brokerage"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-sm outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
              <input type="text" value={a.phone} onChange={(e) => setAgent(i, 'phone', e.target.value)} placeholder="Phone"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-sm outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
              <RatingInput value={a.rating} onChange={(v) => setAgent(i, 'rating', v)} />
              <input type="text" value={a.notes} onChange={(e) => setAgent(i, 'notes', e.target.value)} placeholder="Notes"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-sm outline-none text-gray-900 focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all" />
              <button type="button" onClick={() => removeAgent(i)}
                className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors" title="Remove">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={addAgent}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0000CC] hover:text-[#0000AA] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Agent
          </button>
        </div>
      </Section>
    </div>
  );
});

export default AgentOutreachScript;
