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

  const [ctaData, scrollData, videoData, stepBackData] = await Promise.all([
    queryPostHog(`
      SELECT
        properties.cta_location as location,
        properties.cta_text as text,
        count() as clicks
      FROM events
      WHERE event = 'cta_clicked'
        AND properties.program = '${program}'
        AND timestamp >= now() - interval 30 day
      GROUP BY location, text
      ORDER BY clicks DESC
    `),
    queryPostHog(`
      SELECT
        properties.depth_pct as depth,
        count(DISTINCT distinct_id) as users
      FROM events
      WHERE event = 'scroll_depth_reached'
        AND properties.program = '${program}'
        AND timestamp >= now() - interval 30 day
      GROUP BY depth
      ORDER BY depth
    `),
    queryPostHog(`
      SELECT
        countIf(event = 'video_play_clicked') as plays,
        countIf(event = '$pageview') as views
      FROM events
      WHERE properties.program = '${program}'
        AND timestamp >= now() - interval 30 day
    `),
    queryPostHog(`
      SELECT count() as count
      FROM events
      WHERE event = 'checkout_step_back'
        AND properties.program = '${program}'
        AND timestamp >= now() - interval 30 day
    `),
  ]);

  const [plays, views] = (videoData.results[0] ?? [0, 0]).map(Number);
  const stepBacks = Number(stepBackData.results[0]?.[0] ?? 0);

  return NextResponse.json({
    ctaClicks: ctaData.results.map(([location, text, clicks]) => ({
      location: String(location),
      text: String(text),
      clicks: Number(clicks),
    })),
    scrollDepth: scrollData.results.map(([depth, users]) => ({
      depth: Number(depth),
      users: Number(users),
    })),
    videoPlays: plays,
    videoViews: views,
    videoPlayRate: Number(views) > 0 ? plays / Number(views) : 0,
    stepBacks,
  });
}
