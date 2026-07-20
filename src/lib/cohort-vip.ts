/**
 * "Did this applicant buy the $27 webinar VIP?" — the spec's strongest
 * auto-Tier-A signal.
 *
 * The webinar registrations live in a DIFFERENT database (the maxxed-webinar
 * app), so this resolves over HTTPS against that app's admin API using the
 * server-side bearer. Best-effort by design: if the webinar app is unreachable
 * we return false and the application still scores and saves normally — a
 * missing VIP flag must never cost us the lead.
 *
 * Results are cached briefly because during a live class we may take dozens of
 * submissions per minute and the registrant list barely changes.
 */

type VipIndex = { emails: Set<string>; phones: Set<string>; fetchedAt: number };

let cache: VipIndex | null = null;
const TTL_MS = 60_000;

const normEmail = (v: string) => v.trim().toLowerCase();
/** Last 10 digits — tolerates +1, dashes, parens, spaces between systems. */
const normPhone = (v: string) => v.replace(/\D/g, '').slice(-10);

async function buildIndex(): Promise<VipIndex | null> {
  const base = process.env.WEBINAR_APP_URL;
  const token = process.env.WEBINAR_ADMIN_TOKEN;
  if (!base || !token) return null;
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const listRes = await fetch(`${base.replace(/\/$/, '')}/api/webinars`, { headers, cache: 'no-store' });
    if (!listRes.ok) return null;
    const listJson = await listRes.json();
    const webinars: Array<{ id: string; slug: string; status: string }> = Array.isArray(listJson)
      ? listJson
      : (listJson.webinars ?? []);
    // Prefer the published funnel; fall back to any webinar so this keeps
    // working if the slug ever changes.
    const target = webinars.find((w) => w.status === 'published') ?? webinars[0];
    if (!target) return null;

    const regRes = await fetch(
      `${base.replace(/\/$/, '')}/api/webinars/${encodeURIComponent(target.id)}/registrants`,
      { headers, cache: 'no-store' }
    );
    if (!regRes.ok) return null;
    const regJson = await regRes.json();
    const rows: Array<{ email?: string; phone?: string; status?: string }> = regJson.registrants ?? [];

    const emails = new Set<string>();
    const phones = new Set<string>();
    for (const r of rows) {
      if (r.status !== 'vip_purchased') continue;
      if (r.email) emails.add(normEmail(r.email));
      if (r.phone) {
        const p = normPhone(r.phone);
        if (p.length === 10) phones.add(p);
      }
    }
    return { emails, phones, fetchedAt: Date.now() };
  } catch {
    return null;
  }
}

/** True when this email OR phone matches a $27 VIP purchase. Never throws. */
export async function isVipBuyer(email: string, phone: string): Promise<boolean> {
  if (!cache || Date.now() - cache.fetchedAt > TTL_MS) {
    const fresh = await buildIndex();
    if (fresh) cache = fresh;
  }
  if (!cache) return false;
  const p = normPhone(phone);
  return cache.emails.has(normEmail(email)) || (p.length === 10 && cache.phones.has(p));
}
