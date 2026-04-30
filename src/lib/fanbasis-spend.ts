import { prisma } from '@/lib/prisma';

export type FanbasisTx = {
  /** ULID-style id (e.g. 01KPS5DMEED…). What's stored in
   *  Enrollment.transactionId and what the webhook payload calls
   *  `payment_id`. */
  paymentId: string;
  /** Numeric id (e.g. 1783818). The Fanbasis public transactions API
   *  expects THIS one, not the ULID. Available in
   *  `payment.succeeded` events; absent in `product.purchased` so
   *  we may not have it for every successful transaction. */
  transactionHistoryId: number | null;
  email: string;
  cents: number;
  /** Processing fee Fanbasis charged for this transaction, in cents.
   *  Null when the API lookup failed or wasn't run. */
  feeCents?: number | null;
  /** What actually landed in Todd's account, in cents (gross − fee).
   *  Null when the API lookup failed or wasn't run. */
  netCents?: number | null;
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

    // `transaction_history_id` is in `payment.succeeded` events but
    // typically not in `product.purchased`. We merge across both
    // events for the same payment_id so we keep whichever entry has
    // the numeric ID (the public API needs it).
    const rawHistoryId = data.transaction_history_id;
    const transactionHistoryId =
      typeof rawHistoryId === 'number' && Number.isFinite(rawHistoryId)
        ? rawHistoryId
        : null;

    const existing = byPaymentId.get(paymentId);
    byPaymentId.set(paymentId, {
      paymentId,
      transactionHistoryId:
        transactionHistoryId ?? existing?.transactionHistoryId ?? null,
      email,
      cents,
    });
  }

  return [...byPaymentId.values()];
}

/**
 * Pull processor-fee details for a single Fanbasis payment from their
 * public API. Returns null on any failure so callers can fall back to
 * the gross figure they already have.
 *
 * IMPORTANT — the API expects the *numeric* `transaction_history_id`
 * (e.g. 1783818), NOT the ULID `payment_id` (01KP…). The ULID returns
 * 400 "Invalid transaction ID".
 *
 * Fanbasis returns amounts in DOLLARS — we convert to cents to match
 * everything else in this codebase.
 *
 * Cached for 10 minutes via Next.js fetch — fees on a given
 * transaction don't change after the fact.
 */
export async function fetchFanbasisTransactionFees(
  transactionHistoryId: number
): Promise<{ feeCents: number; netCents: number } | null> {
  // The transactions API hits live data, so we need the real key. In
  // prod `FANBASIS_API_KEY` already IS the live key; in local dev it's
  // typically the sandbox key, so check `FANBASIS_REAL_KEY` first as
  // an explicit override the developer can set in `.env.local`.
  const apiKey = (
    process.env.FANBASIS_REAL_KEY ?? process.env.FANBASIS_API_KEY
  )?.trim();
  if (!apiKey || !transactionHistoryId) return null;

  try {
    const res = await fetch(
      `https://www.fanbasis.com/public-api/transactions/${transactionHistoryId}`,
      {
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        next: { revalidate: 600 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      data?: { fee_amount?: number; net_amount?: number };
    };
    if (json.status !== 'success' || !json.data) return null;
    const fee = json.data.fee_amount;
    const net = json.data.net_amount;
    if (typeof fee !== 'number' || typeof net !== 'number') return null;
    return {
      feeCents: Math.round(fee * 100),
      netCents: Math.round(net * 100),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch every successful Fanbasis transaction AND enrich each with
 * fee/net data from the Fanbasis transactions API. Used by the admin
 * analytics revenue card to show gross vs. actually-received revenue.
 *
 * Transactions without a `transaction_history_id` (e.g. only seen in
 * a `product.purchased` event) get null fee/net — caller should
 * surface them as "fee lookup unavailable".
 */
export async function getEnrichedFanbasisTransactions(): Promise<FanbasisTx[]> {
  const txs = await getSuccessfulFanbasisTransactions();
  const enriched = await Promise.all(
    txs.map(async (t) => {
      if (!t.transactionHistoryId) {
        return { ...t, feeCents: null, netCents: null };
      }
      const fees = await fetchFanbasisTransactionFees(t.transactionHistoryId);
      return {
        ...t,
        feeCents: fees?.feeCents ?? null,
        netCents: fees?.netCents ?? null,
      };
    })
  );
  return enriched;
}
