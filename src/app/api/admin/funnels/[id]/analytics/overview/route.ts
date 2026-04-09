import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryPostHog, subdomainToProgram } from '@/lib/posthog';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const funnel = await prisma.funnelDeployment.findUnique({
    where: { id },
    select: { subdomain: true },
  });
  if (!funnel) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const program = subdomainToProgram(funnel.subdomain);

  const kpis = await queryPostHog(`
    SELECT
      countIf(event = '$pageview') as pageviews,
      countIf(event = 'checkout_started') as checkout_starts,
      countIf(event = 'enrollment_completed') as enrollments
    FROM events
    WHERE properties.program = '${program}'
      AND timestamp >= now() - interval 30 day
  `);

  const daily = await queryPostHog(`
    SELECT
      toDate(timestamp) as day,
      countIf(event = '$pageview') as pageviews,
      countIf(event = 'checkout_started') as checkouts,
      countIf(event = 'enrollment_completed') as enrollments
    FROM events
    WHERE properties.program = '${program}'
      AND timestamp >= now() - interval 30 day
    GROUP BY day
    ORDER BY day
  `);

  const [pageviews, checkoutStarts, enrollments] = kpis.results[0] ?? [0, 0, 0];

  return NextResponse.json({
    kpis: {
      pageviews: Number(pageviews),
      checkoutStarts: Number(checkoutStarts),
      enrollments: Number(enrollments),
      conversionRate: Number(pageviews) > 0 ? Number(enrollments) / Number(pageviews) : 0,
    },
    daily: daily.results.map(([day, pv, co, en]) => ({
      day: String(day),
      pageviews: Number(pv),
      checkouts: Number(co),
      enrollments: Number(en),
    })),
  });
}
