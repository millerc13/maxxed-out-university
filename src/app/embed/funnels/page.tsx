import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { queryPostHog, funnelHost, hogqlString } from '@/lib/posthog';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { DataTable } from '@/components/embed/DataTable';
import { TrendChart } from '@/components/embed/TrendChart';
import { CHART_COLORS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

/**
 * Funnel traffic + conversion, 30 days, attributed by $host — the same
 * approach as /api/admin/funnels/analytics (see that route for why
 * host-attribution beats the `program` super-property).
 */
export default async function FunnelsWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('funnels', k)) return <EmbedDenied />;

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
  const hostList = hosts.map((h) => `'${hogqlString(h)}'`).join(', ');

  const [totalsR, perHostR, dailyR] = hosts.length
    ? await Promise.all([
        queryPostHog(`
          SELECT
            countIf(event = '$pageview') as views,
            count(DISTINCT person_id) as visitors,
            countIf(event = 'cta_clicked') as cta,
            countIf(event = 'checkout_started') as checkouts,
            countIf(event = 'enrollment_completed') as enrollments
          FROM events
          WHERE timestamp >= now() - interval 30 day AND properties.$host IN (${hostList})
        `),
        queryPostHog(`
          SELECT properties.$host as host,
            countIf(event = '$pageview') as views,
            countIf(event = 'cta_clicked') as cta,
            countIf(event = 'checkout_started') as checkouts,
            countIf(event = 'enrollment_completed') as enrollments
          FROM events
          WHERE timestamp >= now() - interval 30 day AND properties.$host IN (${hostList})
          GROUP BY host ORDER BY views DESC
        `),
        queryPostHog(`
          SELECT toDate(timestamp) as day, countIf(event = '$pageview') as views
          FROM events
          WHERE timestamp >= now() - interval 14 day AND event = '$pageview'
            AND properties.$host IN (${hostList})
          GROUP BY day ORDER BY day
        `),
      ])
    : [{ results: [] }, { results: [] }, { results: [] }];

  const [views, visitors, cta, checkouts, enrollments] = (totalsR.results[0] ?? [0, 0, 0, 0, 0]).map(Number);

  const chartData = dailyR.results.map(([day, v]) => ({
    day: String(day).slice(0, 10),
    views: Number(v),
  }));

  return (
    <EmbedShell title="Funnel Traffic & Conversion" subtitle="All *.maxxedout.com funnels — last 30 days (PostHog)">
      <StatGrid cols={4}>
        <Stat label="Pageviews" value={views.toLocaleString()} tone="brand" />
        <Stat label="Visitors" value={visitors.toLocaleString()} />
        <Stat label="CTA clicks" value={cta.toLocaleString()} sub={views ? `${((cta / views) * 100).toFixed(1)}% of views` : undefined} />
        <Stat label="Checkouts → Enrolled" value={`${checkouts} → ${enrollments}`} tone="good" />
      </StatGrid>

      <Card title="Daily funnel pageviews — last 14 days" className="mt-3">
        <TrendChart
          data={chartData}
          series={[{ key: 'views', label: 'Pageviews', color: CHART_COLORS[0] }]}
          valueFormatter="count"
        />
      </Card>

      <Card title="Per-funnel breakdown (30d)" className="mt-3">
        <DataTable
          headers={['Funnel', 'Views', 'CTA', 'Checkouts', 'Enrolled']}
          align={['l', 'r', 'r', 'r', 'r']}
          rows={perHostR.results.map(([host, v, c, ck, en]) => [
            hostToName.get(String(host)) ?? String(host),
            Number(v).toLocaleString(),
            Number(c).toLocaleString(),
            String(Number(ck)),
            <b key="e">{String(Number(en))}</b>,
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
