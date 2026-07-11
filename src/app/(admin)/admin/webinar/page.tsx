import Link from 'next/link';
import { requireCapability } from '@/lib/admin';
import { CreateWebinarForm } from '@/components/webinar-admin/CreateWebinarForm';
import {
  IconBolt,
  IconCalendar,
  IconCheck,
  IconClock,
  IconPlus,
  IconShield,
  IconTicket,
  IconTrend,
  IconUsers,
} from '@/components/webinar-admin/Icons';

/**
 * Webinar command center — the ported maxxed-webinar admin dashboard. KPIs,
 * needs-attention, pipelines and activity come from the webinar app's read-only
 * /api/admin/overview endpoint (bearer-injected server-side). If that endpoint
 * isn't reachable we still render the webinar list + create form.
 */
export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  archived: 'bg-ink-light/15 text-ink-muted',
};

function timeUntil(d: Date): string {
  const ms = d.getTime() - Date.now();
  if (ms < 0) return 'started';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function timeAgo(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Attention = { severity: 'red' | 'amber'; text: string; webinarId?: string };
type Upcoming = {
  id: string;
  webinarId: string;
  webinarTitle: string;
  label: string | null;
  mode: string;
  startsAt: string;
  autoPlayBot: boolean;
  zoomChatBots: boolean;
  registeredCount: number;
};
type ActiveBot = { id: string; webinarTitle: string; label: string | null; botStatus: string };
type ReminderNext = { id: string; scheduledFor: string; channel: string; audience: string; email: string | null };
type Activity = { id: string; createdAt: string; type: string; label: string };
type WebinarCard = {
  id: string;
  title: string;
  slug: string;
  status: string;
  defaultTimezone: string | null;
  counts: { sessions: number; tiers: number };
  sessions: { registeredCount: number; startsAt: string; status: string; mode: string }[];
};
type Overview = {
  summary: { totalRegistered: number; attendedCount: number; revenue: number; upcomingCount: number };
  attention: Attention[];
  upcoming: Upcoming[];
  activeBots: ActiveBot[];
  reminderPipeline: { sent48: number; failed48: number; next: ReminderNext[] };
  ghl: { pending: number; failed: number };
  activity: Activity[];
  webinars: WebinarCard[];
};
type RawWebinar = {
  id: string;
  title: string;
  slug: string;
  status: string;
  defaultTimezone?: string | null;
  _count?: { sessions?: number; tiers?: number };
  counts?: { sessions?: number; tiers?: number };
  sessions?: { registeredCount?: number; startsAt: string; status: string; mode: string }[];
};

export default async function WebinarDashboardPage() {
  await requireCapability('content:manage');

  const base = process.env.WEBINAR_APP_URL;
  if (!base) throw new Error('WEBINAR_APP_URL is not configured');
  const headers = { Authorization: `Bearer ${process.env.WEBINAR_ADMIN_TOKEN ?? ''}` };

  const now = new Date();

  let data: Overview | null = null;
  try {
    const res = await fetch(`${base}/api/admin/overview`, { headers, cache: 'no-store' });
    if (res.ok) data = (await res.json()) as Overview;
  } catch {
    /* fall through to list-only rendering */
  }

  // Fallback list: if the overview endpoint isn't live yet, still show the
  // webinar cards + create form from the existing /api/webinars endpoint.
  let webinars: WebinarCard[] = data?.webinars ?? [];
  if (!data) {
    try {
      const res = await fetch(`${base}/api/webinars`, { headers, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const list: RawWebinar[] = Array.isArray(json) ? json : (json.webinars ?? []);
        webinars = list.map((w) => ({
          id: w.id,
          title: w.title,
          slug: w.slug,
          status: w.status,
          defaultTimezone: w.defaultTimezone ?? null,
          counts: {
            sessions: w._count?.sessions ?? w.counts?.sessions ?? 0,
            tiers: w._count?.tiers ?? w.counts?.tiers ?? 0,
          },
          sessions: (w.sessions ?? []).map((s) => ({
            registeredCount: s.registeredCount ?? 0,
            startsAt: s.startsAt,
            status: s.status,
            mode: s.mode,
          })),
        }));
      }
    } catch {
      /* leave webinars empty */
    }
  }

  const summary = data
    ? [
        { label: 'Registrations', value: data.summary.totalRegistered, icon: IconUsers, tone: 'brand' },
        { label: 'Attended', value: data.summary.attendedCount, icon: IconCheck, tone: 'emerald' },
        { label: 'VIP revenue', value: `$${data.summary.revenue.toFixed(0)}`, icon: IconTrend, tone: 'gold' },
        { label: 'Upcoming sessions', value: data.summary.upcomingCount, icon: IconCalendar, tone: 'brand' },
      ]
    : [];

  return (
    <div className="webinar-admin">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Command center</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Webinar</h1>
          <p className="mt-1 text-ink-muted">Funnels, bots, reminders, and GHL sync — real numbers only.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/webinar/analytics"
            className="inline-flex items-center gap-2 rounded-lg border border-brand/30 px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand-tint"
          >
            <IconTrend className="h-4 w-4" /> Analytics
          </Link>
          <a href="#new-webinar" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <IconPlus className="h-4 w-4" /> New webinar
          </a>
        </div>
      </div>

      {!data && (
        <div className="card mt-6 border-l-4 border-l-amber-500 p-5 text-sm text-ink-body">
          Live dashboard metrics are temporarily unavailable — showing the webinar list only. Everything below still works.
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summary.map((s) => (
              <div key={s.label} className="card flex items-center gap-4 p-5">
                <span
                  className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${
                    s.tone === 'emerald'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : s.tone === 'gold'
                        ? 'bg-gold/15 text-amber-600 dark:text-gold'
                        : 'bg-brand-tint text-brand'
                  }`}
                >
                  <s.icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tabular-nums text-ink">{s.value}</p>
                  <p className="text-xs font-semibold uppercase leading-tight tracking-wide text-ink-muted">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Needs attention */}
          {data.attention.length > 0 && (
            <div className="card mt-6 border-l-4 border-l-red-500 p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink">
                <IconBolt className="h-4 w-4 text-red-500" /> Needs attention
              </h2>
              <ul className="mt-3 space-y-2">
                {data.attention.slice(0, 6).map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${a.severity === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    {a.webinarId ? (
                      <Link href={`/admin/webinar/${a.webinarId}`} className="text-ink-body hover:text-brand hover:underline">
                        {a.text}
                      </Link>
                    ) : (
                      <span className="text-ink-body">{a.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ops row: upcoming sessions + pipelines */}
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Upcoming sessions with bot readiness */}
            <div className="card min-w-0 p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink">
                <IconCalendar className="h-4 w-4 text-brand" /> Upcoming sessions
              </h2>
              <div className="mt-3 space-y-2.5">
                {data.upcoming.length === 0 && <p className="text-sm text-ink-muted">Nothing scheduled.</p>}
                {data.upcoming.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/webinar/${s.webinarId}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-black/5 px-3 py-2.5 text-sm transition hover:border-brand/40 dark:border-white/10"
                  >
                    <span className="rounded bg-brand-tint px-2 py-0.5 text-xs font-extrabold tabular-nums text-brand">T-{timeUntil(new Date(s.startsAt))}</span>
                    <span className="min-w-[9rem] flex-1 truncate font-bold text-ink">{s.webinarTitle}</span>
                    <span className="text-xs text-ink-muted">{s.label}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${s.mode === 'simulive' ? 'bg-brand-tint text-brand' : 'bg-black/5 text-ink-muted dark:bg-white/10'}`}>
                      {s.mode === 'simulive' ? 'Simulive' : 'Zoom'}
                    </span>
                    {s.mode === 'live_zoom' && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${s.autoPlayBot ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}`}>
                        {s.autoPlayBot ? 'Bot ✓' : 'No bot'}
                      </span>
                    )}
                    {s.zoomChatBots && (
                      <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-600 dark:text-gold">Chat crew</span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-semibold text-ink-body">
                      <IconUsers className="h-3.5 w-3.5 text-brand" />
                      {s.registeredCount}
                    </span>
                  </Link>
                ))}
              </div>
              {data.activeBots.length > 0 && (
                <div className="mt-4 rounded-lg bg-brand-tint/60 p-3">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-brand">Bots live right now</p>
                  {data.activeBots.map((b) => (
                    <p key={b.id} className="mt-1 text-sm text-ink-body">
                      🔴 {b.webinarTitle} · {b.label} — <b>{b.botStatus}</b>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Pipelines: reminders + GHL */}
            <div className="min-w-0 space-y-4">
              <div className="card p-5">
                <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink">
                  <IconClock className="h-4 w-4 text-brand" /> Reminder pipeline
                </h2>
                <p className="mt-2 text-xs text-ink-muted">
                  <b className="text-emerald-600 dark:text-emerald-400">{data.reminderPipeline.sent48} sent</b> ·{' '}
                  <b className={data.reminderPipeline.failed48 ? 'text-red-500' : 'text-ink-muted'}>{data.reminderPipeline.failed48} failed</b> (48h)
                </p>
                <div className="mt-3 space-y-1.5">
                  {data.reminderPipeline.next.length === 0 && <p className="text-sm text-ink-muted">Nothing queued.</p>}
                  {data.reminderPipeline.next.map((j) => (
                    <div key={j.id} className="flex items-center gap-2 text-xs">
                      <span className="w-14 flex-none font-bold tabular-nums text-brand">{timeUntil(new Date(j.scheduledFor))}</span>
                      <span className={`w-10 flex-none rounded px-1 py-0.5 text-center text-[10px] font-extrabold uppercase ${j.channel === 'sms' ? 'bg-gold/15 text-amber-600 dark:text-gold' : 'bg-brand-tint text-brand'}`}>{j.channel}</span>
                      <span className="flex-none rounded bg-black/5 px-1 py-0.5 text-[10px] font-bold uppercase text-ink-muted dark:bg-white/10">{j.audience}</span>
                      <span className="min-w-0 truncate text-ink-body">{j.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink">
                  <IconShield className="h-4 w-4 text-brand" /> GHL sync
                </h2>
                <div className="mt-3 flex gap-6 text-sm">
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-ink">{data.ghl.pending}</p>
                    <p className="text-xs font-semibold uppercase text-ink-muted">Pending</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-extrabold tabular-nums ${data.ghl.failed ? 'text-red-500' : 'text-ink'}`}>{data.ghl.failed}</p>
                    <p className="text-xs font-semibold uppercase text-ink-muted">Failed</p>
                  </div>
                  <div className="ml-auto self-center text-xs text-ink-muted">Drains every minute via cron</div>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink">
                  <IconBolt className="h-4 w-4 text-brand" /> Live activity
                </h2>
                <div className="mt-3 space-y-1.5">
                  {data.activity.length === 0 && <p className="text-sm text-ink-muted">No events yet.</p>}
                  {data.activity.slice(0, 8).map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <span className="w-14 flex-none tabular-nums text-ink-light">{timeAgo(new Date(e.createdAt))}</span>
                      <span className="flex-none rounded bg-brand-tint px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-brand">{e.type.replace(/_/g, ' ')}</span>
                      <span className="min-w-0 truncate text-ink-body">{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Webinar list — soonest upcoming live date first (real funnels lead) */}
      <h2 id="webinars" className="mt-10 scroll-mt-24 text-lg font-extrabold tracking-tight text-ink">All webinars</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[...webinars]
          .sort((a, b) => {
            const nextOf = (w: WebinarCard) =>
              w.sessions.find((s) => s.status === 'scheduled' && new Date(s.startsAt) > now)?.startsAt
                ? new Date(w.sessions.find((s) => s.status === 'scheduled' && new Date(s.startsAt) > now)!.startsAt).getTime()
                : Infinity;
            return nextOf(a) - nextOf(b);
          })
          .map((w) => {
            const registered = w.sessions.reduce((s, x) => s + (x.registeredCount ?? 0), 0);
            const next = w.sessions.find((s) => s.status === 'scheduled' && new Date(s.startsAt) > now);
            const hasSimulive = w.sessions.some((s) => s.mode === 'simulive');
            return (
              <Link
                key={w.id}
                href={`/admin/webinar/${w.id}`}
                className="card group flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {/* Live landing-page preview (scaled iframe of the real funnel).
                    Drafts 404 publicly — skip the iframe so the console stays clean. */}
                <div className="relative hidden w-36 flex-none overflow-hidden bg-night sm:block">
                  {w.status === 'published' && (
                    <iframe
                      src={`${base}/${w.slug}`}
                      title={`${w.title} preview`}
                      loading="lazy"
                      tabIndex={-1}
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-0 h-[860px] w-[430px] origin-top-left select-none border-0"
                      style={{ transform: 'scale(0.335)' }}
                    />
                  )}
                  <span className="absolute inset-0" aria-hidden />
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-base font-extrabold tracking-tight text-ink">{w.title}</h3>
                    <span className={`flex-none rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[w.status] ?? ''}`}>
                      {w.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    /{w.slug}
                    {hasSimulive && <span className="ml-2 rounded bg-brand-tint px-1.5 py-0.5 font-bold text-brand">simulive</span>}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs font-semibold text-ink-body">
                    <span className="flex items-center gap-1"><IconUsers className="h-4 w-4 text-brand" /> {registered} reg</span>
                    <span className="flex items-center gap-1"><IconCalendar className="h-4 w-4 text-brand" /> {w.counts.sessions} sess</span>
                    <span className="flex items-center gap-1"><IconTicket className="h-4 w-4 text-brand" /> {w.counts.tiers} tiers</span>
                    {next && (
                      <span className="ml-auto rounded bg-brand-tint px-2 py-0.5 font-extrabold text-brand">
                        next: {new Date(next.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: w.defaultTimezone || 'America/New_York' })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        {webinars.length === 0 && <p className="text-sm text-ink-muted">No webinars yet.</p>}
      </div>

      {/* Create */}
      <div id="new-webinar" className="card mt-10 scroll-mt-24 p-6">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Create a webinar</h2>
        <p className="mt-1 text-sm text-ink-muted">Slug becomes the public URL. Everything else is editable after.</p>
        <div className="mt-4">
          <CreateWebinarForm />
        </div>
      </div>
    </div>
  );
}
