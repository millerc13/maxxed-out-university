'use client';

import { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

interface Term {
  term: string;
  definition: string;
  category: 'Core' | 'Analysis' | 'Financing' | 'Strategy' | 'Legal';
}

const TERMS: Term[] = [
  { term: 'ARV (After Repair Value)', category: 'Analysis', definition: "The projected market value of a property after all renovations are complete. Drives flip budgets and the 70% Rule." },
  { term: 'Assignment Contract', category: 'Legal', definition: 'A contract where a wholesaler assigns their right to buy a property to an end buyer in exchange for an assignment fee.' },
  { term: 'BRRRR', category: 'Strategy', definition: 'Buy, Rehab, Rent, Refinance, Repeat. A rental-building strategy where you recycle capital by pulling it out in the refinance step.' },
  { term: 'Cap Rate', category: 'Analysis', definition: 'Net Operating Income ÷ Purchase Price. Used to compare multifamily deals at a glance. Higher = better cash return, lower = more appreciation play.' },
  { term: 'Cash-on-Cash Return', category: 'Analysis', definition: 'Annual pre-tax cash flow ÷ total cash invested. Your real yield on the money you actually put in — the number that matters for rentals.' },
  { term: 'COC', category: 'Analysis', definition: 'Shorthand for Cash-on-Cash Return.' },
  { term: 'Creative Finance', category: 'Financing', definition: 'Any deal structure that avoids traditional bank loans — seller financing, subject-to, lease options, private money, etc.' },
  { term: 'DSCR Loan', category: 'Financing', definition: 'Debt Service Coverage Ratio loan. Qualifies you based on the property\'s income, not your personal income. Standard for scaling rentals.' },
  { term: 'Double Close', category: 'Strategy', definition: 'Two back-to-back closings on the same property — A to B, then B to C — used when an assignment won\'t work or the spread needs to be hidden.' },
  { term: 'End Buyer', category: 'Strategy', definition: 'The final buyer in a wholesale deal who actually takes title. Usually a fix-and-flipper or cash landlord.' },
  { term: 'Equity', category: 'Core', definition: 'The difference between what a property is worth and what you owe on it. Grows through appreciation, paydown, or forced equity (rehab).' },
  { term: 'Escrow', category: 'Legal', definition: 'A neutral third party that holds funds and documents until the deal closes. Also refers to impounded taxes + insurance held by a lender.' },
  { term: 'Exit Strategy', category: 'Strategy', definition: 'How you plan to make money on a deal: flip, hold as a rental, wholesale, refinance. Always have at least two before you buy.' },
  { term: 'Forced Equity', category: 'Strategy', definition: 'Value added through rehab or operational improvements — not waiting on the market. The core of BRRRR.' },
  { term: 'Hard Money', category: 'Financing', definition: 'Short-term, asset-based loan from a private lender. Fast to close, expensive rates (10–14%), typically used for flips and BRRRR purchases.' },
  { term: 'LTV (Loan-to-Value)', category: 'Financing', definition: 'Loan amount ÷ property value. Lenders cap this — 70–75% on rentals, 90% on some owner-occupied loans.' },
  { term: 'NOI (Net Operating Income)', category: 'Analysis', definition: 'Gross income minus operating expenses — BEFORE debt service. The number that drives cap rate and property valuation.' },
  { term: 'Off-Market', category: 'Strategy', definition: 'A property for sale that isn\'t listed on the MLS. Where the real deals live — less competition, more flexibility.' },
  { term: 'Points', category: 'Financing', definition: 'Upfront fees charged by a lender as a percentage of the loan. 2 points on a $200k loan = $4k. Common on hard money.' },
  { term: 'Private Money', category: 'Financing', definition: 'Money borrowed from individuals (friends, family, accredited investors) instead of institutions. Flexible terms, relationship-based.' },
  { term: 'Rent Roll', category: 'Analysis', definition: 'A document listing every unit, tenant, rent amount, and lease terms for a multifamily property. First thing you request on any MF deal.' },
  { term: 'ROI (Return on Investment)', category: 'Analysis', definition: 'Net profit ÷ total investment. Generic metric — specify time period and whether it includes appreciation.' },
  { term: 'Seller Finance', category: 'Financing', definition: 'The seller acts as the bank. You pay them directly over time instead of getting a traditional loan. Best on free-and-clear properties.' },
  { term: 'SFH', category: 'Core', definition: 'Single-Family Home. One-unit residential property.' },
  { term: 'Sub2 (Subject To)', category: 'Financing', definition: 'Buying a property subject to the existing financing staying in place. Title transfers, loan stays in seller\'s name. High-leverage, high-risk.' },
  { term: 'T12', category: 'Analysis', definition: 'Trailing 12 months of income and expenses. The actual financial history of a property — trust this more than the seller\'s projections.' },
  { term: 'Turnkey', category: 'Strategy', definition: 'A property sold rehabbed, rented, and with management in place. Lower yield, lower hassle. Not where most real money is made.' },
  { term: 'Underwriting', category: 'Analysis', definition: 'The process of analyzing a deal\'s financials and risk. The single most important skill in this business.' },
  { term: 'Wholesaling', category: 'Strategy', definition: 'Contracting a property and selling your contract (the assignment) to an end buyer without ever taking title. Quick cash, no rehab risk.' },
  { term: '1031 Exchange', category: 'Legal', definition: 'An IRS provision letting you defer capital gains by rolling proceeds into a like-kind property within strict time limits.' },
  { term: '70% Rule', category: 'Analysis', definition: 'Max Offer = (ARV × 0.70) − Rehab. The flipper\'s safety net. Gives 30% of ARV to cover holding, closing, commissions, and profit.' },
];

const CATEGORIES: Term['category'][] = ['Core', 'Analysis', 'Financing', 'Strategy', 'Legal'];
const CATEGORY_COLORS: Record<Term['category'], string> = {
  Core: 'bg-gray-100 text-gray-700',
  Analysis: 'bg-[#0000CC]/10 text-[#0000CC]',
  Financing: 'bg-emerald-50 text-emerald-700',
  Strategy: 'bg-amber-50 text-amber-700',
  Legal: 'bg-rose-50 text-rose-700',
};

export const RealEstateGlossary = forwardRef<ToolHandle>(function RealEstateGlossary(_, ref) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Term['category'] | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERMS.filter((t) => {
      if (cat !== 'All' && t.category !== cat) return false;
      if (!q) return true;
      return t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q);
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [query, cat]);

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Real Estate Glossary',
      type: 'template',
      sections: [
        {
          heading: 'Terms',
          table: {
            headers: ['Term', 'Category', 'Definition'],
            rows: TERMS.slice().sort((a, b) => a.term.localeCompare(b.term)).map((t) => [t.term, t.category, t.definition]),
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Real Estate Glossary</h2>
            <p className="mt-1 text-sm text-gray-500">Every term Todd uses on calls — in plain English.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms…"
              className="w-full h-11 rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`px-3 h-8 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                cat === c
                  ? 'bg-[#0000CC] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500">No terms match that search. Try a broader word like <span className="font-semibold text-gray-700">cap</span> or <span className="font-semibold text-gray-700">BRRRR</span>.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.term} className="rounded-xl bg-white shadow-sm border border-gray-100 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base sm:text-[17px] font-bold text-gray-900 leading-snug">{t.term}</h3>
                <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[t.category]}`}>
                  {t.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{t.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default RealEstateGlossary;
