import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryPostHog, funnelHost, hogqlString } from '@/lib/posthog';
import { can } from '@/lib/permissions';

// Read-only funnels analytics summary — any staff role may view.
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !can(session.user.role, 'admin:access')) return null;
  return session;
}

/**
 * Funnel summary analytics. Attribution is by `properties.$host` (each
 * funnel lives on `{subdomain}.maxxedout.com` and every event — including
 * downstream checkout/enrollment on the funnel's /success page — carries
 * that host). The old version grouped by the `program` super-property,
 * which the funnel app leaves "Unknown"/null on ~90% of events, so almost
 * everything was filtered out and the numbers read near-zero.
 */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Build the host → funnel-name map from the live deployments.
  const funnels = await prisma.funnelDeployment.findMany({
    where: { subdomain: { not: null } },
    select: { name: true, subdomain: true },
  });
  const hostToName = new Map<string, string>();
  for (const f of funnels) {
    const host = funnelHost(f.subdomain);
    if (host) hostToName.set(host, f.name);
  }
  const hosts = [...hostToName.keys()];

  if (hosts.length === 0) {
    return NextResponse.json({
      totals: { views: 0, checkouts: 0, enrollments: 0, ctaClicks: 0, conversionRate: 0 },
      programs: [],
      sparklines: {},
      dailyChart: [],
    });
  }

  const hostList = hosts.map((h) => `'${hogqlString(h)}'`).join(', ');

  const [totals, perHost, dailyByHost, sourcesR, devicesR, campaignsR] = await Promise.all([
    // Overall KPIs across all funnel hosts (30 days)
    queryPostHog(`
      SELECT
        countIf(event = '$pageview') as total_views,
        countIf(event = 'checkout_started') as total_checkouts,
        countIf(event = 'enrollment_completed') as total_enrollments,
        countIf(event = 'cta_clicked') as total_cta_clicks
      FROM events
      WHERE timestamp >= now() - interval 30 day
        AND properties.$host IN (${hostList})
    `),

    // Per-funnel breakdown by host (30 days)
    queryPostHog(`
      SELECT
        properties.$host as host,
        countIf(event = '$pageview') as views,
        countIf(event = 'cta_clicked') as cta_clicks,
        countIf(event = 'checkout_started') as checkouts,
        countIf(event = 'enrollment_completed') as enrollments
      FROM events
      WHERE timestamp >= now() - interval 30 day
        AND properties.$host IN (${hostList})
      GROUP BY host
      ORDER BY views DESC
    `),

    // Daily views by host (last 14 days for the trend chart)
    queryPostHog(`
      SELECT
        toDate(timestamp) as day,
        properties.$host as host,
        countIf(event = '$pageview') as views
      FROM events
      WHERE timestamp >= now() - interval 14 day
        AND event = '$pageview'
        AND properties.$host IN (${hostList})
      GROUP BY day, host
      ORDER BY day
    `),

    // Traffic sources (referrers) across funnel hosts (30 days)
    queryPostHog(`
      SELECT properties.$referring_domain as ref, count() as views
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval 30 day
        AND properties.$host IN (${hostList})
      GROUP BY ref ORDER BY views DESC LIMIT 8
    `),

    // Device split across funnel hosts (30 days)
    queryPostHog(`
      SELECT properties.$device_type as device, count() as views
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval 30 day
        AND properties.$host IN (${hostList})
      GROUP BY device ORDER BY views DESC LIMIT 5
    `),

    // Ad campaigns (UTM) driving funnel traffic (30 days)
    queryPostHog(`
      SELECT properties.utm_campaign as campaign, properties.utm_source as source,
             count() as views, count(DISTINCT person_id) as visitors
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval 30 day
        AND properties.$host IN (${hostList})
        AND properties.utm_source IS NOT NULL
      GROUP BY campaign, source ORDER BY views DESC LIMIT 8
    `),
  ]);

  const cleanRef = (r: string) => (!r || r === '$direct' || r === 'null') ? 'Direct / none' : r.replace(/^www\.|^l\.|^lm\.|^m\./, '');
  const cleanCampaign = (c: string) => {
    if (!c || c === 'null') return '(no campaign)';
    try { return decodeURIComponent(c.replace(/\+/g, ' ')); } catch { return c; }
  };
  const sources = sourcesR.results.map(([ref, v]) => ({ label: cleanRef(String(ref)), views: Number(v) }));
  const devices = devicesR.results.map(([d, v]) => ({ label: String(d || 'Unknown'), views: Number(v) }));
  const campaigns = campaignsR.results.map(([c, s, v, u]) => ({
    campaign: cleanCampaign(String(c)),
    source: String(s || ''),
    views: Number(v),
    visitors: Number(u),
  }));

  const [totalViews, totalCheckouts, totalEnrollments, totalCtaClicks] =
    (totals.results[0] ?? [0, 0, 0, 0]).map(Number);

  const nameFor = (host: string) => hostToName.get(host) ?? host;

  // Per-funnel rows. `program` key kept for backwards-compat with the UI;
  // it now carries the funnel's display name. CTA rate replaces the old
  // (almost-always-zero) enrollment conversion as the headline ratio.
  const programs = perHost.results.map(([host, views, cta, checkouts, enrollments]) => ({
    program: nameFor(String(host)),
    views: Number(views),
    ctaClicks: Number(cta),
    checkouts: Number(checkouts),
    enrollments: Number(enrollments),
    conversionRate: Number(views) > 0 ? Number(cta) / Number(views) : 0,
  }));

  // Daily chart: a DENSE matrix so the tooltip always shows every funnel.
  // The old version only set keys for funnels that had views on a given day,
  // leaving the rest `undefined` — which made the hover read nonsensically
  // and broke the lines. Here every day in the range carries a value (0
  // default) for every funnel we draw.
  const drawnNames = programs.map((p) => p.program); // funnels with data
  const rawByDay = new Map<string, Record<string, number>>();
  for (const [day, host, views] of dailyByHost.results) {
    const d = String(day).slice(0, 10);
    if (!rawByDay.has(d)) rawByDay.set(d, {});
    rawByDay.get(d)![nameFor(String(host))] = Number(views);
  }
  const presentDays = [...rawByDay.keys()].sort();
  const dailyChart: Record<string, unknown>[] = [];
  if (presentDays.length > 0) {
    // Fill every calendar day from the first to the last day that has data,
    // so there are no missing x-axis points between events.
    const cur = new Date(`${presentDays[0]}T00:00:00Z`);
    const end = new Date(`${presentDays[presentDays.length - 1]}T00:00:00Z`);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const got = rawByDay.get(key) ?? {};
      const row: Record<string, unknown> = { day: key };
      for (const name of drawnNames) row[name] = got[name] ?? 0;
      dailyChart.push(row);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  // Sparklines per funnel name
  const sparklines: Record<string, number[]> = {};
  for (const [, host, views] of dailyByHost.results) {
    const name = nameFor(String(host));
    if (!sparklines[name]) sparklines[name] = [];
    sparklines[name].push(Number(views));
  }

  return NextResponse.json({
    totals: {
      views: totalViews,
      checkouts: totalCheckouts,
      enrollments: totalEnrollments,
      ctaClicks: totalCtaClicks,
      // Headline ratio is now CTA rate (clicks / views) — the real funnel
      // has near-zero checkout/enrollment events, so an enrollment-based
      // conversion rate would always read 0%.
      conversionRate: totalViews > 0 ? totalCtaClicks / totalViews : 0,
    },
    programs,
    sparklines,
    dailyChart,
    sources,
    devices,
    campaigns,
  });
}
