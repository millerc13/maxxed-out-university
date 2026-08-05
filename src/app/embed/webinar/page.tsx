import { verifyEmbedKey } from '@/lib/embed-auth';
import { getWebinarOverview, getWebinarStats } from '@/lib/embed/webinar';
import { formatUsd } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { DataTable } from '@/components/embed/DataTable';
import { CHART_COLORS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function WebinarWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('webinar', k)) return <EmbedDenied />;

  const overview = await getWebinarOverview();
  const firstWebinar = overview?.webinars?.[0];
  const stats = firstWebinar ? await getWebinarStats(firstWebinar.id) : null;

  if (!overview) {
    return (
      <EmbedShell title="Webinar Funnel" subtitle="webinar.maxxedout.com">
        <Card>
          <p className="text-xs text-[#9CA3AF]">
            Webinar app unreachable — check WEBINAR_APP_URL / WEBINAR_ADMIN_TOKEN.
          </p>
        </Card>
      </EmbedShell>
    );
  }

  const s = stats?.stats;

  return (
    <EmbedShell
      title="Webinar Funnel"
      subtitle={firstWebinar ? `${firstWebinar.title} — registrations, show-up, VIP conversion` : 'Live webinar engine'}
    >
      <StatGrid cols={4}>
        <Stat label="Registered" value={overview.summary.totalRegistered.toLocaleString()} tone="brand" />
        <Stat label="Attended" value={overview.summary.attendedCount.toLocaleString()} sub={s ? `${s.attendanceRatePct.toFixed(0)}% show-up` : undefined} tone="good" />
        <Stat label="VIP revenue" value={formatUsd(Math.round((overview.summary.revenue ?? 0) * 100), { compact: true })} sub={s ? `${s.vipPurchased} VIP upgrades` : undefined} />
        <Stat label="Upcoming sessions" value={String(overview.summary.upcomingCount)} />
      </StatGrid>

      {s ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card title="Registration → attendance → VIP">
            <FunnelSteps
              color={CHART_COLORS[0]}
              steps={[
                { label: 'Registered', value: s.registered },
                { label: 'Attended', value: s.attended + s.vipPurchased },
                { label: 'VIP purchased', value: s.vipPurchased },
              ]}
            />
          </Card>
          <Card title="A/B landing page test">
            <DataTable
              headers={['Variant', 'Registrations', 'Show-up', 'VIP']}
              align={['l', 'r', 'r', 'r']}
              rows={(stats?.abTest ?? []).map((v) => [
                <b key="v">Variant {v.variant.toUpperCase()}</b>,
                String(v.registrations),
                `${v.showUpPct.toFixed(0)}%`,
                String(v.purchased),
              ])}
            />
          </Card>
        </div>
      ) : null}

      <Card title="Upcoming sessions" className="mt-3">
        <DataTable
          headers={['Webinar', 'Session', 'Starts (ET)', 'Registered', 'VIP / Free']}
          align={['l', 'l', 'l', 'r', 'r']}
          rows={(overview.upcoming ?? []).map((u) => [
            u.webinarTitle,
            u.label,
            new Date(u.startsAt).toLocaleString('en-US', {
              timeZone: 'America/New_York',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            String(u.registeredCount),
            `${u.vipCount} / ${u.freeCount}`,
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
