import { Card, CardContent } from '@/components/ui/card';
import { queryPostHog } from '@/lib/posthog';
import { TrafficChart, type TrafficPoint } from '@/components/admin/analytics/TrafficChart';
import {
  Eye, Users, MousePointer2, Layers, Globe, Megaphone, FileText, Smartphone,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DAYS = 30;

function n(v: unknown) {
  return Number(v ?? 0);
}
function fmt(v: number) {
  return v.toLocaleString('en-US');
}
function cleanReferrer(r: string): string {
  if (!r || r === '$direct' || r === 'null') return 'Direct / none';
  return r.replace(/^www\./, '').replace(/^l\.|^lm\.|^m\./, '');
}
function cleanCampaign(c: string): string {
  if (!c || c === 'null') return '(no campaign)';
  // Decode the %7C → | etc. that show up in some UTM values.
  try { return decodeURIComponent(c.replace(/\+/g, ' ')); } catch { return c; }
}

export default async function AnalyticsPage() {
  // All metrics are live from the production PostHog project (set via
  // POSTHOG_PROJECT_ID). Pageview-based web analytics across every
  // Maxxed Out property (university app + all funnel subdomains).
  const [kpiR, dailyR, pagesR, sourcesR, campaignsR, devicesR] = await Promise.all([
    queryPostHog(`
      SELECT count() AS views,
             count(DISTINCT person_id) AS visitors,
             count(DISTINCT properties.$session_id) AS sessions
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval ${DAYS} day
    `),
    queryPostHog(`
      SELECT toDate(timestamp) AS day,
             count() AS views,
             count(DISTINCT person_id) AS visitors
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval ${DAYS} day
      GROUP BY day ORDER BY day
    `),
    queryPostHog(`
      SELECT properties.$pathname AS path, properties.$host AS host, count() AS views
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval ${DAYS} day
      GROUP BY path, host ORDER BY views DESC LIMIT 12
    `),
    queryPostHog(`
      SELECT properties.$referring_domain AS ref, count() AS views
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval ${DAYS} day
      GROUP BY ref ORDER BY views DESC LIMIT 10
    `),
    queryPostHog(`
      SELECT properties.utm_campaign AS campaign, properties.utm_source AS source,
             count() AS views, count(DISTINCT person_id) AS visitors
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval ${DAYS} day
        AND properties.utm_source IS NOT NULL
      GROUP BY campaign, source ORDER BY views DESC LIMIT 10
    `),
    queryPostHog(`
      SELECT properties.$device_type AS device, count() AS views
      FROM events
      WHERE event = '$pageview' AND timestamp >= now() - interval ${DAYS} day
      GROUP BY device ORDER BY views DESC LIMIT 6
    `),
  ]);

  const [views, visitors, sessions] = (kpiR.results[0] ?? [0, 0, 0]).map(n);
  const pagesPerSession = sessions > 0 ? views / sessions : 0;

  // Fill the daily series so the chart is continuous across the window.
  const dailyMap = new Map<string, { views: number; visitors: number }>();
  for (const [d, v, u] of dailyR.results) {
    dailyMap.set(String(d), { views: n(v), visitors: n(u) });
  }
  const daily: TrafficPoint[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const hit = dailyMap.get(key);
    daily.push({ day: key, views: hit?.views ?? 0, visitors: hit?.visitors ?? 0 });
  }

  const topPages = pagesR.results.map(([path, host, v]) => ({
    path: String(path || '/'),
    host: String(host || ''),
    views: n(v),
  }));

  const sources = sourcesR.results.map(([ref, v]) => ({ label: cleanReferrer(String(ref)), views: n(v) }));
  const sourcesTotal = sources.reduce((s, r) => s + r.views, 0) || 1;

  const campaigns = campaignsR.results.map(([c, s, v, u]) => ({
    campaign: cleanCampaign(String(c)),
    source: String(s || ''),
    views: n(v),
    visitors: n(u),
  }));

  const devices = devicesR.results
    .map(([d, v]) => ({ label: String(d || 'Unknown'), views: n(v) }));
  const devicesTotal = devices.reduce((s, r) => s + r.views, 0) || 1;

  const kpis = [
    { label: 'Pageviews', value: fmt(views), icon: Eye, color: 'bg-[#1E40AF]' },
    { label: 'Unique Visitors', value: fmt(visitors), icon: Users, color: 'bg-emerald-600' },
    { label: 'Sessions', value: fmt(sessions), icon: MousePointer2, color: 'bg-indigo-500' },
    { label: 'Pages / Session', value: pagesPerSession.toFixed(2), icon: Layers, color: 'bg-amber-600' },
  ];

  const hasData = views > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live web traffic across every Maxxed Out property · last {DAYS} days · via PostHog
        </p>
      </div>

      {!hasData && (
        <Card><CardContent className="p-6 text-sm text-gray-500">
          No PostHog traffic returned. Check that <code className="font-mono">POSTHOG_PROJECT_ID</code> and{' '}
          <code className="font-mono">POSTHOG_PERSONAL_API_KEY</code> are set for this environment.
        </CardContent></Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k.label}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums">{k.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${k.color} shrink-0`}>
                  <k.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Traffic trend */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-maxxed-blue" /> Traffic — last {DAYS} days
          </h2>
          <TrafficChart data={daily} />
        </CardContent>
      </Card>

      {/* Sources + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-maxxed-blue" /> Traffic Sources
            </h2>
            <BarList rows={sources} total={sourcesTotal} color="#1E40AF" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-maxxed-blue" /> Devices
            </h2>
            <BarList rows={devices} total={devicesTotal} color="#059669" />
          </CardContent>
        </Card>
      </div>

      {/* Ad campaigns */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-maxxed-blue" /> Ad Campaigns (UTM)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Paid + tagged traffic by campaign · last {DAYS} days</p>
          </div>
          {campaigns.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No UTM-tagged traffic yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Campaign</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Visitors</th>
                    <th className="px-4 py-3 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{c.campaign}</td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-medium">{c.source}</span></td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(c.visitors)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(c.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top pages */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-maxxed-blue" /> Top Pages
            </h2>
          </div>
          {topPages.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No pageviews yet</div>
          ) : (
            <div className="divide-y">
              {topPages.map((p, i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-4">
                  <span className="text-sm font-extrabold text-gray-200 w-6 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.path}</p>
                    <p className="text-xs text-gray-400 truncate">{p.host}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">{fmt(p.views)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Server-rendered horizontal bar list (label + share-of-total bar). */
function BarList({ rows, total, color }: { rows: { label: string; views: number }[]; total: number; color: string }) {
  if (!rows.length) return <div className="text-sm text-gray-400 py-6 text-center">No data yet</div>;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const pct = Math.round((r.views / total) * 100);
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 truncate pr-2">{r.label}</span>
              <span className="text-gray-500 tabular-nums shrink-0">{r.views.toLocaleString()} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
