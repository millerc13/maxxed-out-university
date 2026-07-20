import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { TIER_ACTION, type Tier } from '@/lib/cohort-scoring';
import { CohortCallSheet, type CohortRow } from '@/components/admin/CohortCallSheet';

/**
 * Closer call sheet — cohort applications sorted by tier, then score.
 * "Don't hand your closers a raw spreadsheet at 9pm": each applicant is a
 * scannable card that opens into the full application, with call/text/email
 * one tap away. Built mobile-first — closers work this from a phone.
 */
export const dynamic = 'force-dynamic';

const TIER_CHIP: Record<string, string> = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-blue-600 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-gray-400 text-white',
};

export default async function CohortApplicationsPage() {
  await requireStaff();

  const apps = await prisma.cohortApplication.findMany({
    orderBy: [{ tier: 'asc' }, { score: 'desc' }, { createdAt: 'asc' }],
    take: 500,
  });

  const rows: CohortRow[] = apps.map((a) => ({
    id: a.id,
    name: a.name,
    phone: a.phone,
    email: a.email,
    state: a.state,
    readiness: a.readiness,
    investment: a.investment,
    work: a.work,
    note: a.note,
    score: a.score,
    tier: a.tier,
    isVip: a.isVip,
    smsConsent: a.smsConsent,
    smsConsentAt: a.smsConsentAt ? a.smsConsentAt.toISOString() : null,
    ghlContactId: a.ghlContactId,
    createdAt: a.createdAt.toISOString(),
  }));

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.tier] = (acc[r.tier] ?? 0) + 1;
    return acc;
  }, {});
  const vipCount = rows.filter((r) => r.isVip).length;

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Call sheet</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Cohort applications
          </h1>
          <p className="mt-1 text-sm text-gray-500">Sorted by tier, then score. Read the note before you dial.</p>
        </div>
        <a
          href="/api/cohort-application/export"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-blue-600 hover:text-blue-700"
        >
          Export CSV
        </a>
      </div>

      {/* Tier summary — 2-up on phones so nothing squeezes */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['A', 'B', 'C', 'D'] as Tier[]).map((t) => (
          <div key={t} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-black ${TIER_CHIP[t]}`}>{t}</span>
              <span className="truncate text-xs font-semibold text-gray-500">
                {TIER_ACTION[t].split(' — ')[0]}
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-gray-900">{counts[t] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-xs font-semibold text-amber-800">★ VIP buyers</span>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-amber-700">{vipCount}</p>
        </div>
      </div>

      <CohortCallSheet rows={rows} />

      {/* Triage legend */}
      <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Triage rules</p>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {(['A', 'B', 'C', 'D'] as Tier[]).map((t) => (
            <li key={t} className="flex gap-2.5">
              <span className={`h-fit rounded px-1.5 py-0.5 text-[11px] font-black ${TIER_CHIP[t]}`}>{t}</span>
              <span>{TIER_ACTION[t]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">
          Auto Tier A: $27 VIP buyers, and anyone who answered “ready to invest.” Auto cap at Tier C:
          “that’s out of reach right now.”
        </p>
      </div>
    </div>
  );
}
