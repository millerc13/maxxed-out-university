'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

interface Strategy {
  name: string;
  oneLiner: string;
  bestFor: string;
  structure: string[];
  pros: string[];
  watchOuts: string[];
  pitchLine: string;
}

const STRATEGIES: Strategy[] = [
  {
    name: 'Seller Finance',
    oneLiner: 'The seller becomes the bank.',
    bestFor: 'Free-and-clear properties where the seller wants monthly income, not a lump sum.',
    structure: [
      'Agree on price, down payment, interest rate, term, and balloon (if any)',
      'Execute a promissory note + deed of trust / mortgage',
      'You get title at closing; seller gets paid monthly',
      'If you default, seller forecloses and takes the property back',
    ],
    pros: [
      'No bank approval, no appraisal delays',
      'Flexible terms — you design the deal',
      'Lower closing costs than institutional loans',
    ],
    watchOuts: [
      'Make sure title is clean and the seller can legally convey',
      'Record the deed/mortgage immediately',
      'Balloon payments — have an exit plan 2–3 years out',
    ],
    pitchLine: '"Mr. Seller, instead of getting one check and paying taxes on it, what if I paid you every month with interest for the next 10 years — tax-advantaged income, better than a CD?"',
  },
  {
    name: 'Subject-To (Sub2)',
    oneLiner: 'You take title. The loan stays in the seller\'s name.',
    bestFor: 'Sellers in distress with low-rate existing mortgages they can\'t keep paying.',
    structure: [
      'Seller deeds the property to you',
      'Existing mortgage stays in seller\'s name — you make the payments',
      'Use escrow/servicing company to document payments to protect both sides',
      'Refinance, sell, or pay off down the road',
    ],
    pros: [
      'Inherit below-market interest rates',
      'No new loan qualification',
      'Low or no down payment',
    ],
    watchOuts: [
      'Due-on-sale clause — lender CAN call the loan if they discover it',
      'Seller must trust you to make payments — relationship is everything',
      'Work with a real estate attorney; use a land trust if needed',
    ],
    pitchLine: '"I can stop the foreclosure this week, take over your payments, and hand you a clean credit report six months from now. You walk away. I handle it from here."',
  },
  {
    name: 'Lease Option',
    oneLiner: 'Rent now, buy later — with the price locked in today.',
    bestFor: 'Sellers who can\'t sell fast but need cash flow; buyers who need time to qualify for financing.',
    structure: [
      'Sign a lease + a separate option-to-purchase agreement',
      'Pay option consideration upfront (credited at purchase)',
      'Lock in today\'s price for 1–3 years',
      'Exercise the option before it expires, or walk away (lose consideration)',
    ],
    pros: [
      'Low capital to control a property',
      'Lock in price before appreciation',
      'Test the property as a rental before committing',
    ],
    watchOuts: [
      'Option consideration is usually non-refundable — know your exit',
      'Some states re-classify lease options as installment sales — check local law',
      'Make sure you can actually qualify for a loan before the option expires',
    ],
    pitchLine: '"I\'ll give you $5,000 today to lock the price at $250k for 24 months, and pay you $1,800/month while I line up my financing."',
  },
  {
    name: 'Private Money',
    oneLiner: 'Borrow from individuals — not institutions.',
    bestFor: 'Funding fast on flips, BRRRR purchases, or bridge capital between closings.',
    structure: [
      'Identify accredited/non-accredited lenders (family, friends, network, self-directed IRAs)',
      'Offer a secured position: first or second lien on the property',
      'Typical terms: 8–12% interest, 1–3 year term, interest-only with balloon',
      'Draft a note + mortgage/deed of trust, use a title company to close',
    ],
    pros: [
      'Close in days, not weeks',
      'Flexible terms negotiated deal-by-deal',
      'Lender sees passive double-digit returns backed by real property',
    ],
    watchOuts: [
      'Never commingle private funds with personal accounts',
      'Follow securities laws — multiple lenders pooled into one project = syndication',
      'Your word is your brand; miss one payment and the pipeline dries up',
    ],
    pitchLine: '"I pay you 10% interest, secured by a first lien on a property worth 30% more than my loan. You do nothing. I do everything. Your money is safer than in the stock market."',
  },
  {
    name: 'Wrap Mortgage',
    oneLiner: 'Layer a new loan on top of an existing one.',
    bestFor: 'Seller-finance deals where the seller has existing debt on the property.',
    structure: [
      'Seller carries a new note to you at a higher rate than their existing mortgage',
      'You pay the seller; seller pays their underlying lender',
      'Spread between rates = seller\'s ongoing profit',
      'Document carefully — same due-on-sale risk as Sub2',
    ],
    pros: [
      'Enables seller-finance on financed properties',
      'Seller earns an arbitrage spread on their existing loan',
    ],
    watchOuts: [
      'Due-on-sale clause risk',
      'Complex paperwork — always use an attorney',
      'Seller must trust you to keep their underlying loan current',
    ],
    pitchLine: '"Your 4% mortgage keeps paying itself. I pay you 7% on top of it. You clear 3% every month for doing nothing — on a property you no longer own."',
  },
];

function StrategyCard({ s, open, onToggle }: { s: Strategy; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-[17px] font-bold text-gray-900 leading-snug">{s.name}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{s.oneLiner}</p>
        </div>
        <ChevronDown className={`flex-shrink-0 w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Best For</p>
            <p className="text-sm text-gray-700">{s.bestFor}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">How It's Structured</p>
            <ol className="space-y-1.5 text-sm text-gray-700">
              {s.structure.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0000CC]/10 text-[#0000CC] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pros</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {s.pros.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            </div>
            <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Watch-Outs</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {s.watchOuts.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          </div>
          <div className="rounded-lg bg-gray-900 text-gray-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#ffffff]/60 mb-1.5">Todd's Pitch Line</p>
            <p className="text-sm italic leading-relaxed">{s.pitchLine}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export const CreativeFinanceCheatSheet = forwardRef<ToolHandle>(function CreativeFinanceCheatSheet(_, ref) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Creative Finance Cheat Sheet',
      type: 'template',
      sections: STRATEGIES.map((s) => ({
        heading: s.name,
        paragraphs: [
          s.oneLiner,
          `BEST FOR: ${s.bestFor}`,
          `STRUCTURE: ${s.structure.join(' → ')}`,
          `PROS: ${s.pros.join('; ')}`,
          `WATCH-OUTS: ${s.watchOuts.join('; ')}`,
          `PITCH: ${s.pitchLine}`,
        ],
      })),
    }),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-4">
        <Image
          src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
          alt="Maxxed Out"
          width={120}
          height={47}
          className="h-10 w-auto hidden sm:block"
        />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Creative Finance Cheat Sheet</h2>
          <p className="mt-1 text-sm text-gray-500">Five ways to buy without a bank — when to use each, and how Todd pitches them.</p>
        </div>
      </div>

      <div className="space-y-3">
        {STRATEGIES.map((s, i) => (
          <StrategyCard key={s.name} s={s} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
        ))}
      </div>
    </div>
  );
});

export default CreativeFinanceCheatSheet;
