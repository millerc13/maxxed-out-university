'use client';

import { useEffect, useState } from 'react';
import { IconBolt, IconCheck, IconTrend, IconUsers } from '@/components/webinar-admin/Icons';

/**
 * PostHog analytics for the webinar funnels — mirrors the course-funnel
 * analytics (Overview KPIs + session recordings with an inline shared-embed
 * player), restyled with the webinar-admin tokens. Data comes from the
 * /api/webinar-analytics endpoints, which query the shared PostHog project
 * with the server-held personal API key.
 */

type Kpis = {
  visitors: number;
  pageviews: number;
  registrations: number;
  vipPurchases: number;
  registrationRate: number;
  vipRate: number;
};
type VariantRow = {
  variant: string;
  visitors: number;
  pageviews: number;
  registrations: number;
  vipPurchases: number;
};
type DailyRow = { day: string; visitors: number; registrations: number; vipPurchases: number };
type Overview = { kpis: Kpis; byVariant: VariantRow[]; daily: DailyRow[] };

type Recording = {
  id: string;
  distinct_id: string;
  start_time: string;
  recording_duration: number;
  click_count: number;
  keypress_count: number;
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const VARIANT_LABEL: Record<string, string> = {
  a: 'A — Hidden Industry',
  b: 'B — Contrarian',
  none: 'Unassigned',
};

export function WebinarAnalyticsClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch('/api/webinar-analytics/overview')
      .then((r) => r.json())
      .then((data) => setOverview(data?.kpis ? data : null))
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));
    fetch('/api/webinar-analytics/recordings')
      .then((r) => r.json())
      .then((data) => setRecordings(data.results ?? []))
      .catch(() => setRecordings([]))
      .finally(() => setRecordingsLoading(false));
  }, []);

  async function loadRecording(recordingId: string) {
    if (expandedId === recordingId) {
      setExpandedId(null);
      setEmbedUrl(null);
      return;
    }
    setExpandedId(recordingId);
    setEmbedUrl(null);
    setSharing(true);
    try {
      const res = await fetch('/api/webinar-analytics/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      });
      const data = await res.json();
      setEmbedUrl(data.embedUrl ?? null);
    } catch {
      setEmbedUrl(null);
    }
    setSharing(false);
  }

  const kpiCards = overview
    ? [
        { label: 'Visitors (30d)', value: overview.kpis.visitors.toLocaleString(), icon: IconUsers },
        { label: 'Registrations', value: overview.kpis.registrations.toLocaleString(), icon: IconCheck },
        { label: 'VIP purchases', value: overview.kpis.vipPurchases.toLocaleString(), icon: IconTrend },
        { label: 'Visitor → reg', value: pct(overview.kpis.registrationRate), icon: IconBolt },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse p-5" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpiCards.map((k) => (
            <div key={k.label} className="card flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand">
                <k.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold tabular-nums text-ink">{k.value}</p>
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-l-4 border-l-amber-500 p-5 text-sm text-ink-body">
          PostHog analytics unavailable — check POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID.
        </div>
      )}

      {/* A/B variant funnel */}
      {overview && overview.byVariant.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">A/B landing variants (30d)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="py-2 pr-4">Variant</th>
                  <th className="py-2 pr-4 text-right">Visitors</th>
                  <th className="py-2 pr-4 text-right">Pageviews</th>
                  <th className="py-2 pr-4 text-right">Registrations</th>
                  <th className="py-2 pr-4 text-right">Visitor → reg</th>
                  <th className="py-2 pr-4 text-right">VIP</th>
                  <th className="py-2 text-right">Reg → VIP</th>
                </tr>
              </thead>
              <tbody>
                {overview.byVariant.map((v) => (
                  <tr key={v.variant} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2.5 pr-4 font-bold text-ink">{VARIANT_LABEL[v.variant] ?? v.variant}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-body">{v.visitors.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-body">{v.pageviews.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-body">{v.registrations.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-brand">
                      {v.visitors > 0 ? pct(v.registrations / v.visitors) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-body">{v.vipPurchases.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-brand">
                      {v.registrations > 0 ? pct(v.vipPurchases / v.registrations) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Session recordings */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">Session recordings</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Last 7 days · {recordings.length} session{recordings.length !== 1 ? 's' : ''} on the webinar funnels
          </p>
        </div>

        {recordingsLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-ink-body">No session recordings yet</p>
            <p className="mt-1 text-xs text-ink-muted">Recordings appear once visitors interact with a funnel page.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {recordings.map((rec) => (
              <div key={rec.id}>
                <button
                  onClick={() => loadRecording(rec.id)}
                  className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition hover:bg-brand-tint/40"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="whitespace-nowrap text-sm font-semibold text-ink">
                      {new Date(rec.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="ml-1.5 text-xs font-normal text-ink-muted">
                        {new Date(rec.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </span>
                    <span className="max-w-[140px] truncate font-mono text-xs text-ink-light">
                      {rec.distinct_id.slice(0, 16)}…
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-ink-muted">
                    <span className="tabular-nums">{formatDuration(rec.recording_duration)}</span>
                    <span className="tabular-nums">{rec.click_count} clicks</span>
                    <span className="min-w-[56px] text-right font-bold text-brand">
                      {expandedId === rec.id ? 'Hide' : 'Watch'}
                    </span>
                  </div>
                </button>

                {expandedId === rec.id && (
                  <div className="px-5 pb-5">
                    {sharing ? (
                      <div className="flex items-center justify-center rounded-xl border border-black/5 bg-black/[0.02] py-16 text-sm text-ink-muted dark:border-white/10 dark:bg-white/5">
                        Loading recording…
                      </div>
                    ) : embedUrl ? (
                      <div className="overflow-hidden rounded-xl border border-black/5 shadow-card dark:border-white/10">
                        <iframe
                          src={embedUrl}
                          width="100%"
                          height="500"
                          frameBorder="0"
                          allowFullScreen
                          title={`Session recording from ${new Date(rec.start_time).toLocaleDateString()}`}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-red-200 bg-black/[0.02] py-12 text-center text-sm text-ink-muted dark:bg-white/5">
                        Failed to load recording. The session may no longer be available.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
