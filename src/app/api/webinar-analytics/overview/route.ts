import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryPostHog } from '@/lib/posthog';
import { can } from '@/lib/permissions';

// Read-only webinar funnel analytics (counts only, no $ figures) — any staff
// role may view, matching the course-funnel analytics endpoints. All webinar
// events live in the same PostHog project as the course funnels and are
// stamped `app = 'webinar'` by the webinar app's PostHogProvider.
async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || !can(session.user.role, 'admin:access')) return null;
  return session;
}

const WEBINAR_FILTER = "properties.app = 'webinar'";

export async function GET() {
  if (!await requireStaff()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kpis = await queryPostHog(`
    SELECT
      count(DISTINCT distinct_id) as visitors,
      countIf(event = '$pageview') as pageviews,
      countIf(event = 'registration_completed') as registrations,
      countIf(event = 'vip_purchased') as vip_purchases
    FROM events
    WHERE ${WEBINAR_FILTER}
      AND timestamp >= now() - interval 30 day
  `);

  // Per-A/B-variant funnel — the webinar app stamps ab_variant ('a'|'b') as a
  // super property on every browser event and threads it onto the server-side
  // vip_purchased, so one breakdown covers the whole funnel.
  const byVariant = await queryPostHog(`
    SELECT
      coalesce(nullIf(toString(properties.ab_variant), ''), 'none') as variant,
      count(DISTINCT distinct_id) as visitors,
      countIf(event = '$pageview') as pageviews,
      countIf(event = 'registration_completed') as registrations,
      countIf(event = 'vip_purchased') as vip_purchases
    FROM events
    WHERE ${WEBINAR_FILTER}
      AND timestamp >= now() - interval 30 day
    GROUP BY variant
    ORDER BY variant
  `);

  const daily = await queryPostHog(`
    SELECT
      toDate(timestamp) as day,
      count(DISTINCT distinct_id) as visitors,
      countIf(event = 'registration_completed') as registrations,
      countIf(event = 'vip_purchased') as vip_purchases
    FROM events
    WHERE ${WEBINAR_FILTER}
      AND timestamp >= now() - interval 30 day
    GROUP BY day
    ORDER BY day
  `);

  const [visitors, pageviews, registrations, vipPurchases] = kpis.results[0] ?? [0, 0, 0, 0];

  return NextResponse.json({
    kpis: {
      visitors: Number(visitors),
      pageviews: Number(pageviews),
      registrations: Number(registrations),
      vipPurchases: Number(vipPurchases),
      registrationRate: Number(visitors) > 0 ? Number(registrations) / Number(visitors) : 0,
      vipRate: Number(registrations) > 0 ? Number(vipPurchases) / Number(registrations) : 0,
    },
    byVariant: byVariant.results.map(([variant, v, pv, reg, vip]) => ({
      variant: String(variant),
      visitors: Number(v),
      pageviews: Number(pv),
      registrations: Number(reg),
      vipPurchases: Number(vip),
    })),
    daily: daily.results.map(([day, v, reg, vip]) => ({
      day: String(day),
      visitors: Number(v),
      registrations: Number(reg),
      vipPurchases: Number(vip),
    })),
  });
}
