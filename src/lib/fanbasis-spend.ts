import { prisma } from '@/lib/prisma';

export type FanbasisTx = {
  paymentId: string;
  email: string;
  cents: number;
};

/**
 * Loads every successful Fanbasis transaction from the WebhookLog table,
 * deduped by `payment_id`. Fanbasis fires two events per purchase
 * (`payment.succeeded` and `product.purchased`) — only one slot per
 * payment_id is kept.
 *
 * Amounts in Fanbasis webhooks are in DOLLARS (e.g. `amount: 6000`
 * means $6,000), so we convert to cents on the way out.
 *
 * Returns a list of transactions that callers can index by paymentId
 * (== Enrollment.transactionId) or by buyer email — whichever they
 * trust more. Email-based matching can miss buyers whose Fanbasis
 * checkout email differs from their university account email (typos,
 * partner accounts, etc.); paymentId-based matching is exact.
 */
export async function getSuccessfulFanbasisTransactions(): Promise<FanbasisTx[]> {
  const events = await prisma.webhookLog.findMany({
    where: {
      source: 'fanbasis',
      event: { in: ['payment.succeeded', 'product.purchased'] },
      status: 'received',
    },
    select: { id: true, payload: true },
  });

  const byPaymentId = new Map<string, FanbasisTx>();

  for (const ev of events) {
    const top = ev.payload as { data?: Record<string, unknown> } | null;
    const data = (top?.data ?? top) as Record<string, unknown> | null;
    if (!data) continue;
    if (data.status !== 'succeeded') continue;

    const buyer = data.buyer as { email?: string } | undefined;
    const email = buyer?.email?.toLowerCase().trim() ?? '';
    const paymentId = (data.payment_id as string | undefined)?.trim();
    if (!paymentId) continue;

    // amount is in dollars (USD). Some events have `amount`, others
    // only `total_price` or `product_price` — pick the first defined.
    const dollars =
      (data.amount as number | undefined) ??
      (data.total_price as number | undefined) ??
      (data.product_price as number | undefined);
    if (typeof dollars !== 'number' || !Number.isFinite(dollars) || dollars <= 0) {
      continue;
    }

    const cents = Math.round(dollars * 100);
    // Last write wins is fine — both events for a given payment_id
    // carry the same amount. We just want one entry per transaction.
    byPaymentId.set(paymentId, { paymentId, email, cents });
  }

  return [...byPaymentId.values()];
}
