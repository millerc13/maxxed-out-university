'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  callout?: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Slide 1',
    title: 'The Opportunity',
    body: "Your money is working too hard for the wrong people. Banks pay you 4%. The stock market swings 20% in a month. Real estate — backed by a hard asset you can see and touch — pays double-digit returns without the drama.",
    bullets: [
      'Secured by real property (you\'re a lien-holder, not an investor)',
      'Fixed return — no correlation to stock market volatility',
      'Short duration — typically 6 to 18 months per deal',
    ],
  },
  {
    eyebrow: 'Slide 2',
    title: 'Who I Am',
    body: "I buy distressed real estate, rehab it, and either sell for a profit or refinance into long-term rentals. I bring deals; you bring capital. We both win.",
    bullets: [
      'Full-time real estate investor',
      'Focused market: [YOUR CITY / COUNTY]',
      'Track record: [X DEALS CLOSED / $X IN VALUE]',
      'Education: Maxxed Out University — Real Estate Empire Blueprint',
    ],
  },
  {
    eyebrow: 'Slide 3',
    title: 'The Business Model',
    body: "I buy at 70% of After-Repair Value minus rehab costs. That leaves 30% of ARV as built-in equity to cover holding costs, closing fees, and profit — and to protect YOUR loan.",
    callout: 'Example: $200k ARV × 0.70 = $140k, minus $30k rehab = $110k max offer. Your loan of $130k is secured by a property worth $200k.',
  },
  {
    eyebrow: 'Slide 4',
    title: 'Your Position — The Terms',
    body: "You lend, secured by a first-position lien on the property. If anything goes wrong, you foreclose. I never see the money without your signature.",
    bullets: [
      'Interest rate: 8% – 12% annual (deal dependent)',
      'Term: 6 – 18 months, interest-only',
      'Points: 1–2 upfront (on top of interest)',
      'Security: first-position deed of trust / mortgage',
      'LTV cap: never above 70% of ARV',
    ],
  },
  {
    eyebrow: 'Slide 5',
    title: 'How Your Money Is Protected',
    body: "Three layers stand between your capital and any risk.",
    bullets: [
      'Equity cushion — 30% built in at purchase',
      'First-lien position — you\'re paid before anyone else if the property sells',
      "Title insurance — lender's policy covering your exact loan amount",
      'Hazard insurance — you named as mortgagee on the policy',
      'Independent title company handles funds at close',
    ],
  },
  {
    eyebrow: 'Slide 6',
    title: 'The Deal Flow',
    body: "Here's exactly what happens from the day you fund to the day you get paid back.",
    bullets: [
      '1. I identify a deal, send you the analysis (ARV, rehab, comps)',
      '2. You approve — we close through a title company',
      '3. I execute the rehab (typically 8–12 weeks)',
      '4. Exit: sell for profit OR refinance into long-term hold',
      '5. You get principal + interest back in full',
    ],
  },
  {
    eyebrow: 'Slide 7',
    title: 'The Numbers on a Typical Deal',
    body: "Here's what $100k earning 10% looks like on a real project.",
    callout: '$100,000 loan × 10% × 12 months = $10,000 interest + 2 points ($2,000) = $12,000 total return. Secured against a property worth 43% more than you lent.',
    bullets: [
      'Compare: 4% CD = $4,000',
      'Compare: 7% S&P average = $7,000 (with volatility)',
      'Private money: $12,000 — backed by an actual house',
    ],
  },
  {
    eyebrow: 'Slide 8',
    title: 'FAQ',
    body: 'The questions every smart lender asks.',
    bullets: [
      '"What if you default?" → You foreclose and take the property. Every deal is sized so foreclosure leaves you whole.',
      '"What if the market drops?" → 30% equity cushion absorbs a significant downturn before your principal is at risk.',
      '"What if the rehab goes over budget?" → That hits MY profit first, not your loan.',
      '"Can I use my IRA?" → Yes. Self-directed IRA lending is the fastest-growing source of private capital.',
    ],
  },
  {
    eyebrow: 'Slide 9',
    title: 'Next Steps',
    body: "If this makes sense, here's how we move forward.",
    bullets: [
      '1. Short call — answer any open questions (20 minutes)',
      '2. I send the next available deal for your review',
      '3. You approve the deal and the terms in writing',
      '4. We close through title; you wire funds to escrow',
      '5. You start collecting interest on day one',
    ],
    callout: '"The best time to build a real-estate lending relationship was 10 years ago. The second-best time is today."',
  },
];

export const PrivateMoneyPitchDeck = forwardRef<ToolHandle>(function PrivateMoneyPitchDeck(_, ref) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(SLIDES.length - 1, i + 1));

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Private Money Pitch Deck',
      type: 'template',
      sections: SLIDES.map((s) => ({
        heading: `${s.eyebrow}: ${s.title}`,
        paragraphs: [s.body, ...(s.callout ? [s.callout] : [])],
        ...(s.bullets ? { checkItems: s.bullets.map((b) => ({ label: b, checked: false })) } : {}),
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Private Money Pitch Deck</h2>
          <p className="mt-1 text-sm text-gray-500">Nine slides Todd uses to turn contacts into private lenders.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-[#0a0f29] to-[#0000CC]/70 text-white shadow-xl overflow-hidden">
        <div className="p-6 sm:p-10 min-h-[380px] sm:min-h-[440px] flex flex-col">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">{slide.eyebrow}</p>
          <h3 className="text-2xl sm:text-4xl font-extrabold leading-tight mb-4">{slide.title}</h3>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-5">{slide.body}</p>

          {slide.bullets && (
            <ul className="space-y-2 mb-5">
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-sm sm:text-base text-white/90 leading-relaxed">
                  <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.callout && (
            <div className="mt-auto rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm p-4 sm:p-5">
              <p className="text-sm sm:text-base italic text-white leading-relaxed">{slide.callout}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-black/30 border-t border-white/10">
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            aria-label="Previous slide"
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === idx ? 'w-6 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            disabled={idx === SLIDES.length - 1}
            aria-label="Next slide"
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Slide {idx + 1} of {SLIDES.length} — customize bracketed placeholders with your real numbers before presenting.
      </p>
    </div>
  );
});

export default PrivateMoneyPitchDeck;
