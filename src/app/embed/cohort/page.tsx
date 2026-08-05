import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { formatUsd } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { DataTable } from '@/components/embed/DataTable';
import { chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function CohortWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('cohort', k)) return <EmbedDenied />;

  const apps = await prisma.cohortApplication.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      tier: true,
      score: true,
      isVip: true,
      status: true,
      assignedTo: true,
      paymentPlan: true,
      paidTotalCents: true,
      paymentsMade: true,
      paidInFullAt: true,
      firstPaidAt: true,
      createdAt: true,
    },
  });

  const buyers = apps.filter((a) => a.firstPaidAt !== null);
  const revenue = apps.reduce((acc, a) => acc + (a.paidTotalCents ?? 0), 0);
  const called = apps.filter((a) => a.status !== 'new').length;
  const booked = apps.filter((a) => ['booked', 'enrolled'].includes(a.status)).length;

  const byTier = new Map<string, number>();
  for (const a of apps) byTier.set(a.tier ?? '?', (byTier.get(a.tier ?? '?') ?? 0) + 1);
  const tierRows = [...byTier.entries()].sort(([a], [b]) => a.localeCompare(b));

  const byCloser = new Map<string, { apps: number; buyers: number }>();
  for (const a of apps) {
    const key = a.assignedTo || 'Unassigned';
    const row = byCloser.get(key) ?? { apps: 0, buyers: 0 };
    row.apps += 1;
    if (a.firstPaidAt) row.buyers += 1;
    byCloser.set(key, row);
  }

  const planBuyers = buyers.filter((b) => b.paymentPlan && !b.paidInFullAt);

  return (
    <EmbedShell title="Medicaid 12-Week Cohort" subtitle="Applications → calls → enrollments, live from the closer pipeline">
      <StatGrid cols={4}>
        <Stat label="Applications" value={String(apps.length)} tone="brand" />
        <Stat label="Buyers" value={String(buyers.length)} tone="good" />
        <Stat label="Collected" value={formatUsd(revenue, { compact: true })} tone="good" />
        <Stat label="VIP applicants" value={String(apps.filter((a) => a.isVip).length)} />
      </StatGrid>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Pipeline">
          <FunnelSteps
            steps={[
              { label: 'Applied', value: apps.length },
              { label: 'Called', value: called },
              { label: 'Booked / enrolled', value: booked },
              { label: 'Paid', value: buyers.length },
            ]}
          />
        </Card>
        <Card title="Applications by tier (A = hottest)">
          <BarList
            items={tierRows.map(([tier, count], i) => ({
              label: `Tier ${tier}`,
              value: count,
              display: String(count),
              color: chartColor(i),
            }))}
          />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="By closer">
          <DataTable
            headers={['Closer', 'Leads', 'Buyers']}
            align={['l', 'r', 'r']}
            rows={[...byCloser.entries()]
              .sort((a, b) => b[1].apps - a[1].apps)
              .map(([closer, row]) => [closer, String(row.apps), <b key="b">{String(row.buyers)}</b>])}
          />
        </Card>
        <Card title="Payment plans in flight">
          <DataTable
            headers={['Buyer', 'Payments', 'Collected']}
            align={['l', 'r', 'r']}
            rows={planBuyers.map((b) => [
              b.name,
              `${b.paymentsMade} / 3`,
              formatUsd(b.paidTotalCents ?? 0),
            ])}
          />
        </Card>
      </div>
    </EmbedShell>
  );
}
