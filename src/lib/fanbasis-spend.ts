/**
 * Source of truth for Fanbasis revenue numbers.
 *
 * Backed by Fanbasis's `GET /public-api/checkout-sessions/transactions`
 * list endpoint, which returns every successful transaction for the
 * creator with per-tx `fee_amount` and `net_amount` already computed
 * by Fanbasis itself. We do NOT compute fees ourselves anymore — the
 * API's `net_amount` is what actually landed in Todd's account, full
 * stop. This means we capture ClarityPay financing splits, processor
 * fees, and platform fees correctly without touching them.
 *
 * Webhook logs are still useful for real-time event handling (e.g.
 * tagging GHL contacts as Sales the moment a payment lands), but for
 * any "what's our total revenue" question, ask this module.
 */

const LIST_URL =
  'https://www.fanbasis.com/public-api/checkout-sessions/transactions';

export type FanbasisTransaction = {
  /** Numeric transaction history id, used for `GET /transactions/:id`. */
  id: number;
  /** Buyer email, normalized lowercase. */
  email: string;
  /** Buyer name. */
  name: string;
  /** Gross paid by the buyer, in cents. */
  grossCents: number;
  /**
   * Just the processor fee Fanbasis itemized — typically Stripe's
   * 2.9% + $0.30. Does NOT include ClarityPay financing splits or
   * Fanbasis platform fees. For "total fees" use `grossCents − netCents`.
   */
  feeCents: number;
  /** What was actually credited to Todd. Authoritative. */
  netCents: number;
  /** ISO timestamp of the transaction. */
  date: string;
  /** Product title at time of sale. */
  productTitle: string;
};

type ListResponse = {
  status?: string;
  data?: {
    transactions?: Array<{
      id?: number | string;
      fan?: { email?: string; name?: string };
      service?: { price?: string | number; title?: string };
      product?: { title?: string };
      amount?: number | string;
      fee_amount?: number | string;
      net_amount?: number | string;
      transaction_date?: string;
    }>;
    pagination?: {
      current_page?: number;
      total_pages?: number;
      has_more?: boolean;
    };
  };
};

function dollarsToCents(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * Fetch every successful Fanbasis transaction. Paginated under the
 * hood (100/page, max 100 pages = 10k transactions before we bail
 * out — far beyond what's plausible for one creator). Cached 5 min
 * via Next.js fetch.
 *
 * Returns an empty array (not an error) when the API key isn't
 * configured or the API call fails — callers should treat zero as
 * "no data" without crashing.
 *
 * The transactions API hits live data, so we need the live key. In
 * prod `FANBASIS_API_KEY` IS the live key; in local dev it's typically
 * the sandbox key, so we check `FANBASIS_REAL_KEY` first as an
 * explicit override the developer can set in `.env.local`.
 */
export async function listFanbasisTransactions(): Promise<
  FanbasisTransaction[]
> {
  const apiKey = (
    process.env.FANBASIS_REAL_KEY ?? process.env.FANBASIS_API_KEY
  )?.trim();
  if (!apiKey) return [];

  const out: FanbasisTransaction[] = [];
  let page = 1;
  // Hard upper bound to keep a runaway pagination from hanging the
  // request. 100 pages × 100 per page = 10,000 txs — well above
  // anything we'd realistically hit.
  const PAGE_LIMIT = 100;

  while (page <= PAGE_LIMIT) {
    let json: ListResponse;
    try {
      const res = await fetch(
        `${LIST_URL}?per_page=100&page=${page}`,
        {
          headers: { 'x-api-key': apiKey, Accept: 'application/json' },
          next: { revalidate: 300 },
        }
      );
      if (!res.ok) break;
      json = (await res.json()) as ListResponse;
    } catch {
      break;
    }

    if (json.status !== 'success' || !json.data?.transactions) break;

    for (const t of json.data.transactions) {
      const id = typeof t.id === 'string' ? parseInt(t.id, 10) : t.id;
      if (typeof id !== 'number' || !Number.isFinite(id)) continue;
      out.push({
        id,
        email: (t.fan?.email ?? '').toLowerCase().trim(),
        name: t.fan?.name ?? '',
        grossCents: dollarsToCents(t.amount ?? t.service?.price),
        feeCents: dollarsToCents(t.fee_amount),
        netCents: dollarsToCents(t.net_amount),
        date: t.transaction_date ?? '',
        productTitle: t.product?.title ?? t.service?.title ?? '',
      });
    }

    if (!json.data.pagination?.has_more) break;
    page++;
  }

  return out;
}

/**
 * Per-email "total spent" lookup, sourced from the Fanbasis list API.
 * Used by the admin Messages page to surface real money spent per
 * contact based on actual successful transactions, not the
 * pre-discount `originalPrice` snapshot stored on the Enrollment row.
 */
export async function getFanbasisSpendByEmail(): Promise<Map<string, number>> {
  const txs = await listFanbasisTransactions();
  const out = new Map<string, number>();
  for (const t of txs) {
    if (!t.email) continue;
    out.set(t.email, (out.get(t.email) ?? 0) + t.grossCents);
  }
  return out;
}
