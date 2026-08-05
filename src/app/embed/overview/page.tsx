import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { listUnifiedTransactions, formatUsd, sumCents, since } from '@/lib/embed/revenue';
import { OFFERS } from '@/lib/embed/offers';
import {
  listPipelines,
  listOpportunities,
  listAppointments,
  ghlContactUrl,
  findGhlContactIdByEmail,
} from '@/lib/embed/ghl';
import { listCalendlyEvents } from '@/lib/embed/calendly';
import { getWebinarOverview, getWebinarStats } from '@/lib/embed/webinar';
import { queryPostHog, funnelHost, hogqlString } from '@/lib/posthog';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { DataTable } from '@/components/embed/DataTable';
import { TrendChart } from '@/components/embed/TrendChart';
import { ContactLink } from '@/components/embed/ContactLink';
import { CHART_COLORS, STATUS, chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-sm font-bold uppercase tracking-wide text-[#374151]">
        {title}
      </h2>
      {children}
    </section>
  );
}

const fmtEt = (d: string | Date, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString('en-US', { timeZone: 'America/New_York', ...opts });

/**
 * The Command Center: every offer, rail and pipeline on one page,
 * deduplicated — each KPI appears exactly once.
 */
export default async function OverviewWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('overview', k)) return <EmbedDenied />;

  const now = new Date();
  const nowMs = now.getTime();
  const since30 = new Date(nowMs - 30 * 86_400_000);
  const since7 = new Date(nowMs - 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ---- funnel host map for the PostHog block (needed before the big fan-out)
  const funnelDeployments = await prisma.funnelDeployment.findMany({
    where: { subdomain: { not: null } },
    select: { name: true, subdomain: true },
  });
  const hostToName = new Map<string, string>();
  for (const f of funnelDeployments) {
    const host = funnelHost(f.subdomain);
    if (host) hostToName.set(host, f.name);
  }
  const hostList = [...hostToName.keys()].map((h) => `'${hogqlString(h)}'`).join(', ');

  const [
    txs,
    pipelines,
    opportunities,
    upcomingAppts,
    pastAppts,
    calendly,
    webinarOverview,
    cohortApps,
    apps30,
    recentLeads,
    students,
    enrollments,
    completedLessons,
    startedLessons,
    active7,
    contracts,
    checkoutLinks,
    promos,
    funnelTotalsR,
    funnelPerHostR,
  ] = await Promise.all([
    listUnifiedTransactions(),
    listPipelines(),
    listOpportunities(),
    listAppointments(nowMs, nowMs + 14 * 86_400_000),
    listAppointments(nowMs - 30 * 86_400_000, nowMs),
    listCalendlyEvents(30),
    getWebinarOverview(),
    prisma.cohortApplication.findMany({
      select: {
        tier: true, status: true, isVip: true, assignedTo: true,
        paymentPlan: true, paidTotalCents: true, paymentsMade: true,
        paidInFullAt: true, firstPaidAt: true, name: true, ghlContactId: true,
      },
    }),
    prisma.application.findMany({
      where: { createdAt: { gte: since30 } },
      select: { source: true, createdAt: true },
    }),
    prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        name: true, email: true, source: true, createdAt: true, ghlContactId: true,
        course: { select: { title: true } },
      },
    }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.enrollment.count({ where: { course: { bundleId: null } } }),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.lessonProgress.count(),
    prisma.lessonProgress.groupBy({ by: ['userId'], where: { updatedAt: { gte: since7 } } }),
    prisma.documentSignature.findMany({
      select: { status: true, paymentTotalCents: true, sentAt: true, firstViewedAt: true },
    }),
    prisma.checkoutLink.findMany({ select: { clickedAt: true, paidAt: true } }),
    prisma.promoCode.findMany({
      where: { active: true },
      orderBy: { currentUses: 'desc' },
      take: 5,
      select: { code: true, discountType: true, discountValue: true, currentUses: true, maxUses: true },
    }),
    hostList
      ? queryPostHog(`
          SELECT countIf(event = '$pageview') as views,
                 count(DISTINCT person_id) as visitors,
                 countIf(event = 'cta_clicked') as cta,
                 countIf(event = 'checkout_started') as checkouts,
                 countIf(event = 'enrollment_completed') as enrollments
          FROM events
          WHERE timestamp >= now() - interval 30 day AND properties.$host IN (${hostList})
        `)
      : Promise.resolve({ results: [] as unknown[][] }),
    hostList
      ? queryPostHog(`
          SELECT properties.$host as host,
                 countIf(event = '$pageview') as views,
                 countIf(event = 'cta_clicked') as cta,
                 countIf(event = 'checkout_started') as checkouts,
                 countIf(event = 'enrollment_completed') as enrollments
          FROM events
          WHERE timestamp >= now() - interval 30 day AND properties.$host IN (${hostList})
          GROUP BY host ORDER BY views DESC
        `)
      : Promise.resolve({ results: [] as unknown[][] }),
  ]);

  // ================= revenue =================
  const l30 = since(txs, since30);
  const byDay = new Map<string, { fanbasis: number; ghl: number; stripe: number }>();
  for (let i = 29; i >= 0; i--) {
    byDay.set(new Date(nowMs - i * 86_400_000).toISOString().slice(0, 10), { fanbasis: 0, ghl: 0, stripe: 0 });
  }
  for (const t of l30) {
    const row = byDay.get(t.date.slice(0, 10));
    if (row) row[t.rail] += t.grossCents;
  }
  const revChart = [...byDay.entries()].map(([day, v]) => ({ day, ...v }));

  const byOffer = new Map<string, { label: string; gross: number; units: number }>();
  for (const o of OFFERS) byOffer.set(o.id, { label: o.label, gross: 0, units: 0 });
  for (const t of txs) {
    const row = byOffer.get(t.offerId)!;
    row.gross += t.grossCents;
    row.units += 1;
  }
  const offerRows = [...byOffer.values()].filter((r) => r.units > 0).sort((a, b) => b.gross - a.gross);

  // Recent transactions with GHL contact links (GHL rail carries the id;
  // Fanbasis/Stripe buyers resolve by email, cached 1h).
  const recentTxs = await Promise.all(
    txs.slice(0, 10).map(async (t) => {
      const contactId = t.ghlContactId ?? (await findGhlContactIdByEmail(t.buyerEmail));
      return { ...t, ghlUrl: contactId ? ghlContactUrl(contactId) : null };
    })
  );

  // ================= pipeline =================
  const openOpps = opportunities.filter((o) => o.status === 'open');
  const openValueCents = openOpps.reduce((a, o) => a + o.monetaryValue, 0) * 100;
  const pipelineRows = pipelines
    .map((p) => {
      const opps = opportunities.filter((o) => o.pipelineId === p.id);
      const stageName = new Map(p.stages.map((s) => [s.id, s.name]));
      const purchased = opps.filter((o) => {
        const stage = (stageName.get(o.pipelineStageId) ?? '').toLowerCase();
        return o.status === 'won' || stage.includes('purchased') || stage.includes('paid') || stage.includes('closed');
      }).length;
      return { name: p.name, total: opps.length, purchased };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);

  // ================= cohort =================
  const cohortBuyers = cohortApps.filter((a) => a.firstPaidAt !== null);
  const cohortCalled = cohortApps.filter((a) => a.status !== 'new').length;
  const cohortBooked = cohortApps.filter((a) => ['booked', 'enrolled'].includes(a.status)).length;
  const cohortCollected = cohortApps.reduce((acc, a) => acc + (a.paidTotalCents ?? 0), 0);
  const tierRows = ['A', 'B', 'C', 'D'].map((tier) => ({
    tier,
    count: cohortApps.filter((a) => a.tier === tier).length,
  }));

  // ================= calls =================
  const showed = pastAppts.filter((a) => a.status === 'showed').length;
  const noShows = pastAppts.filter((a) => a.status === 'noshow').length;
  const decided = showed + noShows;
  const nowIso = now.toISOString();
  const calUpcoming = calendly.filter((e) => e.status === 'active' && e.startTime >= nowIso);
  const calCanceled = calendly.filter((e) => e.status === 'canceled').length;
  const calHeld = calendly.filter((e) => e.status === 'active' && e.startTime < nowIso).length;

  // ================= webinar =================
  const firstWebinar = webinarOverview?.webinars?.[0];
  const webinarStats = firstWebinar ? await getWebinarStats(firstWebinar.id) : null;
  const ws = webinarStats?.stats;

  // ================= marketing =================
  const [fViews, fVisitors, fCta, fCheckouts, fEnrollments] = (funnelTotalsR.results[0] ?? [0, 0, 0, 0, 0]).map(Number);
  const leadsBySource = new Map<string, number>();
  for (const a of apps30) leadsBySource.set(a.source ?? 'unknown', (leadsBySource.get(a.source ?? 'unknown') ?? 0) + 1);
  const leadSourceRows = [...leadsBySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // ================= platform =================
  const docsSent = contracts.filter((d) => d.sentAt !== null).length;
  const docsViewed = contracts.filter((d) => d.firstViewedAt !== null).length;
  const docsSigned = contracts.filter((d) => d.status === 'completed').length;
  const docsOutstandingValue = contracts
    .filter((d) => ['sent', 'viewed'].includes(d.status))
    .reduce((a, d) => a + (d.paymentTotalCents ?? 0), 0);

  const linksClicked = checkoutLinks.filter((l) => l.clickedAt !== null).length;
  const linksPaid = checkoutLinks.filter((l) => l.paidAt !== null).length;

  const completionRate = startedLessons > 0 ? (completedLessons / startedLessons) * 100 : 0;

  return (
    <EmbedShell title="Maxxed Out — Command Center" subtitle="Revenue, pipeline, calls, marketing and university — every system, one page">
      {/* ============ HERO KPIs (each number appears only here) ============ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        <Stat label="Gross (all time)" value={formatUsd(sumCents(txs), { compact: true })} tone="brand" />
        <Stat label="Net to Todd" value={formatUsd(sumCents(txs, 'netCents'), { compact: true })} tone="good" />
        <Stat label="Last 30 days" value={formatUsd(sumCents(l30), { compact: true })} sub={`${l30.length} sales`} />
        <Stat label="This month" value={formatUsd(sumCents(since(txs, monthStart)), { compact: true })} />
        <Stat
          label="Open pipeline"
          value={openOpps.length.toLocaleString()}
          sub={openValueCents > 0 ? `open opps · ${formatUsd(openValueCents, { compact: true })} tagged value` : 'open opportunities'}
        />
        <Stat label="Upcoming calls" value={String(upcomingAppts.length + calUpcoming.length)} sub="GHL + Calendly, 14d" />
      </div>

      {/* ============ REVENUE ============ */}
      <Section title="Revenue">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Daily revenue — last 30 days">
            <TrendChart
              data={revChart}
              kind="bar"
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
              items={offerRows.map((r) => ({
                label: `${r.label} (${r.units})`,
                value: r.gross,
                display: formatUsd(r.gross, { compact: true }),
              }))}
            />
          </Card>
        </div>
        <Card title="Recent transactions — click a buyer to open their GHL contact" className="mt-3">
          <DataTable
            headers={['Date', 'Buyer', 'Product', 'Gross', 'Net']}
            align={['l', 'l', 'l', 'r', 'r']}
            rows={recentTxs.map((t) => [
              t.date.slice(0, 10),
              <ContactLink key="b" name={t.buyerName || t.buyerEmail} ghlUrl={t.ghlUrl} />,
              <span key="p" className="line-clamp-1 max-w-[240px]">{t.label}</span>,
              <b key="g">{formatUsd(t.grossCents)}</b>,
              formatUsd(t.netCents),
            ])}
          />
        </Card>
      </Section>

      {/* ============ SALES PIPELINE ============ */}
      <Section title="Sales Pipeline">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="GHL opportunities by pipeline">
            <BarList
              items={pipelineRows.map((p) => ({
                label: `${p.name} — ${p.purchased} won`,
                value: p.total,
                display: String(p.total),
              }))}
            />
          </Card>
          <Card title={`Medicaid cohort (${cohortApps.length} apps, ${formatUsd(cohortCollected, { compact: true })} collected)`}>
            <FunnelSteps
              steps={[
                { label: 'Applied', value: cohortApps.length },
                { label: 'Called', value: cohortCalled },
                { label: 'Booked / enrolled', value: cohortBooked },
                { label: 'Paid', value: cohortBuyers.length },
              ]}
            />
            <p className="mt-2 text-[11px] text-[#9CA3AF]">
              Tiers: {tierRows.map((t) => `${t.tier} ${t.count}`).join(' · ')}
            </p>
          </Card>
        </div>
      </Section>

      {/* ============ CALLS & BOOKINGS ============ */}
      <Section title="Calls & Bookings">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title={`GHL appointments — ${decided > 0 ? `${Math.round((showed / decided) * 100)}% show rate` : 'show rate n/a'} (30d: ${showed} showed / ${noShows} no-show)`}>
            <DataTable
              headers={['When (ET)', 'Title', 'Calendar']}
              rows={upcomingAppts.slice(0, 7).map((a) => [
                fmtEt(a.startTime, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                <span key="t" className="line-clamp-1 max-w-[200px]">{a.title}</span>,
                a.calendarName,
              ])}
            />
          </Card>
          <Card title={`Calendly (Rebecca) — 30d: ${calHeld} held / ${calCanceled} canceled`}>
            <DataTable
              headers={['When (ET)', 'Call type']}
              rows={calUpcoming.slice(0, 7).map((e) => [
                fmtEt(e.startTime, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                <span key="n" className="line-clamp-1 max-w-[260px]">{e.name}</span>,
              ])}
            />
          </Card>
        </div>
      </Section>

      {/* ============ MARKETING ============ */}
      <Section title="Marketing & Funnels">
        <div className="grid gap-3 lg:grid-cols-3">
          <Card title={firstWebinar ? `Webinar — ${firstWebinar.title}` : 'Webinar'}>
            {ws ? (
              <>
                <FunnelSteps
                  color={CHART_COLORS[4]}
                  steps={[
                    { label: 'Registered', value: ws.registered },
                    { label: 'Attended', value: ws.attended + ws.vipPurchased },
                    { label: 'VIP purchased', value: ws.vipPurchased },
                  ]}
                />
                <p className="mt-2 text-[11px] text-[#9CA3AF]">
                  {ws.attendanceRatePct.toFixed(0)}% show-up · {ws.vipConversionPct.toFixed(1)}% VIP conversion ·{' '}
                  {webinarOverview?.summary.upcomingCount ?? 0} upcoming sessions
                </p>
              </>
            ) : (
              <p className="text-xs text-[#9CA3AF]">Webinar app unreachable</p>
            )}
          </Card>
          <Card title="Funnel traffic (30d, PostHog)">
            <DataTable
              headers={['Funnel', 'Views', 'CTA', 'Buys']}
              align={['l', 'r', 'r', 'r']}
              rows={funnelPerHostR.results.slice(0, 6).map((r) => {
                const [host, v, c, , en] = r as [string, number, number, number, number];
                return [
                  hostToName.get(String(host)) ?? String(host),
                  Number(v).toLocaleString(),
                  Number(c).toLocaleString(),
                  <b key="e">{String(Number(en))}</b>,
                ];
              })}
            />
            <p className="mt-2 text-[11px] text-[#9CA3AF]">
              Totals: {fViews.toLocaleString()} views · {fVisitors.toLocaleString()} visitors · {fCta.toLocaleString()} CTA ·{' '}
              {fCheckouts} checkouts · {fEnrollments} enrolled
            </p>
          </Card>
          <Card title={`Applications (30d: ${apps30.length}) — click name for GHL`}>
            <BarList
              items={leadSourceRows.map(([label, value], i) => ({
                label,
                value,
                display: String(value),
                color: chartColor(i),
              }))}
            />
            <div className="mt-2">
              <DataTable
                headers={['Latest', 'Program']}
                rows={recentLeads.slice(0, 5).map((a) => [
                  <ContactLink
                    key="n"
                    name={a.name ?? a.email}
                    ghlUrl={a.ghlContactId ? ghlContactUrl(a.ghlContactId) : null}
                  />,
                  <span key="c" className="line-clamp-1 max-w-[160px]">{a.course?.title ?? a.source ?? '—'}</span>,
                ])}
              />
            </div>
          </Card>
        </div>
      </Section>

      {/* ============ UNIVERSITY & BACK OFFICE ============ */}
      <Section title="University & Back Office">
        <div className="grid gap-3 lg:grid-cols-3">
          <Card title="Students & engagement">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#6B7280]">Students</p>
                <p className="text-lg font-bold tabular-nums">{students.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#6B7280]">Enrollments</p>
                <p className="text-lg font-bold tabular-nums">{enrollments.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#6B7280]">Active 7d</p>
                <p className="text-lg font-bold tabular-nums text-[#15803D]">{active7.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#6B7280]">Lesson completion</p>
                <p className="text-lg font-bold tabular-nums">{completionRate.toFixed(0)}%</p>
              </div>
            </div>
          </Card>
          <Card title={`Contracts — ${formatUsd(docsOutstandingValue, { compact: true })} awaiting signature`}>
            <FunnelSteps
              color={CHART_COLORS[2]}
              steps={[
                { label: 'Sent', value: docsSent },
                { label: 'Viewed', value: docsViewed },
                { label: 'Signed', value: docsSigned },
              ]}
            />
          </Card>
          <Card title="Checkout links & promos">
            <FunnelSteps
              color={CHART_COLORS[3]}
              steps={[
                { label: 'Links sent', value: checkoutLinks.length },
                { label: 'Clicked', value: linksClicked },
                { label: 'Paid', value: linksPaid },
              ]}
            />
            {promos.length > 0 ? (
              <p className="mt-2 text-[11px] text-[#9CA3AF]">
                Promos:{' '}
                {promos
                  .map((p) => `${p.code} (${p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : formatUsd(p.discountValue)}, ${p.currentUses}${p.maxUses ? `/${p.maxUses}` : ''} used)`)
                  .join(' · ')}
              </p>
            ) : null}
          </Card>
        </div>
      </Section>

      <p className="mt-4 text-center text-[10px] text-[#9CA3AF]">
        <span style={{ color: STATUS.neutral }}>
          Data refreshes every 5 minutes · Fanbasis, GoHighLevel, Calendly, PostHog, webinar engine & university DB
        </span>
      </p>
    </EmbedShell>
  );
}
