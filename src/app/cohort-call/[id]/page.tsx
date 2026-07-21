import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyCohortCall } from '@/lib/cohort-assign';
import { normalizePhoneE164 } from '@/lib/sms';
import { CohortCallDialer } from '@/components/admin/CohortCallDialer';

/**
 * "Call now" bounce page — the target of the Slack 📞 Call button.
 *
 * Slack refuses a `tel:` URL on a button (`invalid_blocks`), so the button
 * points here and this page hands off to the phone app. Unlike the send pages,
 * the dial fires automatically: opening a dialer is harmless and reversible,
 * so making a closer tap twice would just be friction.
 */
export const dynamic = 'force-dynamic';

export default async function CohortCallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  if (!t || !verifyCohortCall(id, t)) notFound();

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) notFound();

  const tel = normalizePhoneE164(app.phone) || app.phone;

  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-gray-900/5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            Calling now
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">{app.name}</h1>
          <p className="mt-1 text-lg font-bold text-gray-700">{app.phone}</p>
          <p className="mt-1 text-sm text-gray-500">
            Tier {app.tier} · {app.score}/28 · {app.state}
          </p>

          <CohortCallDialer tel={tel} />

          {app.note && (
            <p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-4 text-left text-sm text-amber-900">
              <span className="font-bold">Their note: </span>
              {app.note}
            </p>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Assigned to {app.assignedTo ?? 'unassigned'} · {app.email}
          </p>
        </div>
      </main>
    </div>
  );
}
