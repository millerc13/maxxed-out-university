import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import {
  READINESS_OPTIONS,
  INVESTMENT_OPTIONS,
  WORK_OPTIONS,
  TIER_ACTION,
  shortOf,
  type Tier,
} from '@/lib/cohort-scoring';

/**
 * Closer call sheet — cohort applications sorted by tier, then score.
 * "Don't hand your closers a raw spreadsheet at 9pm": each applicant is one
 * scannable line with the note visible, because the note is what changes how
 * the call opens.
 */
export const dynamic = 'force-dynamic';

const TIER_STYLE: Record<string, { chip: string; card: string; label: string }> = {
  A: { chip: 'bg-emerald-600 text-white', card: 'border-emerald-300 bg-emerald-50/60', label: 'Call first' },
  B: { chip: 'bg-blue-600 text-white', card: 'border-blue-200 bg-blue-50/50', label: 'Call same night' },
  C: { chip: 'bg-amber-500 text-white', card: 'border-amber-200 bg-amber-50/50', label: 'Next morning' },
  D: { chip: 'bg-gray-400 text-white', card: 'border-gray-200 bg-white', label: 'Nurture' },
};

export default async function CohortApplicationsPage() {
  await requireStaff();

  const apps = await prisma.cohortApplication.findMany({
    orderBy: [{ tier: 'asc' }, { score: 'desc' }, { createdAt: 'asc' }],
    take: 500,
  });

  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.tier] = (acc[a.tier] ?? 0) + 1;
    return acc;
  }, {});
  const vipCount = apps.filter((a) => a.isVip).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Call sheet</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">Cohort applications</h1>
          <p className="mt-1 text-gray-500">Sorted by tier, then score. Read the note before you dial.</p>
        </div>
        <a
          href="/api/cohort-application/export"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-blue-600 hover:text-blue-700"
        >
          Export CSV
        </a>
      </div>

      {/* Tier summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['A', 'B', 'C', 'D'] as Tier[]).map((t) => (
          <div key={t} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-black ${TIER_STYLE[t].chip}`}>{t}</span>
              <span className="text-xs font-semibold text-gray-500">{TIER_STYLE[t].label}</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-gray-900">{counts[t] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <span className="text-xs font-semibold text-gray-500">VIP buyers</span>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-600">{vipCount}</p>
        </div>
      </div>

      {apps.length === 0 && (
        <p className="mt-10 rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          No applications yet. They&apos;ll appear here the moment the form is submitted.
        </p>
      )}

      {/* The call sheet */}
      <div className="mt-6 space-y-2.5">
        {apps.map((a) => {
          const style = TIER_STYLE[a.tier] ?? TIER_STYLE.D;
          return (
            <div key={a.id} className={`rounded-xl border p-4 ${style.card}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className={`rounded px-2 py-0.5 text-xs font-black ${style.chip}`}>
                  TIER {a.tier} — {a.score} pts
                </span>
                <span className="text-base font-extrabold text-gray-900">{a.name}</span>
                {a.isVip && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-emerald-700">
                    VIP ✅
                  </span>
                )}
                <span className="text-sm text-gray-500">{a.state}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                <span>{shortOf(READINESS_OPTIONS, a.readiness)}</span>
                <span aria-hidden className="text-gray-300">·</span>
                <span>{shortOf(INVESTMENT_OPTIONS, a.investment)}</span>
                <span aria-hidden className="text-gray-300">·</span>
                <span>{shortOf(WORK_OPTIONS, a.work)}</span>
              </div>

              {a.note && (
                <p className="mt-3 rounded-lg border-l-4 border-l-blue-500 bg-white/80 px-3 py-2 text-sm italic text-gray-800">
                  “{a.note}”
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <a href={`tel:${a.phone}`} className="font-bold text-blue-700 hover:underline">
                  📞 {a.phone}
                </a>
                <a href={`mailto:${a.email}`} className="text-gray-600 hover:underline">
                  {a.email}
                </a>
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(a.createdAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Triage legend */}
      <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Triage</p>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
          {(['A', 'B', 'C', 'D'] as Tier[]).map((t) => (
            <li key={t}>
              <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-black ${TIER_STYLE[t].chip}`}>{t}</span>
              {TIER_ACTION[t]}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Auto Tier A: $27 VIP buyers, and anyone who answered “ready to invest.” Auto cap at Tier C:
          “that’s out of reach right now.”
        </p>
      </div>
    </div>
  );
}
