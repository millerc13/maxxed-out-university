import Link from 'next/link';
import { requireCapability } from '@/lib/admin';
import { WebinarAnalyticsClient } from '@/components/webinar-admin/WebinarAnalyticsClient';

/**
 * Webinar funnel analytics — PostHog traffic, A/B funnel, and session replays
 * for webinar.maxxedout.com, presented the same way as the course-funnel
 * analytics. Events live in the shared PostHog project stamped app='webinar'.
 */
export const dynamic = 'force-dynamic';

export default async function WebinarAnalyticsPage() {
  await requireCapability('content:manage');

  return (
    <div className="webinar-admin">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">PostHog</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Webinar analytics</h1>
          <p className="mt-1 text-ink-muted">Traffic, A/B funnel, and session replays across the webinar funnels — last 30 days.</p>
        </div>
        <Link href="/admin/webinar" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
          ← Command center
        </Link>
      </div>

      <div className="mt-6">
        <WebinarAnalyticsClient />
      </div>
    </div>
  );
}
