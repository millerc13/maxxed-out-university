'use client';

import { useState, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
        <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

interface ObjectionItem {
  objection: string;
  response: string;
  principle: string;
}

const PRICE_OBJECTIONS: ObjectionItem[] = [
  {
    objection: '"Your offer is too low."',
    response: 'I completely understand that. My offer is based on the current condition of the property and the repairs that will be needed. I also pay all closing costs and can close on your timeline. What number did you have in mind? Maybe we can find something that works for both of us.',
    principle: 'Acknowledge, explain your logic, then redirect to their number.',
  },
  {
    objection: '"My neighbor sold their house for more."',
    response: 'That\'s great for your neighbor! Every property is unique though — condition, updates, and timing all play a role. I\'d love to show you the specific comparables I used. Would that be helpful?',
    principle: 'Don\'t argue. Redirect to data and specifics.',
  },
  {
    objection: '"I\'ll just list it with a Realtor."',
    response: 'That\'s absolutely an option. Just keep in mind you\'ll typically pay 5-6% in commissions, plus closing costs, plus any repairs the buyer requests after inspection. With me, your offer is net — no commissions, no repair requests, and we close fast. Happy to break down the numbers side by side if you\'d like.',
    principle: 'Don\'t compete with agents. Show the net-to-seller comparison.',
  },
];

const TIMELINE_OBJECTIONS: ObjectionItem[] = [
  {
    objection: '"I\'m not in a hurry to sell."',
    response: 'No problem at all. I work on the seller\'s timeline. Is it okay if I follow up in a few weeks? Sometimes situations change and I want to be a resource for you whenever you\'re ready.',
    principle: 'Stay patient. Plant the seed for future follow-up.',
  },
  {
    objection: '"I need to talk to my spouse / family first."',
    response: 'Absolutely, this is a big decision. Would it help if I was available to answer any questions they might have? I\'m happy to set up a time when we can all chat together.',
    principle: 'Include all decision-makers early. Offer to speak with them directly.',
  },
  {
    objection: '"Can you give me more time to decide?"',
    response: 'Of course. I want you to feel 100% comfortable. My offer is good for [X] days. Take the time you need — I\'ll be here when you\'re ready.',
    principle: 'Set a deadline but don\'t pressure. Create gentle urgency.',
  },
];

const TRUST_OBJECTIONS: ObjectionItem[] = [
  {
    objection: '"How do I know this is legit?"',
    response: 'Great question — you should always protect yourself. I\'m happy to provide references from other sellers I\'ve worked with, my business credentials, and we use a licensed title company to handle everything. You\'ll have full transparency throughout the process.',
    principle: 'Validate their concern. Offer proof, not promises.',
  },
  {
    objection: '"I\'ve heard about scams with investors."',
    response: 'You\'re smart to be cautious. There are bad actors in every industry. Here\'s what sets me apart: I use a reputable title company, everything goes through an attorney, and I never ask you to sign anything without reviewing it first. I can also send you my reviews and references.',
    principle: 'Acknowledge the concern as valid. Differentiate yourself with process.',
  },
  {
    objection: '"Why would you buy my house if it needs so much work?"',
    response: 'That\'s exactly my business model. I buy properties that need work, fix them up, and either sell them or rent them out. The repairs are factored into my offer, which is why I can buy it as-is so you don\'t have to deal with contractors or projects.',
    principle: 'Be transparent about your business model. Education builds trust.',
  },
];

const ALL_SECTIONS = [
  { title: 'Price Objections', items: PRICE_OBJECTIONS },
  { title: 'Timeline Objections', items: TIMELINE_OBJECTIONS },
  { title: 'Trust Objections', items: TRUST_OBJECTIONS },
];

const SellerObjectionHandling = forwardRef<ToolHandle>(function SellerObjectionHandling(_, ref) {
  // User can add their own notes per objection
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateNote = (key: string, value: string) => {
    setNotes(prev => ({ ...prev, [key]: value }));
  };

  const resetAll = () => setNotes({});

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Seller Objection Handling Guide',
      type: 'script',
      sections: ALL_SECTIONS.flatMap(section => [
        {
          heading: section.title,
          table: {
            headers: ['Objection', 'Recommended Response', 'Key Principle'],
            rows: section.items.map(item => [
              item.objection,
              item.response,
              item.principle,
            ]),
          },
        },
        // Include user notes if any
        ...section.items
          .filter(item => notes[item.objection])
          .map(item => ({
            heading: `Your Notes — ${item.objection}`,
            paragraphs: [notes[item.objection]],
          })),
      ]),
    }),
  }));

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={120}
            height={47}
            className="h-10 w-auto hidden sm:block"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seller Objection Handling</h1>
            <p className="mt-1 text-sm text-gray-500">
              Common seller objections with proven responses. Add your own notes to customize your approach.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {ALL_SECTIONS.map(section => (
            <Section key={section.title} title={section.title}>
              <div className="space-y-4">
                {section.items.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* Objection */}
                    <div className="bg-red-50 px-5 py-3 border-b border-red-100">
                      <p className="text-sm font-bold text-red-800">{item.objection}</p>
                    </div>

                    {/* Response */}
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recommended Response</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{item.response}</p>
                      </div>

                      {/* Principle */}
                      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-2">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">Key Principle</p>
                        <p className="text-sm text-blue-800">{item.principle}</p>
                      </div>

                      {/* User Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Your Notes</label>
                        <textarea
                          value={notes[item.objection] || ''}
                          onChange={e => updateNote(item.objection, e.target.value)}
                          placeholder="Add your own notes, variations, or personal touches..."
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm
                            focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
                            outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ))}

          <div className="flex justify-end pb-8">
            <button type="button" onClick={resetAll}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm">
              Reset Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SellerObjectionHandling;
