import { prisma } from '@/lib/prisma';
import { listUnifiedTransactions, sumCents, since } from './revenue';
import { OFFERS } from './offers';
import {
  listPipelines,
  listOpportunities,
  listAppointments,
  ghlContactUrl,
  findGhlContactIdByEmail,
} from './ghl';
import { listCalendlyEvents } from './calendly';
import { getWebinarOverview, getWebinarStats } from './webinar';
import { queryPostHog, funnelHost, hogqlString } from '@/lib/posthog';

/**
 * Single data assembly for the full-page hub (/embed/hub). Everything
 * is plain JSON so the server page can hand it straight to the client
 * tab shell. Windows are fixed: revenue chart + "last 30d" KPIs use a
 * 30-day window; appointments look 14 days ahead.
 */

export type HubData = {
  generatedAt: string;
  kpis: {
    grossAllTimeCents: number;
    netAllTimeCents: number;
    last30Cents: number;
    last30Count: number;
    monthToDateCents: number;
    openOpportunities: number;
    upcomingCalls: number;
  };
  revenue: {
    daily: Array<{ day: string; fanbasis: number; ghl: number; stripe: number }>;
    byOffer: Array<{ label: string; grossCents: number; units: number }>;
    byRail: Array<{ rail: string; grossCents: number; count: number }>;
    recent: Array<{
      date: string;
      buyer: string;
      product: string;
      grossCents: number;
      netCents: number;
      rail: string;
      ghlUrl: string | null;
    }>;
  };
  pipeline: {
    pipelines: Array<{ name: string; total: number; open: number; purchased: number }>;
    cohort: {
      applications: number;
      called: number;
      booked: number;
      paid: number;
      collectedCents: number;
      vip: number;
      tiers: Array<{ tier: string; count: number }>;
      closers: Array<{ name: string; leads: number; buyers: number }>;
    };
    contracts: {
      sent: number;
      viewed: number;
      signed: number;
      outstandingCents: number;
      signedValueCents: number;
    };
    checkoutLinks: { sent: number; clicked: number; paid: number };
    promos: Array<{ code: string; label: string; uses: string }>;
  };
  calls: {
    upcoming: Array<{ startTime: string; title: string; calendar: string; source: 'ghl' | 'calendly' }>;
    ghlShowRate: { showed: number; noShows: number; total30d: number };
    calendly: { held30: number; canceled30: number; upcoming: number; byType: Array<{ label: string; count: number }> };
  };
  marketing: {
    webinar: {
      title: string;
      registered: number;
      attended: number;
      vipPurchased: number;
      showUpPct: number;
      vipConversionPct: number;
      upcomingSessions: number;
      abTest: Array<{ variant: string; registrations: number; showUpPct: number; purchased: number }>;
    } | null;
    funnels: {
      totals: { views: number; visitors: number; cta: number; checkouts: number; enrollments: number };
      perFunnel: Array<{ name: string; views: number; cta: number; enrollments: number }>;
    };
    leads: {
      count30: number;
      bySource: Array<{ label: string; count: number }>;
      daily: Array<{ day: string; applications: number }>;
      recent: Array<{ name: string; program: string; when: string; ghlUrl: string | null }>;
    };
  };
  university: {
    students: number;
    enrollments: number;
    newEnrollments30: number;
    active7: number;
    completionPct: number;
    quizPassPct: number;
    byCourse: Array<{ label: string; count: number }>;
    recentEnrollments: Array<{ name: string; course: string; via: string; when: string }>;
  };
};

export async function getHubData(): Promise<HubData> {
  const now = new Date();
  const nowMs = now.getTime();
  const since30 = new Date(nowMs - 30 * 86_400_000);
  const since7 = new Date(nowMs - 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nowIso = now.toISOString();

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
  const emptyQuery = Promise.resolve({ results: [] as unknown[][] });

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
    newEnrollments30,
    completedLessons,
    startedLessons,
    active7,
    quizAttempts,
    topCourses,
    recentEnrollments,
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
        paidTotalCents: true, firstPaidAt: true,
      },
    }),
    prisma.application.findMany({
      where: { createdAt: { gte: since30 } },
      select: { source: true, createdAt: true },
    }),
    prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        name: true, email: true, source: true, createdAt: true, ghlContactId: true,
        course: { select: { title: true } },
      },
    }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.enrollment.count({ where: { course: { bundleId: null } } }),
    prisma.enrollment.count({ where: { enrolledAt: { gte: since30 }, course: { bundleId: null } } }),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.lessonProgress.count(),
    prisma.lessonProgress.groupBy({ by: ['userId'], where: { updatedAt: { gte: since7 } } }),
    prisma.quizAttempt.findMany({ where: { completedAt: { not: null } }, select: { passed: true } }),
    prisma.enrollment.groupBy({
      by: ['courseId'],
      _count: { courseId: true },
      orderBy: { _count: { courseId: 'desc' } },
      take: 6,
    }),
    prisma.enrollment.findMany({
      orderBy: { enrolledAt: 'desc' },
      take: 8,
      select: {
        enrolledAt: true, source: true,
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    }),
    prisma.documentSignature.findMany({
      select: { status: true, paymentTotalCents: true, sentAt: true, firstViewedAt: true },
    }),
    prisma.checkoutLink.findMany({ select: { clickedAt: true, paidAt: true } }),
    prisma.promoCode.findMany({
      where: { active: true },
      orderBy: { currentUses: 'desc' },
      take: 6,
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
      : emptyQuery,
    hostList
      ? queryPostHog(`
          SELECT properties.$host as host,
                 countIf(event = '$pageview') as views,
                 countIf(event = 'cta_clicked') as cta,
                 countIf(event = 'enrollment_completed') as enrollments
          FROM events
          WHERE timestamp >= now() - interval 30 day AND properties.$host IN (${hostList})
          GROUP BY host ORDER BY views DESC
        `)
      : emptyQuery,
  ]);

  // ---------------- revenue ----------------
  const l30 = since(txs, since30);
  const byDay = new Map<string, { fanbasis: number; ghl: number; stripe: number }>();
  for (let i = 29; i >= 0; i--) {
    byDay.set(new Date(nowMs - i * 86_400_000).toISOString().slice(0, 10), { fanbasis: 0, ghl: 0, stripe: 0 });
  }
  for (const t of l30) {
    const row = byDay.get(t.date.slice(0, 10));
    if (row) row[t.rail] += t.grossCents;
  }

  const offerAgg = new Map<string, { label: string; grossCents: number; units: number }>();
  for (const o of OFFERS) offerAgg.set(o.id, { label: o.label, grossCents: 0, units: 0 });
  const railAgg = new Map<string, { grossCents: number; count: number }>();
  for (const t of txs) {
    const o = offerAgg.get(t.offerId)!;
    o.grossCents += t.grossCents;
    o.units += 1;
    const r = railAgg.get(t.rail) ?? { grossCents: 0, count: 0 };
    r.grossCents += t.grossCents;
    r.count += 1;
    railAgg.set(t.rail, r);
  }
  const RAIL_LABEL: Record<string, string> = { fanbasis: 'Fanbasis', ghl: 'GHL / Stripe', stripe: 'University Stripe' };

  const recent = await Promise.all(
    txs.slice(0, 12).map(async (t) => {
      const contactId = t.ghlContactId ?? (await findGhlContactIdByEmail(t.buyerEmail));
      return {
        date: t.date.slice(0, 10),
        buyer: t.buyerName || t.buyerEmail,
        product: t.label,
        grossCents: t.grossCents,
        netCents: t.netCents,
        rail: RAIL_LABEL[t.rail] ?? t.rail,
        ghlUrl: contactId ? ghlContactUrl(contactId) : null,
      };
    })
  );

  // ---------------- pipeline ----------------
  const openOpps = opportunities.filter((o) => o.status === 'open');
  const pipelineRows = pipelines
    .map((p) => {
      const opps = opportunities.filter((o) => o.pipelineId === p.id);
      const stageName = new Map(p.stages.map((s) => [s.id, s.name]));
      const purchased = opps.filter((o) => {
        const stage = (stageName.get(o.pipelineStageId) ?? '').toLowerCase();
        return o.status === 'won' || stage.includes('purchased') || stage.includes('paid') || stage.includes('closed');
      }).length;
      return {
        name: p.name,
        total: opps.length,
        open: opps.filter((o) => o.status === 'open').length,
        purchased,
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);

  const closerAgg = new Map<string, { leads: number; buyers: number }>();
  for (const a of cohortApps) {
    const key = a.assignedTo || 'Unassigned';
    const row = closerAgg.get(key) ?? { leads: 0, buyers: 0 };
    row.leads += 1;
    if (a.firstPaidAt) row.buyers += 1;
    closerAgg.set(key, row);
  }

  // ---------------- calls ----------------
  const showed = pastAppts.filter((a) => a.status === 'showed').length;
  const noShows = pastAppts.filter((a) => a.status === 'noshow').length;
  const calUpcoming = calendly.filter((e) => e.status === 'active' && e.startTime >= nowIso);
  const calTypeAgg = new Map<string, number>();
  for (const e of calendly) calTypeAgg.set(e.name, (calTypeAgg.get(e.name) ?? 0) + 1);

  const mergedUpcoming = [
    ...upcomingAppts.map((a) => ({
      startTime: a.startTime,
      title: a.title,
      calendar: a.calendarName,
      source: 'ghl' as const,
    })),
    ...calUpcoming.map((e) => ({
      startTime: e.startTime,
      title: e.name,
      calendar: 'Calendly (Rebecca)',
      source: 'calendly' as const,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ---------------- marketing ----------------
  const firstWebinar = webinarOverview?.webinars?.[0];
  const webinarStats = firstWebinar ? await getWebinarStats(firstWebinar.id) : null;
  const ws = webinarStats?.stats;

  const [fViews, fVisitors, fCta, fCheckouts, fEnrollments] = (funnelTotalsR.results[0] ?? [0, 0, 0, 0, 0]).map(Number);

  const leadsBySource = new Map<string, number>();
  for (const a of apps30) leadsBySource.set(a.source ?? 'unknown', (leadsBySource.get(a.source ?? 'unknown') ?? 0) + 1);

  const leadsByDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) leadsByDay.set(new Date(nowMs - i * 86_400_000).toISOString().slice(0, 10), 0);
  for (const a of apps30) {
    const d = a.createdAt.toISOString().slice(0, 10);
    if (leadsByDay.has(d)) leadsByDay.set(d, leadsByDay.get(d)! + 1);
  }

  // ---------------- university ----------------
  const courseTitles = await prisma.course.findMany({
    where: { id: { in: topCourses.map((c) => c.courseId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(courseTitles.map((c) => [c.id, c.title]));

  return {
    generatedAt: nowIso,
    kpis: {
      grossAllTimeCents: sumCents(txs),
      netAllTimeCents: sumCents(txs, 'netCents'),
      last30Cents: sumCents(l30),
      last30Count: l30.length,
      monthToDateCents: sumCents(since(txs, monthStart)),
      openOpportunities: openOpps.length,
      upcomingCalls: mergedUpcoming.length,
    },
    revenue: {
      daily: [...byDay.entries()].map(([day, v]) => ({ day, ...v })),
      byOffer: [...offerAgg.values()].filter((r) => r.units > 0).sort((a, b) => b.grossCents - a.grossCents),
      byRail: [...railAgg.entries()]
        .map(([rail, v]) => ({ rail: RAIL_LABEL[rail] ?? rail, ...v }))
        .sort((a, b) => b.grossCents - a.grossCents),
      recent,
    },
    pipeline: {
      pipelines: pipelineRows,
      cohort: {
        applications: cohortApps.length,
        called: cohortApps.filter((a) => a.status !== 'new').length,
        booked: cohortApps.filter((a) => ['booked', 'enrolled'].includes(a.status)).length,
        paid: cohortApps.filter((a) => a.firstPaidAt !== null).length,
        collectedCents: cohortApps.reduce((acc, a) => acc + (a.paidTotalCents ?? 0), 0),
        vip: cohortApps.filter((a) => a.isVip).length,
        tiers: ['A', 'B', 'C', 'D'].map((tier) => ({ tier, count: cohortApps.filter((a) => a.tier === tier).length })),
        closers: [...closerAgg.entries()]
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.leads - a.leads),
      },
      contracts: {
        sent: contracts.filter((d) => d.sentAt !== null).length,
        viewed: contracts.filter((d) => d.firstViewedAt !== null).length,
        signed: contracts.filter((d) => d.status === 'completed').length,
        outstandingCents: contracts
          .filter((d) => ['sent', 'viewed'].includes(d.status))
          .reduce((a, d) => a + (d.paymentTotalCents ?? 0), 0),
        signedValueCents: contracts
          .filter((d) => d.status === 'completed')
          .reduce((a, d) => a + (d.paymentTotalCents ?? 0), 0),
      },
      checkoutLinks: {
        sent: checkoutLinks.length,
        clicked: checkoutLinks.filter((l) => l.clickedAt !== null).length,
        paid: checkoutLinks.filter((l) => l.paidAt !== null).length,
      },
      promos: promos.map((p) => ({
        code: p.code,
        label: p.discountType === 'PERCENTAGE' ? `${p.discountValue}% off` : `$${(p.discountValue / 100).toFixed(0)} off`,
        uses: `${p.currentUses}${p.maxUses ? ` / ${p.maxUses}` : ''}`,
      })),
    },
    calls: {
      upcoming: mergedUpcoming.slice(0, 20),
      ghlShowRate: { showed, noShows, total30d: pastAppts.length },
      calendly: {
        held30: calendly.filter((e) => e.status === 'active' && e.startTime < nowIso).length,
        canceled30: calendly.filter((e) => e.status === 'canceled').length,
        upcoming: calUpcoming.length,
        byType: [...calTypeAgg.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      },
    },
    marketing: {
      webinar: ws && firstWebinar
        ? {
            title: firstWebinar.title,
            registered: ws.registered,
            attended: ws.attended + ws.vipPurchased,
            vipPurchased: ws.vipPurchased,
            showUpPct: ws.attendanceRatePct,
            vipConversionPct: ws.vipConversionPct,
            upcomingSessions: webinarOverview?.summary.upcomingCount ?? 0,
            abTest: (webinarStats?.abTest ?? []).map((v) => ({
              variant: v.variant,
              registrations: v.registrations,
              showUpPct: v.showUpPct,
              purchased: v.purchased,
            })),
          }
        : null,
      funnels: {
        totals: { views: fViews, visitors: fVisitors, cta: fCta, checkouts: fCheckouts, enrollments: fEnrollments },
        perFunnel: funnelPerHostR.results.map((r) => {
          const [host, views, cta, enrollmentsN] = r as [string, number, number, number];
          return {
            name: hostToName.get(String(host)) ?? String(host),
            views: Number(views),
            cta: Number(cta),
            enrollments: Number(enrollmentsN),
          };
        }),
      },
      leads: {
        count30: apps30.length,
        bySource: [...leadsBySource.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
        daily: [...leadsByDay.entries()].map(([day, applications]) => ({ day, applications })),
        recent: recentLeads.map((a) => ({
          name: a.name ?? a.email,
          program: a.course?.title ?? a.source ?? '—',
          when: a.createdAt.toISOString().slice(0, 10),
          ghlUrl: a.ghlContactId ? ghlContactUrl(a.ghlContactId) : null,
        })),
      },
    },
    university: {
      students,
      enrollments,
      newEnrollments30,
      active7: active7.length,
      completionPct: startedLessons > 0 ? (completedLessons / startedLessons) * 100 : 0,
      quizPassPct: quizAttempts.length > 0 ? (quizAttempts.filter((q) => q.passed).length / quizAttempts.length) * 100 : 0,
      byCourse: topCourses.map((c) => ({ label: titleById.get(c.courseId) ?? c.courseId, count: c._count.courseId })),
      recentEnrollments: recentEnrollments.map((e) => ({
        name: e.user.name ?? e.user.email,
        course: e.course.title,
        via: e.source ?? '—',
        when: e.enrolledAt.toISOString().slice(0, 10),
      })),
    },
  };
}
