import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryPostHog, subdomainToProgram } from '@/lib/posthog';
import { can } from '@/lib/permissions';

// Read-only funnel analytics — any staff role may view (no $ figures here).
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !can(session.user.role, 'admin:access')) return null;
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

  const steps = await queryPostHog(`
    SELECT
      countIf(event = '$pageview') as step1,
      countIf(event = 'cta_clicked') as step2,
      countIf(event = 'checkout_started') as step3,
      countIf(event = 'contact_info_submitted') as step4,
      countIf(event = 'payment_initiated') as step5,
      countIf(event = 'enrollment_completed') as step6
    FROM events
    WHERE properties.program = '${program}'
      AND timestamp >= now() - interval 30 day
  `);

  const errors = await queryPostHog(`
    SELECT
      properties.error_message as error,
      count() as count
    FROM events
    WHERE event = 'payment_error'
      AND properties.program = '${program}'
      AND timestamp >= now() - interval 30 day
    GROUP BY error
    ORDER BY count DESC
    LIMIT 10
  `);

  const [s1, s2, s3, s4, s5, s6] = (steps.results[0] ?? [0, 0, 0, 0, 0, 0]).map(Number);

  return NextResponse.json({
    steps: [
      { name: 'Landing Page Views', event: '$pageview', count: s1 },
      { name: 'CTA Clicks', event: 'cta_clicked', count: s2 },
      { name: 'Checkout Started', event: 'checkout_started', count: s3 },
      { name: 'Contact Submitted', event: 'contact_info_submitted', count: s4 },
      { name: 'Payment Initiated', event: 'payment_initiated', count: s5 },
      { name: 'Enrolled', event: 'enrollment_completed', count: s6 },
    ],
    errors: errors.results.map(([error, count]) => ({
      error: String(error),
      count: Number(count),
    })),
  });
}
