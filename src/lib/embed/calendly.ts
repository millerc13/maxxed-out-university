/**
 * Calendly read helpers (Rebecca Nardi's PAT via CALENDLY_API_TOKEN).
 * Rebecca books mentorship intro calls and Tim Storey Masterminds calls
 * through Calendly, outside GHL calendars — this is the only window
 * into that pipeline. All calls cached 5 min; failures return empty.
 */

const BASE = 'https://api.calendly.com';

export type CalendlyEvent = {
  name: string;
  status: 'active' | 'canceled';
  startTime: string;
  inviteeName: string | null;
  canceledBy: string | null;
};

async function calendlyGet(path: string): Promise<Record<string, unknown> | null> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function currentUserUri(): Promise<string | null> {
  const me = await calendlyGet('/users/me');
  const resource = me?.resource as { uri?: string } | undefined;
  return resource?.uri ?? null;
}

type RawEvent = {
  name?: string;
  status?: string;
  start_time?: string;
  cancellation?: { canceled_by?: string };
  event_memberships?: Array<{ user_name?: string }>;
};

/**
 * Events starting within the last `pastDays` days plus everything in the
 * future. (Calendly's API 403s on some min+max time combinations for
 * this plan, so we filter the upper bound client-side — volumes are
 * tiny.)
 */
export async function listCalendlyEvents(pastDays = 30): Promise<CalendlyEvent[]> {
  const userUri = await currentUserUri();
  if (!userUri) return [];

  const min = new Date(Date.now() - pastDays * 86_400_000).toISOString();
  const out: CalendlyEvent[] = [];
  let pageToken: string | null = null;

  for (let i = 0; i < 5; i++) {
    const params = new URLSearchParams({
      user: userUri,
      min_start_time: min,
      count: '100',
    });
    if (pageToken) params.set('page_token', pageToken);
    const json = await calendlyGet(`/scheduled_events?${params.toString()}`);
    if (!json) break;
    const rows = (json.collection ?? []) as RawEvent[];
    for (const e of rows) {
      out.push({
        name: e.name ?? '(untitled)',
        status: e.status === 'canceled' ? 'canceled' : 'active',
        startTime: e.start_time ?? '',
        inviteeName: null,
        canceledBy: e.cancellation?.canceled_by ?? null,
      });
    }
    const pagination = json.pagination as { next_page_token?: string | null } | undefined;
    pageToken = pagination?.next_page_token ?? null;
    if (!pageToken) break;
  }

  out.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return out;
}
