import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyCohortContacted } from '@/lib/cohort-assign';
import { formatPhoneUS } from '@/lib/sms';
import { CohortContactedConfirm } from '@/components/admin/CohortContactedConfirm';

/**
 * One-tap "mark contacted" page — target of the Slack ✅ Contacted button.
 * Public but HMAC-signed, same as the send pages.
 */
export const dynamic = 'force-dynamic';

export default async function CohortContactedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ by?: string; t?: string }>;
}) {
  const { id } = await params;
  const { by, t } = await searchParams;
  const closer = by ?? '';

  if (!t || !closer || !verifyCohortContacted(id, closer, t)) notFound();

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) notFound();

  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            Mark contacted
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">{app.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatPhoneUS(app.phone)} · Tier {app.tier} · {app.score}/28
          </p>

          {app.contactedAt ? (
            <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900">
              Already marked contacted by {app.contactedBy ?? 'someone'} on{' '}
              {app.contactedAt.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.
            </p>
          ) : (
            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <p>This will:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Post the full details to{' '}
                  <span className="font-semibold">#cohort-contacted</span>
                </li>
                <li>
                  Remove their card from{' '}
                  <span className="font-semibold">#cohort-applications</span>
                </li>
                <li>
                  Record <span className="font-semibold">{closer}</span> as who worked it
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                It does not text or email the applicant.
              </p>
            </div>
          )}

          {!app.contactedAt && (
            <CohortContactedConfirm
              id={app.id}
              by={closer}
              token={t}
              name={app.name.split(' ')[0]}
            />
          )}
        </div>
      </main>
    </div>
  );
}
