import { COHORT_START, PLAN_SECOND_PAYMENT, PLAN_THIRD_PAYMENT } from '@/lib/cohort-payment-plan';

/**
 * Public post-purchase page — where Fanbasis sends the buyer after paying.
 *
 * The success_url previously pointed at /admin/cohort, which a buyer has no
 * access to: they'd land on a login wall seconds after paying $10,000.
 *
 * Fanbasis appends the purchase to the query string (email, name, payment_id,
 * product_name, product_price, phone, coupon_code). Those are shown back as a
 * receipt, but nothing here is trusted for anything — the DB is updated from
 * the signed webhook, not from a URL the buyer could edit.
 */
export const dynamic = 'force-dynamic';

const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

export default async function CohortThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

  const name = one(sp.name);
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const productName = one(sp.product_name);
  const price = one(sp.product_price);
  const paymentId = one(sp.payment_id);
  const isPlan = /plan/i.test(productName);

  return (
    <div className="min-h-dvh bg-gray-50">
      <main className="mx-auto max-w-lg px-5 py-12">
        <div className="rounded-2xl bg-white p-7 shadow-xl ring-1 ring-gray-900/5">
          <p className="text-4xl">✅</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">
            You&apos;re in{firstName !== 'there' ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-2 text-gray-600">
            Your seat in the 12-Week Medicaid Cohort is confirmed. A receipt is on its way to your
            email.
          </p>

          {(productName || price) && (
            <div className="mt-6 space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
              {productName && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Program</span>
                  <span className="text-right font-semibold text-gray-900">{productName}</span>
                </div>
              )}
              {price && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{isPlan ? 'Paid today' : 'Paid'}</span>
                  <span className="font-bold text-gray-900">
                    ${Number(price).toLocaleString('en-US')}
                  </span>
                </div>
              )}
              {paymentId && (
                <div className="flex justify-between gap-4 border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Reference</span>
                  <span className="break-all text-right font-mono text-xs text-gray-600">
                    {paymentId}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">What happens next</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                The cohort starts <span className="font-semibold">{prettyDate(COHORT_START)}</span>.
              </li>
              {isPlan && (
                <li>
                  Your remaining payments run automatically on{' '}
                  <span className="font-semibold">{prettyDate(PLAN_SECOND_PAYMENT)}</span> and{' '}
                  <span className="font-semibold">{prettyDate(PLAN_THIRD_PAYMENT)}</span> — same
                  card, nothing for you to do.
                </li>
              )}
              <li>Someone from Todd&apos;s team will reach out with onboarding details.</li>
            </ul>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            Questions? Reply to your receipt email and we&apos;ll get right back to you.
          </p>
        </div>
      </main>
    </div>
  );
}
