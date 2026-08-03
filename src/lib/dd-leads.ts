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

export interface DdLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: 'complete' | 'submitted';
  dateAdded: string | null;
  place: string | null;
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
    });
  }
  return leads;
}

// Per-instance cache so repeat opens are instant; GHL is only hit every
// few minutes. Serverless cold starts just pay one ~1s search request.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; leads: DdLead[] } | null = null;

export async function getDdLeads(): Promise<{ leads: DdLead[]; fetchedAt: Date }> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { leads: cache.leads, fetchedAt: new Date(cache.at) };
  }
  const leads = await fetchDdLeadsFromGhl();
  cache = { at: Date.now(), leads };
  return { leads, fetchedAt: new Date(cache.at) };
}
