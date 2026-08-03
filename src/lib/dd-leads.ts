import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Medicaid DD funnel leads page (/dd-leads) — data + auth helpers.
 *
 * The page is gated by a single shared password (DD_LEADS_PASSWORD) so the
 * sales team can open it on a phone without a user account. The cookie
 * stores an HMAC of the password keyed by AUTH_SECRET — rotating either
 * env var invalidates every existing cookie.
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';
const DD_TAGS = ['dd application submitted', 'dd app complete'];

export const DD_LEADS_COOKIE = 'dd-leads-key';

export function ddLeadsCookieValue(): string | null {
  const password = process.env.DD_LEADS_PASSWORD;
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!password || !secret) return null;
  return createHmac('sha256', secret).update(password).digest('hex');
}

export function verifyDdLeadsCookie(value: string | undefined): boolean {
  const expected = ddLeadsCookieValue();
  if (!expected || !value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function verifyDdLeadsPassword(input: string): boolean {
  const password = process.env.DD_LEADS_PASSWORD;
  if (!password) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Tag stamped on a GHL contact when the sales rep marks them done from
 * /dd-leads. Living in GHL (not our DB) means the CRM shows it too and the
 * lead list stays correct no matter which device marks it.
 */
export const DD_CONTACTED_TAG = 'dd contacted';

/** Test contacts pinned to the top of the list regardless of date. */
const PINNED_EMAILS = ['cj-miller@resurgence.cloud'];

export interface DdLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: 'complete' | 'submitted';
  dateAdded: string | null;
  place: string | null;
  contacted: boolean;
}

interface GhlSearchContact {
  id: string;
  firstNameLowerCase?: string | null;
  lastNameLowerCase?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
  dateAdded?: string | null;
  city?: string | null;
  state?: string | null;
}

function titleCase(s: string): string {
  if (s.includes('@')) return s;
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

async function fetchDdLeadsFromGhl(): Promise<DdLead[]> {
  const apiKey = process.env.GHL_API_KEY?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!apiKey || !locationId) throw new Error('GHL_API_KEY / GHL_LOCATION_ID not configured');

  const res = await fetch(`${GHL_API_BASE}/contacts/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locationId,
      pageLimit: 500,
      filters: [{ field: 'tags', operator: 'contains', value: DD_TAGS }],
      sort: [{ field: 'dateAdded', direction: 'desc' }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GHL contact search → ${res.status} ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { contacts?: GhlSearchContact[] };

  const leads: DdLead[] = [];
  const seen = new Set<string>();
  for (const c of json.contacts ?? []) {
    const tags = (c.tags ?? []).map((t) => t.toLowerCase());
    if (!DD_TAGS.some((t) => tags.includes(t))) continue;
    const key = (c.email ?? c.phone ?? c.id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const name =
      [c.firstNameLowerCase, c.lastNameLowerCase].filter(Boolean).join(' ').trim() ||
      c.email ||
      'Unknown';
    leads.push({
      id: c.id,
      name: titleCase(name),
      phone: c.phone ?? null,
      email: c.email ?? null,
      status: tags.includes('dd app complete') ? 'complete' : 'submitted',
      dateAdded: c.dateAdded ?? null,
      place: [c.city, c.state].filter(Boolean).join(', ') || null,
      contacted: tags.includes(DD_CONTACTED_TAG),
    });
  }
  leads.sort((a, b) => {
    const aPin = PINNED_EMAILS.includes(a.email ?? '') ? 1 : 0;
    const bPin = PINNED_EMAILS.includes(b.email ?? '') ? 1 : 0;
    return bPin - aPin;
  });
  return leads;
}

// Per-instance cache so repeat opens are instant; GHL is only hit every
// few minutes. Serverless cold starts just pay one ~1s search request.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; leads: DdLead[] } | null = null;

// GHL's contact-search index lags tag writes by up to a minute or so, which
// would bounce a just-marked lead back to the active list on reload. Recent
// toggles are overlaid on fetched data until the index has surely caught up.
const OVERRIDE_TTL_MS = 10 * 60 * 1000;
const contactedOverrides = new Map<string, { contacted: boolean; at: number }>();

function applyOverrides(leads: DdLead[]): DdLead[] {
  const now = Date.now();
  return leads.map((l) => {
    const o = contactedOverrides.get(l.id);
    if (!o) return l;
    if (now - o.at > OVERRIDE_TTL_MS) {
      contactedOverrides.delete(l.id);
      return l;
    }
    return o.contacted === l.contacted ? l : { ...l, contacted: o.contacted };
  });
}

export async function getDdLeads(): Promise<{ leads: DdLead[]; fetchedAt: Date }> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { leads: applyOverrides(cache.leads), fetchedAt: new Date(cache.at) };
  }
  const leads = await fetchDdLeadsFromGhl();
  cache = { at: Date.now(), leads };
  return { leads: applyOverrides(leads), fetchedAt: new Date(cache.at) };
}

export function bustDdLeadsCache(): void {
  cache = null;
}

/** Add or remove the contacted tag on a GHL contact. */
export async function setDdContactedTag(contactId: string, done: boolean): Promise<void> {
  const apiKey = process.env.GHL_API_KEY?.trim();
  if (!apiKey) throw new Error('GHL_API_KEY not configured');
  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
    method: done ? 'POST' : 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tags: [DD_CONTACTED_TAG] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GHL tag update → ${res.status} ${body.slice(0, 200)}`);
  }
  contactedOverrides.set(contactId, { contacted: done, at: Date.now() });
}
