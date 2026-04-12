'use client';

import { useState, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white outline-none transition-all" />
    </div>
  );
}

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

function InlineFill({ value, fallback }: { value: string; fallback: string }) {
  return (
    <span className={`font-semibold ${value ? 'text-[#0000CC]' : 'text-gray-400 italic'}`}>
      {value || `[${fallback}]`}
    </span>
  );
}

function ScriptBlock({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed space-y-3">
      {children}
    </div>
  );
}

const SellerCallScript = forwardRef<ToolHandle>(function SellerCallScript(_, ref) {
  const [yourName, setYourName] = useState('');
  const [company, setCompany] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [sellerName, setSellerName] = useState('');

  const [qualifiers, setQualifiers] = useState({
    behindOnPayments: false,
    preForeclosure: false,
    divorce: false,
    inherited: false,
    relocating: false,
    tiredLandlord: false,
    vacantProperty: false,
    needsRepairs: false,
  });

  const toggleQualifier = (key: keyof typeof qualifiers) => {
    setQualifiers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const QUALIFIER_LABELS: Record<keyof typeof qualifiers, string> = {
    behindOnPayments: 'Behind on payments',
    preForeclosure: 'Pre-foreclosure',
    divorce: 'Divorce / separation',
    inherited: 'Inherited property',
    relocating: 'Relocating',
    tiredLandlord: 'Tired landlord',
    vacantProperty: 'Vacant property',
    needsRepairs: 'Needs major repairs',
  };

  const OBJECTION_RESPONSES = [
    { objection: '"I need to think about it."', response: 'Absolutely, take your time. What specific concerns do you have that I can help address right now?' },
    { objection: '"Your offer is too low."', response: 'I understand. My offer is based on the repairs needed and current market. What number did you have in mind? Let\'s see if we can find middle ground.' },
    { objection: '"I\'m going to list with an agent."', response: 'That\'s a great option. Just keep in mind — agent commissions, closing costs, and time on market can add up. My offer is net to you with no fees and a fast close.' },
    { objection: '"I\'m not in a rush."', response: 'No problem at all. I like to stay in touch — is it okay if I follow up in a few weeks to see if anything has changed?' },
  ];

  const resetAll = () => {
    setYourName(''); setCompany(''); setPropertyAddress(''); setSellerName('');
    setQualifiers({ behindOnPayments: false, preForeclosure: false, divorce: false, inherited: false, relocating: false, tiredLandlord: false, vacantProperty: false, needsRepairs: false });
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => {
      const checkedQualifiers = Object.entries(qualifiers).filter(([, v]) => v).map(([k]) => QUALIFIER_LABELS[k as keyof typeof qualifiers]);
      return {
        title: 'Seller Call Script',
        type: 'script',
        sections: [
          {
            heading: 'Call Setup',
            rows: [
              { label: 'Your Name', value: yourName || '-' },
              { label: 'Company', value: company || '-' },
              { label: 'Property Address', value: propertyAddress || '-' },
              { label: 'Seller Name', value: sellerName || '-' },
            ],
          },
          {
            heading: 'Opening Script',
            paragraphs: [
              `"Hi, is this ${sellerName || '[Seller Name]'}? My name is ${yourName || '[Your Name]'} with ${company || '[Company]'}. I'm calling about your property at ${propertyAddress || '[Address]'}."`,
              `"I'm a local real estate investor and I help homeowners who are looking for a fast, hassle-free way to sell. Do you have a couple of minutes?"`,
            ],
          },
          {
            heading: 'Building Rapport',
            paragraphs: [
              `"How long have you owned the property?"`,
              `"What made you think about selling?"`,
              `"Is anyone else living there or is it vacant?"`,
              `"Have you talked to any other buyers or agents?"`,
            ],
          },
          {
            heading: 'Qualifying — Motivation Indicators',
            checkItems: Object.entries(QUALIFIER_LABELS).map(([key, label]) => ({
              label,
              checked: qualifiers[key as keyof typeof qualifiers],
            })),
          },
          {
            heading: 'Offer Discussion',
            paragraphs: [
              `"Based on what you've told me, I'd like to take a closer look at the property and put together an offer."`,
              `"I typically close in 2-3 weeks, pay all closing costs, and buy as-is — no repairs needed on your end."`,
              `"Would you be open to me coming by to see the property this week?"`,
            ],
          },
          {
            heading: 'Closing — Next Steps',
            paragraphs: [
              `"Great, I'll plan to visit [date/time]. I'll bring a simple one-page agreement — no pressure, just so you can see the terms."`,
              `"What's the best number to reach you at? And is there a co-owner or spouse who should be part of the conversation?"`,
              `"Thank you ${sellerName || '[Seller Name]'}, I look forward to meeting you."`,
            ],
          },
          {
            heading: 'Quick Objection Reference',
            table: {
              headers: ['Objection', 'Response'],
              rows: OBJECTION_RESPONSES.map(o => [o.objection, o.response]),
            },
          },
          ...(checkedQualifiers.length > 0 ? [{
            heading: 'Motivation Indicators Identified',
            paragraphs: checkedQualifiers,
          }] : []),
        ],
      };
    },
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
            <h1 className="text-2xl font-bold text-gray-900">Seller Call Script</h1>
            <p className="mt-1 text-sm text-gray-500">Step-by-step script for motivated seller calls. Fill in your details to personalize.</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Setup Fields */}
          <Section title="Call Setup">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Your Name" value={yourName} onChange={setYourName} placeholder="John Smith" />
              <TextInput label="Company Name" value={company} onChange={setCompany} placeholder="ABC Investments" />
              <TextInput label="Property Address" value={propertyAddress} onChange={setPropertyAddress} placeholder="123 Main St" />
              <TextInput label="Seller Name" value={sellerName} onChange={setSellerName} placeholder="Jane Doe" />
            </div>
          </Section>

          {/* Opening */}
          <Section title="1. Opening">
            <ScriptBlock>
              <p>&ldquo;Hi, is this <InlineFill value={sellerName} fallback="Seller Name" />? My name is <InlineFill value={yourName} fallback="Your Name" /> with <InlineFill value={company} fallback="Company" />. I&rsquo;m calling about your property at <InlineFill value={propertyAddress} fallback="Address" />.&rdquo;</p>
              <p>&ldquo;I&rsquo;m a local real estate investor and I help homeowners who are looking for a fast, hassle-free way to sell. Do you have a couple of minutes?&rdquo;</p>
            </ScriptBlock>
          </Section>

          {/* Building Rapport */}
          <Section title="2. Building Rapport">
            <ScriptBlock>
              <p>&ldquo;How long have you owned the property?&rdquo;</p>
              <p>&ldquo;What made you think about selling?&rdquo;</p>
              <p>&ldquo;Is anyone else living there or is it vacant?&rdquo;</p>
              <p>&ldquo;Have you talked to any other buyers or agents?&rdquo;</p>
            </ScriptBlock>
            <p className="text-xs text-gray-400">Listen more than you talk. Let the seller tell their story.</p>
          </Section>

          {/* Qualifying */}
          <Section title="3. Qualifying — Motivation Check">
            <p className="text-sm text-gray-500 mb-3">Check all that apply based on the conversation:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(QUALIFIER_LABELS) as [keyof typeof qualifiers, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={qualifiers[key]} onChange={() => toggleQualifier(key)}
                    className="w-4 h-4 rounded border-gray-300 text-[#0000CC] focus:ring-[#0000CC]/20" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {Object.values(qualifiers).some(v => v) && (
              <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 mt-2">
                <p className="text-sm font-medium text-green-800">
                  {Object.values(qualifiers).filter(v => v).length} motivation indicator(s) identified — this could be a strong lead.
                </p>
              </div>
            )}
          </Section>

          {/* Offer Discussion */}
          <Section title="4. The Offer Discussion">
            <ScriptBlock>
              <p>&ldquo;Based on what you&rsquo;ve told me, I&rsquo;d like to take a closer look at the property and put together an offer.&rdquo;</p>
              <p>&ldquo;I typically close in 2-3 weeks, pay all closing costs, and buy as-is — no repairs needed on your end.&rdquo;</p>
              <p>&ldquo;Would you be open to me coming by to see the property this week?&rdquo;</p>
            </ScriptBlock>
          </Section>

          {/* Closing */}
          <Section title="5. Closing — Next Steps">
            <ScriptBlock>
              <p>&ldquo;Great, I&rsquo;ll plan to visit [date/time]. I&rsquo;ll bring a simple one-page agreement — no pressure, just so you can see the terms.&rdquo;</p>
              <p>&ldquo;What&rsquo;s the best number to reach you at? And is there a co-owner or spouse who should be part of the conversation?&rdquo;</p>
              <p>&ldquo;Thank you <InlineFill value={sellerName} fallback="Seller Name" />, I look forward to meeting you.&rdquo;</p>
            </ScriptBlock>
          </Section>

          {/* Objection Quick Reference */}
          <Section title="Quick Objection Reference" defaultOpen={false}>
            <div className="space-y-3">
              {OBJECTION_RESPONSES.map((item, i) => (
                <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-red-50 px-4 py-2">
                    <p className="text-sm font-semibold text-red-800">{item.objection}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-700">{item.response}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex justify-end pb-8">
            <button type="button" onClick={resetAll}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm">
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SellerCallScript;
