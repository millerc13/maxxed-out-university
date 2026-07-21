import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyCohortAction } from '@/lib/cohort-assign';
import {
  COHORT_PROMO_CODE,
  COHORT_PROMO_PERCENT,
  cohortPriceLabel,
  cohortPromoPriceLabel,
} from '@/lib/cohort-checkout';
import { CohortSendConfirm } from '@/components/admin/CohortSendConfirm';

/**
 * One-tap send page — the target of the Slack "Text link" buttons.
 *
 * Public but HMAC-signed: a closer tapping from Slack on their phone won't be
 * logged into the admin, so the signature is what authorizes the action. The
 * GET only RENDERS — the actual send happens on an explicit tap, because link
 * unfurlers and mobile prefetch would otherwise fire real texts at applicants.
 */
export const dynamic = 'force-dynamic';

export default async function CohortSendPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ promo?: string; t?: string }>;
}) {
  const { id } = await params;
  const { promo, t } = await searchParams;
  const withPromo = promo === '1';

  if (!t || !verifyCohortAction(id, withPromo, t)) notFound();

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) notFound();

  const alreadySent = (app.closerNotes ?? '').includes('Checkout link sent');

  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">
            Send enrollment link
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">{app.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {app.phone} · {app.email}
          </p>

          <div className="mt-5 space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Price</span>
              <span className="font-bold text-gray-900">
                {withPromo ? cohortPromoPriceLabel() : cohortPriceLabel()}
              </span>
            </div>
            {withPromo && (
              <div className="flex justify-between">
                <span className="text-gray-500">Discount</span>
                <span className="font-bold text-emerald-700">
                  {COHORT_PROMO_CODE} · {COHORT_PROMO_PERCENT}% off
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-500">Sends</span>
              <span className="font-semibold text-gray-900">Text + email</span>
            </div>
          </div>

          {alreadySent && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
              ⚠️ A checkout link was already sent to this applicant. Sending again will deliver a
              second text and email.
            </p>
          )}

          <CohortSendConfirm id={app.id} token={t} promo={withPromo} firstName={app.name.split(' ')[0]} />

          <p className="mt-4 text-center text-xs text-gray-400">
            Assigned to {app.assignedTo ?? 'unassigned'} · Tier {app.tier} · {app.score}/28
          </p>
        </div>
      </main>
    </div>
  );
}
