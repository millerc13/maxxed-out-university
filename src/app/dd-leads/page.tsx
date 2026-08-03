import { cookies } from 'next/headers';
import { getDdLeads, verifyDdLeadsCookie, DD_LEADS_COOKIE, type DdLead } from '@/lib/dd-leads';
import { cohortPriceLabel, cohortPromoPriceLabel, COHORT_PROMO_CODE } from '@/lib/cohort-checkout';
import { ddLeadsLogin } from './actions';
import { LeadSendButtons } from './LeadSendButtons';

/**
 * Medicaid DD funnel lead list for the sales team. Single shared password
 * (DD_LEADS_PASSWORD) — no user account needed. Mobile-first: every lead is
 * a card with a tap-to-call button. Data comes live from GHL (5-min cache).
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Medicaid DD Leads', robots: { index: false, follow: false } };

function formatPhone(p: string): string {
  const m = p.replace(/[^\d+]/g, '').match(/^\+?1?(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p;
}

function telHref(p: string): string {
  const digits = p.replace(/[^\d]/g, '');
  return `tel:+${digits.length === 10 ? '1' + digits : digits}`;
}

function smsHref(p: string): string {
  const digits = p.replace(/[^\d]/g, '');
  return `sms:+${digits.length === 10 ? '1' + digits : digits}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

function LoginForm({ error }: { error: boolean }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-md px-5 py-16">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">
            Maxxed Out Sales
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
            Medicaid DD Leads
          </h1>
          <p className="mt-1 text-sm text-gray-500">Enter the team password to view the list.</p>
          <form action={ddLeadsLogin} className="mt-5 space-y-3">
            <input
              type="password"
              name="password"
              required
              autoFocus
              placeholder="Password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-blue-500"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                Wrong password — try again.
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white active:bg-blue-700"
            >
              View leads
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function LeadCard({
  lead,
  index,
  sendLabels,
}: {
  lead: DdLead;
  index: number;
  sendLabels: { checkout: string; coupon: string };
}) {
  const meta = [lead.place, formatDate(lead.dateAdded)].filter(Boolean).join(' · ');
  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        lead.contacted ? 'border-emerald-200 opacity-70' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="min-w-6 pt-0.5 text-xs font-bold text-gray-300">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold tracking-tight text-gray-900">{lead.name}</p>
          {meta && <p className="mt-0.5 text-xs text-gray-400">{meta}</p>}
        </div>
        {lead.status === 'complete' ? (
          <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            ✓ App Complete
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
            App Submitted
          </span>
        )}
      </div>
      {lead.phone ? (
        <div className="mt-3 flex gap-2">
          <a
            href={telHref(lead.phone)}
            className="block flex-1 rounded-xl bg-blue-600 py-3 text-center text-[15px] font-bold text-white active:bg-blue-700"
          >
            Call {formatPhone(lead.phone)}
          </a>
          <a
            href={smsHref(lead.phone)}
            className="block rounded-xl bg-emerald-600 px-5 py-3 text-center text-[15px] font-bold text-white active:bg-emerald-700"
          >
            Text
          </a>
        </div>
      ) : (
        <p className="mt-3 py-2 text-center text-sm font-semibold text-gray-300">
          No phone on file
        </p>
      )}
      {lead.email && (
        <a
          href={`mailto:${lead.email}`}
          className="mt-1 block truncate px-1 pt-1.5 text-center text-[13px] text-blue-600"
        >
          {lead.email}
        </a>
      )}
      <LeadSendButtons
        contactId={lead.id}
        name={lead.name}
        phone={lead.phone}
        email={lead.email}
        initialContacted={lead.contacted}
        labels={sendLabels}
      />
    </div>
  );
}

export default async function DdLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const jar = await cookies();
  const authed = verifyDdLeadsCookie(jar.get(DD_LEADS_COOKIE)?.value);
  if (!authed) {
    const { error } = await searchParams;
    return <LoginForm error={error === '1'} />;
  }

  const { leads, fetchedAt } = await getDdLeads();
  const complete = leads.filter((l) => l.status === 'complete').length;
  // Contacted leads sink to their own section at the bottom so the rep
  // resumes at the top of the untouched list instead of scrolling past
  // everyone already handled.
  const active = leads.filter((l) => !l.contacted);
  const contacted = leads.filter((l) => l.contacted);
  const sendLabels = {
    checkout: `12-Week Cohort enrollment link — ${cohortPriceLabel()}`,
    coupon: `${COHORT_PROMO_CODE} coupon — ${cohortPromoPriceLabel()}`,
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-md px-3.5 pb-10 pt-6">
        <header className="px-1 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Medicaid DD Applications
          </h1>
          <p className="mt-1 text-[13px] leading-snug text-gray-500">
            Every Medicaid funnel application in GoHighLevel · {leads.length} leads ({complete}{' '}
            complete) · Newest first · Tap to call or text
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Live data · updated{' '}
            {fetchedAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'America/New_York',
            })}{' '}
            ET
          </p>
        </header>
        <div className="space-y-2.5">
          {active.map((lead, i) => (
            <LeadCard key={lead.id} lead={lead} index={i} sendLabels={sendLabels} />
          ))}
        </div>
        {contacted.length > 0 && (
          <>
            <h2 className="mb-2 mt-8 px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-emerald-700">
              ✅ Contacted <span className="font-semibold text-gray-400">({contacted.length})</span>
            </h2>
            <div className="space-y-2.5">
              {contacted.map((lead, i) => (
                <LeadCard key={lead.id} lead={lead} index={active.length + i} sendLabels={sendLabels} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
