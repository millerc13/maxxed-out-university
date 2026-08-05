/**
 * Proxy reads into the maxxed-webinar app (webinar.maxxedout.com),
 * which exposes purpose-built JSON stats endpoints behind its
 * ADMIN_TOKEN. Env: WEBINAR_APP_URL + WEBINAR_ADMIN_TOKEN (already used
 * by /admin/webinar).
 */

type Json = Record<string, unknown>;

async function webinarGet(path: string): Promise<Json | null> {
  const base = process.env.WEBINAR_APP_URL;
  const token = process.env.WEBINAR_ADMIN_TOKEN;
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Json;
  } catch {
    return null;
  }
}

export type WebinarOverview = {
  summary: { totalRegistered: number; attendedCount: number; revenue: number; upcomingCount: number };
  upcoming: Array<{ webinarTitle: string; label: string; startsAt: string; registeredCount: number; vipCount: number; freeCount: number }>;
  webinars: Array<{ id: string; title: string }>;
};

export async function getWebinarOverview(): Promise<WebinarOverview | null> {
  const json = await webinarGet('/api/admin/overview');
  if (!json) return null;
  return json as unknown as WebinarOverview;
}

export type WebinarStats = {
  stats: {
    registered: number;
    freeConfirmed: number;
    vipPurchased: number;
    attended: number;
    noShow: number;
    revenueCents: number;
    vipConversionPct: number;
    attendanceRatePct: number;
  };
  abTest: Array<{ variant: string; registrations: number; showedUp: number; purchased: number; showUpPct: number; purchasePct: number }>;
};

export async function getWebinarStats(webinarId: string): Promise<WebinarStats | null> {
  const json = await webinarGet(`/api/webinars/${webinarId}/stats`);
  if (!json) return null;
  return json as unknown as WebinarStats;
}
