/**
 * Meta Conversions API (CAPI) sender — server-side mirror of the Pixel
 * events we fire client-side. Designed so the ads guy never has to
 * touch this: per-course Pixel ID + access token (or a system-wide
 * fallback in `META_CAPI_ACCESS_TOKEN` env) is all that's needed.
 *
 * Why this exists: iOS 14.5+ ATT, browser ad-blockers, and aggressive
 * cookie restrictions block the client-side Pixel for a meaningful
 * chunk of traffic. CAPI sends the same events from our server, so
 * Meta still attributes the conversion. Pair with a shared `event_id`
 * on browser + server hits and Meta dedupes them automatically.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, error }` on failure
 * — never throws. Webhook handlers call this and ignore the result so
 * a Meta outage doesn't block Stripe/Fanbasis enrollment.
 */

import { createHash } from 'node:crypto';

const GRAPH_API_VERSION = 'v22.0';

export type CapiEventName =
  | 'PageView'
  | 'Lead'
  | 'InitiateCheckout'
  | 'AddToCart'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Contact'
  | 'Subscribe';

export interface CapiUserData {
  /** Plain email — will be lowercased + sha256-hashed for Meta. */
  email?: string | null;
  /** Plain phone — digits-only + sha256-hashed for Meta. */
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  /** ISO-3166-2 region/state, e.g. 'OH'. */
  state?: string | null;
  /** ISO-3166-1 country, e.g. 'us'. */
  country?: string | null;
  /** Buyer IP (server-extracted from x-forwarded-for). */
  clientIp?: string | null;
  /** User-Agent header from the browser request. */
  userAgent?: string | null;
  /** Meta Click ID — extracted from ?fbclid= URL param. Format: fb.1.<ts>.<fbclid> */
  fbc?: string | null;
  /** Meta Browser ID — value of the _fbp cookie. */
  fbp?: string | null;
  /** External user ID — our internal user.id (sha256-hashed). */
  externalId?: string | null;
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: 'product' | 'product_group';
  content_category?: string;
  num_items?: number;
  /** Optional internal order/transaction id. */
  order_id?: string;
}

export interface SendCapiEventInput {
  /** Pixel/Dataset ID (numeric). */
  pixelId: string;
  /**
   * Access token. If null/empty, falls back to META_CAPI_ACCESS_TOKEN.
   * If still empty, the call no-ops (returns { ok: false, skipped: true }).
   */
  accessToken: string | null;
  /** Optional test-event code — when set, events go to Test Events view only. */
  testEventCode?: string | null;
  eventName: CapiEventName;
  /** Defaults to now. Use the same value as the corresponding browser event. */
  eventTime?: Date;
  /** Required for proper client/server dedup — must match browser event_id. */
  eventId: string;
  /** Page URL where the event happened — improves attribution + EMQ score. */
  eventSourceUrl?: string;
  userData: CapiUserData;
  customData?: CapiCustomData;
}

export type CapiResult =
  | { ok: true; eventsReceived: number; messages?: unknown }
  | { ok: false; skipped?: true; error: string };

function sha256Hex(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return createHash('sha256').update(trimmed).digest('hex');
}

function normalizePhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  // Strip everything except digits. CAPI expects E.164 without the "+".
  const digits = phone.replace(/\D+/g, '');
  if (!digits) return undefined;
  return digits;
}

function buildHashedUserData(input: CapiUserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const em = sha256Hex(input.email);
  if (em) out.em = [em];
  const ph = sha256Hex(normalizePhone(input.phone));
  if (ph) out.ph = [ph];
  const fn = sha256Hex(input.firstName);
  if (fn) out.fn = [fn];
  const ln = sha256Hex(input.lastName);
  if (ln) out.ln = [ln];
  const ct = sha256Hex(input.city);
  if (ct) out.ct = [ct];
  const st = sha256Hex(input.state);
  if (st) out.st = [st];
  const country = sha256Hex(input.country);
  if (country) out.country = [country];
  const externalId = sha256Hex(input.externalId);
  if (externalId) out.external_id = [externalId];
  // Non-PII fields go in plain (Meta hashes server-side as needed).
  if (input.clientIp) out.client_ip_address = input.clientIp;
  if (input.userAgent) out.client_user_agent = input.userAgent;
  if (input.fbc) out.fbc = input.fbc;
  if (input.fbp) out.fbp = input.fbp;
  return out;
}

export async function sendCapiEvent(input: SendCapiEventInput): Promise<CapiResult> {
  const accessToken = (input.accessToken ?? '').trim() || (process.env.META_CAPI_ACCESS_TOKEN ?? '').trim();
  if (!accessToken) {
    return { ok: false, skipped: true, error: 'No CAPI access token configured' };
  }
  if (!input.pixelId) {
    return { ok: false, skipped: true, error: 'No Pixel ID' };
  }

  const eventTime = Math.floor((input.eventTime ?? new Date()).getTime() / 1000);
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(input.pixelId)}/events`;

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: eventTime,
    event_id: input.eventId,
    action_source: 'website',
    user_data: buildHashedUserData(input.userData),
  };
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (input.customData) event.custom_data = input.customData;

  const body: Record<string, unknown> = {
    data: [event],
    access_token: accessToken,
  };
  if (input.testEventCode) body.test_event_code = input.testEventCode;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = json?.error as { message?: string } | undefined;
      return { ok: false, error: err?.message ?? `CAPI ${res.status}` };
    }
    return {
      ok: true,
      eventsReceived: typeof json?.events_received === 'number' ? (json.events_received as number) : 1,
      messages: json?.messages,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'CAPI request failed' };
  }
}

/**
 * Convenience: parse the standard Meta cookies/params from a Headers
 * object so callers don't have to remember the names. Returns the
 * subset that's present.
 */
export function extractMetaIdentifiers(headers: Headers, urlSearchParams?: URLSearchParams): {
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
} {
  const cookieHeader = headers.get('cookie') ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...rest] = c.trim().split('=');
      return [k, rest.join('=')];
    }),
  );
  const fbp = cookies['_fbp'] || undefined;
  let fbc = cookies['_fbc'] || undefined;
  // If no cookie but there's a fbclid in the URL, build the canonical
  // fbc string Meta expects: fb.1.<unix_seconds>.<fbclid>
  const fbclid = urlSearchParams?.get('fbclid');
  if (!fbc && fbclid) {
    fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
  }
  const xff = headers.get('x-forwarded-for') ?? '';
  const clientIp = xff.split(',')[0].trim() || undefined;
  const userAgent = headers.get('user-agent') ?? undefined;
  return { fbp, fbc, clientIp, userAgent };
}
