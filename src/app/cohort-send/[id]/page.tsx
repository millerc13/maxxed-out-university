import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyCohortAction, type CohortChannel } from '@/lib/cohort-assign';
import {
  COHORT_PROMO_CODE,
  COHORT_PROMO_PERCENT,
  cohortPriceLabel,
  cohortPromoPriceLabel,
  parseSendStamps,
  type CohortSend,
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
  searchParams: Promise<{ promo?: string; t?: string; ch?: string }>;
}) {
  const { id } = await params;
  const { promo, t, ch } = await searchParams;
  const withPromo = promo === '1';
  const channel: CohortChannel = ch === 'sms' || ch === 'email' ? ch : 'both';

  if (!t || !verifyCohortAction(id, withPromo, t, channel)) notFound();

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) notFound();

  // Sending Checkout and then Coupon is the intended escalation, not a mistake.
  // Only warn when this exact send would repeat itself — same offer, same
  // channel — otherwise show the history as plain context.
  const priorSends = parseSendStamps(app.closerNotes);
  const wantsEmail = channel === 'email' || channel === 'both';
  const wantsSms = channel === 'sms' || channel === 'both';
  const duplicates = priorSends.filter(
    (s) => s.promo === withPromo && ((wantsEmail && s.email) || (wantsSms && s.sms))
  );
  const describe = (s: CohortSend) =>
    `${s.promo ? 'Coupon' : 'Checkout'} by ${[s.email && 'email', s.sms && 'text']
      .filter(Boolean)
      .join(' + ')} · ${s.at}`;

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
              <span className="font-semibold text-gray-900">
                {channel === 'sms' ? 'Text only' : channel === 'email' ? 'Email only' : 'Text + email'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">To</span>
              <span className="font-semibold text-gray-900">
                {channel === 'email' ? app.email : channel === 'sms' ? app.phone : 'both'}
              </span>
            </div>
          </div>

          {duplicates.length > 0 ? (
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <p className="font-bold">
                ⚠️ Already sent — this would be a duplicate
                {duplicates.length > 1 ? ` (${duplicates.length}x)` : ''}
              </p>
              <ul className="mt-1 space-y-0.5 text-amber-800">
                {duplicates.map((s, i) => (
                  <li key={i}>{describe(s)}</li>
                ))}
              </ul>
            </div>
          ) : priorSends.length > 0 ? (
            <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Already sent to this applicant:</p>
              <ul className="mt-1 space-y-0.5">
                {priorSends.map((s, i) => (
                  <li key={i}>{describe(s)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <CohortSendConfirm id={app.id} token={t} promo={withPromo} channel={channel} firstName={app.name.split(' ')[0]} />

          <p className="mt-4 text-center text-xs text-gray-400">
            Assigned to {app.assignedTo ?? 'unassigned'} · Tier {app.tier} · {app.score}/28
          </p>
        </div>
      </main>
    </div>
  );
}
