'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HubData } from '@/lib/embed/hub-data';
import { Stat } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { DataTable } from '@/components/embed/DataTable';
import { TrendChart } from '@/components/embed/TrendChart';
import { ContactLink } from '@/components/embed/ContactLink';
import { CHART_COLORS, STATUS } from '@/lib/embed/theme';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'calls', label: 'Calls' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'university', label: 'University' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const usd = (cents: number, compact = false) => {
  const dollars = cents / 100;
  if (compact && Math.abs(dollars) >= 10_000) {
    return `$${(dollars / 1000).toFixed(dollars >= 100_000 ? 0 : 1)}k`;
  }
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars >= 1000 ? 0 : 2,
  });
};

const fmtEt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', ...opts });

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.03] ${className}`}>
      {title ? (
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}

export function HubClient({ data }: { data: HubData }) {
  const [tab, setTab] = useState<TabId>('overview');
  const router = useRouter();

  // Live data: re-fetch the server payload every 5 minutes.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5 * 60_000);
    return () => clearInterval(id);
  }, [router]);

  // Deep-linkable tabs (#revenue etc.) so GHL menu links can target one —
  // applied on load and whenever the hash changes without a reload.
  useEffect(() => {
    const applyHash = () => {
      const fromHash = window.location.hash.replace('#', '') as TabId;
      if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);
  const selectTab = (id: TabId) => {
    setTab(id);
    history.replaceState(null, '', `#${id}`);
  };

  const { kpis, revenue, pipeline, calls, marketing, university } = data;

  return (
    <div className="min-h-screen bg-[#f2f3f5]">
      {/* ================= header ================= */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a] px-4 pt-4 shadow-md sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Maxxed Out</p>
            <h1 className="text-lg font-extrabold text-white sm:text-xl">Command Center</h1>
          </div>
          <p className="pb-3 text-[10px] text-white/40">
            Updated {fmtEt(data.generatedAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET
            · auto-refreshes
          </p>
        </div>
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`whitespace-nowrap rounded-t-lg px-3.5 py-2 text-xs font-semibold transition-colors sm:px-4 ${
                tab === t.id
                  ? 'bg-[#f2f3f5] text-[#0a0a0a]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-3 sm:p-5">
        {/* ================= OVERVIEW ================= */}
        {tab === 'overview' ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
              <Stat label="Gross (all time)" value={usd(kpis.grossAllTimeCents, true)} tone="brand" />
              <Stat label="Net to Todd" value={usd(kpis.netAllTimeCents, true)} tone="good" />
              <Stat label="Last 30 days" value={usd(kpis.last30Cents, true)} sub={`${kpis.last30Count} sales`} />
              <Stat label="This month" value={usd(kpis.monthToDateCents, true)} />
              <Stat label="Open pipeline" value={kpis.openOpportunities.toLocaleString()} sub="open opportunities" />
              <Stat label="Upcoming calls" value={String(kpis.upcomingCalls)} sub="GHL + Calendly, 14d" />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card title="Daily revenue — last 30 days">
                <TrendChart
                  data={revenue.daily}
                  kind="bar"
                  height={220}
                  valueFormatter="usd-cents"
                  series={[
                    { key: 'fanbasis', label: 'Fanbasis', color: CHART_COLORS[0] },
                    { key: 'ghl', label: 'GHL / Stripe', color: CHART_COLORS[1] },
                    { key: 'stripe', label: 'University Stripe', color: CHART_COLORS[2] },
                  ]}
                />
              </Card>
              <Card title="Gross by offer (all time)">
                <BarList
                  items={revenue.byOffer.map((r) => ({
                    label: `${r.label} (${r.units})`,
                    value: r.grossCents,
                    display: usd(r.grossCents, true),
                  }))}
                />
              </Card>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <Card title="Next calls">
                <DataTable
                  headers={['When (ET)', 'Call']}
                  rows={calls.upcoming.slice(0, 5).map((c) => [
                    fmtEt(c.startTime, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    <span key="t" className="line-clamp-1 max-w-[200px]">{c.title}</span>,
                  ])}
                />
              </Card>
              <Card title="Cohort snapshot">
                <FunnelSteps
                  steps={[
                    { label: 'Applied', value: pipeline.cohort.applications },
                    { label: 'Called', value: pipeline.cohort.called },
                    { label: 'Paid', value: pipeline.cohort.paid },
                  ]}
                />
              </Card>
              <Card title="Latest sales">
                <DataTable
                  headers={['Buyer', 'Gross']}
                  align={['l', 'r']}
                  rows={revenue.recent.slice(0, 5).map((t) => [
                    <ContactLink key="b" name={t.buyer} ghlUrl={t.ghlUrl} />,
                    <b key="g">{usd(t.grossCents)}</b>,
                  ])}
                />
              </Card>
            </div>
          </>
        ) : null}

        {/* ================= REVENUE ================= */}
        {tab === 'revenue' ? (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <Card title="Daily revenue — last 30 days" className="lg:col-span-2">
                <TrendChart
                  data={revenue.daily}
                  kind="bar"
                  height={240}
                  valueFormatter="usd-cents"
                  series={[
                    { key: 'fanbasis', label: 'Fanbasis', color: CHART_COLORS[0] },
                    { key: 'ghl', label: 'GHL / Stripe', color: CHART_COLORS[1] },
                    { key: 'stripe', label: 'University Stripe', color: CHART_COLORS[2] },
                  ]}
                />
              </Card>
              <Card title="By payment rail">
                <BarList
                  items={revenue.byRail.map((r) => ({
                    label: `${r.rail} (${r.count})`,
                    value: r.grossCents,
                    display: usd(r.grossCents, true),
                  }))}
                />
                <p className="mt-3 text-[11px] leading-relaxed text-[#9CA3AF]">
                  Net to Todd {usd(kpis.netAllTimeCents, true)} of {usd(kpis.grossAllTimeCents, true)} gross.
                  Fanbasis net is exact; other rails report gross.
                </p>
              </Card>
            </div>
            <Card title="Gross by offer (all time)" className="mt-3">
              <BarList
                items={revenue.byOffer.map((r) => ({
                  label: `${r.label} (${r.units})`,
                  value: r.grossCents,
                  display: usd(r.grossCents, true),
                }))}
              />
            </Card>
            <Card title="Recent transactions — click a buyer to open their GHL contact" className="mt-3">
              <DataTable
                headers={['Date', 'Buyer', 'Product', 'Rail', 'Gross', 'Net']}
                align={['l', 'l', 'l', 'l', 'r', 'r']}
                rows={revenue.recent.map((t) => [
                  t.date,
                  <ContactLink key="b" name={t.buyer} ghlUrl={t.ghlUrl} />,
                  <span key="p" className="line-clamp-1 max-w-[240px]">{t.product}</span>,
                  t.rail,
                  <b key="g">{usd(t.grossCents)}</b>,
                  usd(t.netCents),
                ])}
              />
            </Card>
          </>
        ) : null}

        {/* ================= PIPELINE ================= */}
        {tab === 'pipeline' ? (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card title="GHL opportunities by pipeline">
                <BarList
                  items={pipeline.pipelines.map((p) => ({
                    label: `${p.name} — ${p.purchased} won`,
                    value: p.total,
                    display: String(p.total),
                  }))}
                />
              </Card>
              <Card title={`Medicaid cohort — ${usd(pipeline.cohort.collectedCents, true)} collected`}>
                <FunnelSteps
                  steps={[
                    { label: 'Applied', value: pipeline.cohort.applications },
                    { label: 'Called', value: pipeline.cohort.called },
                    { label: 'Booked / enrolled', value: pipeline.cohort.booked },
                    { label: 'Paid', value: pipeline.cohort.paid },
                  ]}
                />
                <p className="mt-2 text-[11px] text-[#9CA3AF]">
                  {pipeline.cohort.vip} VIP · Tiers {pipeline.cohort.tiers.map((t) => `${t.tier} ${t.count}`).join(' · ')}
                </p>
              </Card>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <Card title="Cohort leads by closer">
                <DataTable
                  headers={['Closer', 'Leads', 'Buyers']}
                  align={['l', 'r', 'r']}
                  rows={pipeline.cohort.closers.map((c) => [c.name, String(c.leads), <b key="b">{String(c.buyers)}</b>])}
                />
              </Card>
              <Card title={`Contracts — ${usd(pipeline.contracts.outstandingCents, true)} awaiting signature`}>
                <FunnelSteps
                  color={CHART_COLORS[2]}
                  steps={[
                    { label: 'Sent', value: pipeline.contracts.sent },
                    { label: 'Viewed', value: pipeline.contracts.viewed },
                    { label: 'Signed', value: pipeline.contracts.signed },
                  ]}
                />
                <p className="mt-2 text-[11px] text-[#9CA3AF]">
                  {usd(pipeline.contracts.signedValueCents, true)} signed contract value
                </p>
              </Card>
              <Card title="Checkout links & promos">
                <FunnelSteps
                  color={CHART_COLORS[1]}
                  steps={[
                    { label: 'Links sent', value: pipeline.checkoutLinks.sent },
                    { label: 'Clicked', value: pipeline.checkoutLinks.clicked },
                    { label: 'Paid', value: pipeline.checkoutLinks.paid },
                  ]}
                />
                {pipeline.promos.length > 0 ? (
                  <p className="mt-2 text-[11px] text-[#9CA3AF]">
                    {pipeline.promos.map((p) => `${p.code} (${p.label}, ${p.uses} used)`).join(' · ')}
                  </p>
                ) : null}
              </Card>
            </div>
          </>
        ) : null}

        {/* ================= CALLS ================= */}
        {tab === 'calls' ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Stat label="Upcoming (14d)" value={String(kpis.upcomingCalls)} tone="brand" />
              <Stat
                label="GHL show rate (30d)"
                value={
                  calls.ghlShowRate.showed + calls.ghlShowRate.noShows > 0
                    ? `${Math.round((calls.ghlShowRate.showed / (calls.ghlShowRate.showed + calls.ghlShowRate.noShows)) * 100)}%`
                    : '—'
                }
                sub={`${calls.ghlShowRate.showed} showed / ${calls.ghlShowRate.noShows} no-show`}
              />
              <Stat label="Calendly held (30d)" value={String(calls.calendly.held30)} tone="good" />
              <Stat
                label="Calendly canceled"
                value={String(calls.calendly.canceled30)}
                tone={calls.calendly.canceled30 > calls.calendly.held30 ? 'serious' : 'default'}
              />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <Card title="All upcoming calls (GHL + Calendly)" className="lg:col-span-2">
                <DataTable
                  headers={['When (ET)', 'Call', 'Calendar']}
                  rows={calls.upcoming.map((c) => [
                    fmtEt(c.startTime, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    <span key="t" className="line-clamp-1 max-w-[240px]">{c.title}</span>,
                    <span key="c" style={{ color: c.source === 'calendly' ? STATUS.neutral : undefined }}>{c.calendar}</span>,
                  ])}
                />
              </Card>
              <Card title="Calendly bookings by type (30d)">
                <BarList
                  items={calls.calendly.byType.map((t) => ({ label: t.label, value: t.count, display: String(t.count) }))}
                />
              </Card>
            </div>
          </>
        ) : null}

        {/* ================= MARKETING ================= */}
        {tab === 'marketing' ? (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card title={marketing.webinar ? `Webinar — ${marketing.webinar.title}` : 'Webinar'}>
                {marketing.webinar ? (
                  <>
                    <FunnelSteps
                      color={CHART_COLORS[4]}
                      steps={[
                        { label: 'Registered', value: marketing.webinar.registered },
                        { label: 'Attended', value: marketing.webinar.attended },
                        { label: 'VIP purchased', value: marketing.webinar.vipPurchased },
                      ]}
                    />
                    <p className="mt-2 text-[11px] text-[#9CA3AF]">
                      {marketing.webinar.showUpPct.toFixed(0)}% show-up · {marketing.webinar.vipConversionPct.toFixed(1)}% VIP
                      conversion · {marketing.webinar.upcomingSessions} upcoming sessions
                    </p>
                    {marketing.webinar.abTest.length > 0 ? (
                      <div className="mt-3">
                        <DataTable
                          headers={['Variant', 'Registrations', 'Show-up', 'VIP']}
                          align={['l', 'r', 'r', 'r']}
                          rows={marketing.webinar.abTest.map((v) => [
                            <b key="v">Variant {v.variant.toUpperCase()}</b>,
                            String(v.registrations),
                            `${v.showUpPct.toFixed(0)}%`,
                            String(v.purchased),
                          ])}
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-[#9CA3AF]">Webinar app unreachable</p>
                )}
              </Card>
              <Card title="Funnel traffic — last 30 days (PostHog)">
                <DataTable
                  headers={['Funnel', 'Views', 'CTA', 'Enrolled']}
                  align={['l', 'r', 'r', 'r']}
                  rows={marketing.funnels.perFunnel.map((f) => [
                    f.name,
                    f.views.toLocaleString(),
                    f.cta.toLocaleString(),
                    <b key="e">{String(f.enrollments)}</b>,
                  ])}
                />
                <p className="mt-2 text-[11px] text-[#9CA3AF]">
                  {marketing.funnels.totals.views.toLocaleString()} views · {marketing.funnels.totals.visitors.toLocaleString()}{' '}
                  visitors · {marketing.funnels.totals.cta.toLocaleString()} CTA clicks · {marketing.funnels.totals.checkouts}{' '}
                  checkouts · {marketing.funnels.totals.enrollments} enrolled
                </p>
              </Card>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <Card title={`Applications per day (30d: ${marketing.leads.count30})`} className="lg:col-span-2">
                <TrendChart
                  data={marketing.leads.daily}
                  kind="bar"
                  height={200}
                  valueFormatter="count"
                  series={[{ key: 'applications', label: 'Applications', color: CHART_COLORS[0] }]}
                />
              </Card>
              <Card title="Latest applications — click for GHL">
                <DataTable
                  headers={['Name', 'Program']}
                  rows={marketing.leads.recent.map((a) => [
                    <ContactLink key="n" name={a.name} ghlUrl={a.ghlUrl} />,
                    <span key="p" className="line-clamp-1 max-w-[160px]">{a.program}</span>,
                  ])}
                />
              </Card>
            </div>
          </>
        ) : null}

        {/* ================= UNIVERSITY ================= */}
        {tab === 'university' ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Stat label="Students" value={university.students.toLocaleString()} tone="brand" />
              <Stat label="Enrollments" value={university.enrollments.toLocaleString()} sub={`+${university.newEnrollments30} last 30d`} />
              <Stat label="Active this week" value={String(university.active7)} tone="good" />
              <Stat
                label="Lesson completion"
                value={`${university.completionPct.toFixed(0)}%`}
                sub={`quiz pass ${university.quizPassPct.toFixed(0)}%`}
              />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card title="Enrollments by course">
                <BarList
                  items={university.byCourse.map((c) => ({ label: c.label, value: c.count, display: String(c.count) }))}
                />
              </Card>
              <Card title="Newest enrollments">
                <DataTable
                  headers={['Student', 'Course', 'Via', 'When']}
                  rows={university.recentEnrollments.map((e) => [
                    e.name,
                    <span key="c" className="line-clamp-1 max-w-[180px]">{e.course}</span>,
                    e.via,
                    e.when,
                  ])}
                />
              </Card>
            </div>
          </>
        ) : null}

        <p className="mt-5 pb-2 text-center text-[10px] text-[#9CA3AF]">
          Fanbasis · GoHighLevel · Calendly · PostHog · webinar engine · university DB — refreshes every 5 minutes
        </p>
      </main>
    </div>
  );
}
