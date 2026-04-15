'use client';

import { forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { Search, FileText, Hammer, Home, DollarSign, Wrench } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import type { LucideIcon } from 'lucide-react';

interface Phase {
  weeks: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  tasks: string[];
}

const PHASES: Phase[] = [
  {
    weeks: 'Week 1–2',
    title: 'Acquisition',
    icon: Search,
    summary: 'Find it, run the numbers, lock it up.',
    tasks: [
      'Source off-market lead or MLS candidate',
      'Pull comps — identify realistic ARV',
      'Walk the property; build rehab scope',
      'Apply the 70% Rule — (ARV × 0.70) − Rehab = max offer',
      'Submit offer, negotiate, get under contract',
      'Lock hard money or private money commitment',
    ],
  },
  {
    weeks: 'Week 3',
    title: 'Due Diligence & Close',
    icon: FileText,
    summary: 'Verify everything and fund the deal.',
    tasks: [
      'Order inspection — no surprises after closing',
      'Confirm title is clean via the title company',
      'Finalize rehab budget + scope of work with contractor',
      'Line up insurance (vacant dwelling / builder\'s risk)',
      'Close and take keys — clock is ticking on holding costs',
    ],
  },
  {
    weeks: 'Week 4–12',
    title: 'Rehab',
    icon: Hammer,
    summary: 'Execute the scope on budget and on schedule.',
    tasks: [
      'Day 1: demo + dumpster on site',
      'Weeks 1–3: rough mechanicals (plumbing, electrical, HVAC)',
      'Weeks 3–6: drywall, paint, flooring, trim',
      'Weeks 6–8: kitchen + bath installs, fixtures',
      'Final: punch list, clean, stage (if flipping for retail)',
      'Weekly site visits. Never trust timelines — verify in person.',
    ],
  },
  {
    weeks: 'Week 12–14',
    title: 'Market & Show',
    icon: Home,
    summary: 'Get eyes on it and get offers.',
    tasks: [
      'Professional photos + drone shots',
      'List on MLS with a flat-fee broker or full-service agent',
      'Push on Facebook Marketplace, Zillow, local investor groups',
      'Host open house weekends 1 and 2',
      'Respond to every showing request within 1 hour',
    ],
  },
  {
    weeks: 'Week 14–18',
    title: 'Under Contract',
    icon: Wrench,
    summary: 'Buyer financing, appraisal, repairs.',
    tasks: [
      'Accept offer, collect earnest money',
      'Buyer inspection — negotiate repairs, not price',
      'Appraisal — if low, push back with comps or renegotiate',
      'Complete any lender-required repairs immediately',
      'Clear title commitment + final walkthrough',
    ],
  },
  {
    weeks: 'Week 18–20',
    title: 'Close & Cash',
    icon: DollarSign,
    summary: 'Sign, fund, deposit the check.',
    tasks: [
      'Review closing disclosure — verify every line',
      'Sign closing documents',
      'Pay off hard money / private lender same day',
      'Wire proceeds to your LLC account',
      'Post-mortem: What worked? What to change next deal?',
    ],
  },
];

export const FixFlipTimeline = forwardRef<ToolHandle>(function FixFlipTimeline(_, ref) {
  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Fix & Flip Timeline',
      type: 'template',
      sections: PHASES.map((p) => ({
        heading: `${p.weeks} — ${p.title}`,
        paragraphs: [p.summary],
        checkItems: p.tasks.map((t) => ({ label: t, checked: false })),
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Fix &amp; Flip Timeline</h2>
          <p className="mt-1 text-sm text-gray-500">A 20-week game plan from first offer to final check.</p>
        </div>
      </div>

      <div className="relative">
        {/* Vertical rail (hidden on mobile, shown on sm+) */}
        <div className="hidden sm:block absolute left-[27px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />

        <ol className="space-y-3">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            return (
              <li key={p.title} className="relative">
                <div className="flex gap-0 sm:gap-4">
                  <div className="hidden sm:flex flex-shrink-0 w-14 h-14 rounded-full bg-white border-2 border-[#0000CC]/20 items-center justify-center relative z-10 shadow-sm">
                    <Icon className="w-6 h-6 text-[#0000CC]" />
                  </div>
                  <div className="flex-1 rounded-xl bg-white shadow-sm border border-gray-100 p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="sm:hidden w-10 h-10 rounded-xl bg-[#0000CC]/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#0000CC]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0000CC]/70">{p.weeks} · Phase {i + 1}</p>
                        <h3 className="text-base sm:text-[17px] font-bold text-gray-900 leading-snug">{p.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{p.summary}</p>
                    <ul className="space-y-1.5">
                      {p.tasks.map((t, idx) => (
                        <li key={idx} className="flex gap-2.5 text-sm text-gray-700">
                          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0000CC]/40" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
});

export default FixFlipTimeline;
