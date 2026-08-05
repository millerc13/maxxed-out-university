/**
 * Read-only GoHighLevel v2 API helpers for the embed widgets.
 *
 * Uses the same PIT (`GHL_API_KEY`) + `GHL_LOCATION_ID` the rest of the
 * app uses. Every call is cached 5 minutes via Next's fetch cache so a
 * wall of GHL dashboard widgets refreshing at once doesn't hammer the
 * API. All helpers return empty data (never throw) when the API is
 * unreachable — a widget should render zeros, not a 500.
 */

const V2_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

function ghlHeaders(): Record<string, string> | null {
  const key = process.env.GHL_API_KEY;
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    Version: API_VERSION,
    Accept: 'application/json',
  };
}

function locationId(): string | null {
  return process.env.GHL_LOCATION_ID ?? null;
}

async function ghlGet(path: string, params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const headers = ghlHeaders();
  if (!headers) return null;
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${V2_BASE}${path}?${qs}`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type GhlTransaction = {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  /** Dollars (GHL returns dollars, not cents). */
  amount: number;
  status: string; // succeeded | failed | refunded | ...
  liveMode: boolean;
  /** Funnel/product label, e.g. "Masterminds Live Event". */
  sourceName: string;
  createdAt: string;
};

type RawGhlTx = {
  _id?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  amount?: number;
  status?: string;
  liveMode?: boolean;
  entitySourceName?: string;
  createdAt?: string;
};

/**
 * Every GHL payment transaction for the location (paginated, newest
 * first). GHL's own Stripe checkout (event tickets, order forms) lives
 * here — this is revenue that never touches Fanbasis or our Stripe.
 */
export async function listGhlTransactions(): Promise<GhlTransaction[]> {
  const altId = locationId();
  if (!altId) return [];

  const out: GhlTransaction[] = [];
  const PAGE_SIZE = 100;
  // 40 pages x 100 = 4,000 transactions before bailing — well above the
  // ~300 the location has today.
  for (let page = 0; page < 40; page++) {
    const json = await ghlGet('/payments/transactions', {
      altId,
      altType: 'location',
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    const rows = (json?.data ?? []) as RawGhlTx[];
    if (rows.length === 0) break;
    for (const t of rows) {
      out.push({
        id: t._id ?? '',
        contactId: t.contactId ?? '',
        contactName: t.contactName ?? '',
        contactEmail: (t.contactEmail ?? '').toLowerCase(),
        amount: typeof t.amount === 'number' ? t.amount : 0,
        status: t.status ?? 'unknown',
        liveMode: t.liveMode !== false,
        sourceName: t.entitySourceName ?? 'Unknown',
        createdAt: t.createdAt ?? '',
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contact links (quality-of-life: click a buyer, land on their GHL card)
// ---------------------------------------------------------------------------

/** Deep link into the GHL contact detail page (opens in the GHL app). */
export function ghlContactUrl(contactId: string): string {
  return `https://app.gohighlevel.com/v2/location/${process.env.GHL_LOCATION_ID}/contacts/detail/${contactId}`;
}

/**
 * Resolve a GHL contactId from an email (Fanbasis buyers don't come
 * with one). Cached 1h — contact ids never change.
 */
export async function findGhlContactIdByEmail(email: string): Promise<string | null> {
  const loc = locationId();
  const headers = ghlHeaders();
  if (!loc || !headers || !email) return null;
  try {
    const qs = new URLSearchParams({ locationId: loc, email });
    const res = await fetch(`${V2_BASE}/contacts/search/duplicate?${qs.toString()}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { contact?: { id?: string } };
    return json.contact?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pipelines & opportunities
// ---------------------------------------------------------------------------

export type GhlPipeline = {
  id: string;
  name: string;
  stages: Array<{ id: string; name: string; position: number }>;
};

export async function listPipelines(): Promise<GhlPipeline[]> {
  const loc = locationId();
  if (!loc) return [];
  const json = await ghlGet('/opportunities/pipelines', { locationId: loc });
  const pipelines = (json?.pipelines ?? []) as Array<{
    id: string;
    name: string;
    stages?: Array<{ id: string; name: string; position: number }>;
  }>;
  return pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    stages: (p.stages ?? []).map((s) => ({ id: s.id, name: s.name, position: s.position })),
  }));
}

export type GhlOpportunity = {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: string; // open | won | lost | abandoned
  monetaryValue: number;
  createdAt: string;
};

/** All opportunities for the location (paginated; capped at 2,000). */
export async function listOpportunities(): Promise<GhlOpportunity[]> {
  const loc = locationId();
  if (!loc) return [];

  const out: GhlOpportunity[] = [];
  for (let page = 1; page <= 20; page++) {
    const json = await ghlGet('/opportunities/search', {
      location_id: loc,
      limit: '100',
      page: String(page),
    });
    const rows = (json?.opportunities ?? []) as Array<{
      id: string;
      name?: string;
      pipelineId?: string;
      pipelineStageId?: string;
      status?: string;
      monetaryValue?: number;
      createdAt?: string;
    }>;
    if (rows.length === 0) break;
    for (const o of rows) {
      out.push({
        id: o.id,
        name: o.name ?? '',
        pipelineId: o.pipelineId ?? '',
        pipelineStageId: o.pipelineStageId ?? '',
        status: o.status ?? 'open',
        monetaryValue: typeof o.monetaryValue === 'number' ? o.monetaryValue : 0,
        createdAt: o.createdAt ?? '',
      });
    }
    if (rows.length < 100) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Calendars & appointments
// ---------------------------------------------------------------------------

export type GhlAppointment = {
  id: string;
  title: string;
  calendarName: string;
  startTime: string;
  endTime: string;
  status: string; // confirmed | showed | noshow | cancelled | ...
};

/** Appointments across every calendar in the window [start, end]. */
export async function listAppointments(startMs: number, endMs: number): Promise<GhlAppointment[]> {
  const loc = locationId();
  if (!loc) return [];

  const calJson = await ghlGet('/calendars/', { locationId: loc });
  const calendars = (calJson?.calendars ?? []) as Array<{ id: string; name?: string }>;
  if (calendars.length === 0) return [];

  const out: GhlAppointment[] = [];
  await Promise.all(
    calendars.map(async (cal) => {
      const json = await ghlGet('/calendars/events', {
        locationId: loc,
        calendarId: cal.id,
        startTime: String(startMs),
        endTime: String(endMs),
      });
      const events = (json?.events ?? []) as Array<{
        id: string;
        title?: string;
        startTime?: string;
        endTime?: string;
        appointmentStatus?: string;
      }>;
      for (const e of events) {
        out.push({
          id: e.id,
          title: e.title ?? '(untitled)',
          calendarName: cal.name ?? 'Calendar',
          startTime: e.startTime ?? '',
          endTime: e.endTime ?? '',
          status: e.appointmentStatus ?? 'unknown',
        });
      }
    })
  );
  out.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return out;
}
