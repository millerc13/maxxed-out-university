import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryPostHog } from '@/lib/posthog';
import { can } from '@/lib/permissions';

// Read-only funnels analytics summary — any staff role may view.
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !can(session.user.role, 'admin:access')) return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [totals, perProgram, dailyByProgram] = await Promise.all([
    // Overall KPIs across all funnels
    queryPostHog(`
      SELECT
        countIf(event = '$pageview') as total_views,
        countIf(event = 'checkout_started') as total_checkouts,
        countIf(event = 'enrollment_completed') as total_enrollments,
        countIf(event = 'cta_clicked') as total_cta_clicks
      FROM events
      WHERE timestamp >= now() - interval 30 day
    `),

    // Per-program breakdown
    queryPostHog(`
      SELECT
        properties.program as program,
        countIf(event = '$pageview') as views,
        countIf(event = 'checkout_started') as checkouts,
        countIf(event = 'enrollment_completed') as enrollments
      FROM events
      WHERE timestamp >= now() - interval 30 day
        AND properties.program IS NOT NULL
        AND properties.program != 'Unknown'
      GROUP BY program
      ORDER BY views DESC
    `),

    // Daily views by program (last 14 days for sparkline)
    queryPostHog(`
      SELECT
        toDate(timestamp) as day,
        properties.program as program,
        countIf(event = '$pageview') as views
      FROM events
      WHERE timestamp >= now() - interval 14 day
        AND event = '$pageview'
        AND properties.program IS NOT NULL
        AND properties.program != 'Unknown'
      GROUP BY day, program
      ORDER BY day
    `),
  ]);

  const [totalViews, totalCheckouts, totalEnrollments, totalCtaClicks] =
    (totals.results[0] ?? [0, 0, 0, 0]).map(Number);

  const programs = perProgram.results.map(([program, views, checkouts, enrollments]) => ({
    program: String(program),
    views: Number(views),
    checkouts: Number(checkouts),
    enrollments: Number(enrollments),
    conversionRate: Number(views) > 0 ? Number(enrollments) / Number(views) : 0,
  }));

  // Build daily chart data: [{day, Blueprint, DoneWithYou, Mentorship}]
  const dailyMap = new Map<string, Record<string, number>>();
  for (const [day, program, views] of dailyByProgram.results) {
    const d = String(day);
    if (!dailyMap.has(d)) dailyMap.set(d, {});
    dailyMap.get(d)![String(program)] = Number(views);
  }
  const dailyChart = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, data]) => ({ day, ...data }));

  // Build sparkline data per program
  const sparklines: Record<string, number[]> = {};
  for (const [, program, views] of dailyByProgram.results) {
    const p = String(program);
    if (!sparklines[p]) sparklines[p] = [];
    sparklines[p].push(Number(views));
  }

  return NextResponse.json({
    totals: {
      views: totalViews,
      checkouts: totalCheckouts,
      enrollments: totalEnrollments,
      ctaClicks: totalCtaClicks,
      conversionRate: totalViews > 0 ? totalEnrollments / totalViews : 0,
    },
    programs,
    sparklines,
    dailyChart,
  });
}
