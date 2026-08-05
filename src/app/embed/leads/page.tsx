import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { TrendChart } from '@/components/embed/TrendChart';
import { DataTable } from '@/components/embed/DataTable';
import { CHART_COLORS, chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function LeadsWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('leads', k)) return <EmbedDenied />;

  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since7 = new Date(Date.now() - 7 * 86_400_000);

  const [apps30, totalAll, recent] = await Promise.all([
    prisma.application.findMany({
      where: { createdAt: { gte: since30 } },
      select: { source: true, status: true, createdAt: true },
    }),
    prisma.application.count(),
    prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { name: true, email: true, source: true, status: true, createdAt: true, course: { select: { title: true } } },
    }),
  ]);

  const last7 = apps30.filter((a) => a.createdAt >= since7).length;
  const enrolled30 = apps30.filter((a) => a.status === 'enrolled').length;

  const bySource = new Map<string, number>();
  for (const a of apps30) bySource.set(a.source ?? 'unknown', (bySource.get(a.source ?? 'unknown') ?? 0) + 1);
  const sourceRows = [...bySource.entries()].sort((a, b) => b[1] - a[1]);

  // Daily application counts, last 30 days.
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    byDay.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  }
  for (const a of apps30) {
    const d = a.createdAt.toISOString().slice(0, 10);
    if (byDay.has(d)) byDay.set(d, byDay.get(d)! + 1);
  }
  const chartData = [...byDay.entries()].map(([day, applications]) => ({ day, applications }));

  return (
    <EmbedShell title="Leads & Applications" subtitle="Funnel applications across every offer (Blueprint, Mentorship, Accelerator, IC, DD)">
      <StatGrid cols={4}>
        <Stat label="Last 30 days" value={String(apps30.length)} tone="brand" />
        <Stat label="Last 7 days" value={String(last7)} />
        <Stat label="Enrolled (30d)" value={String(enrolled30)} tone="good" />
        <Stat label="All time" value={totalAll.toLocaleString()} />
      </StatGrid>

      <Card title="Applications per day — last 30 days" className="mt-3">
        <TrendChart
          data={chartData}
          series={[{ key: 'applications', label: 'Applications', color: CHART_COLORS[0] }]}
          kind="bar"
          valueFormatter="count"
        />
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="By source (30d)">
          <BarList
            items={sourceRows.map(([label, value], i) => ({
              label,
              value,
              display: String(value),
              color: chartColor(i),
            }))}
          />
        </Card>
        <Card title="Latest applications">
          <DataTable
            headers={['Name', 'Program', 'Source', 'When']}
            rows={recent.map((a) => [
              a.name ?? a.email,
              a.course?.title ?? '—',
              a.source ?? '—',
              a.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ])}
          />
        </Card>
      </div>
    </EmbedShell>
  );
}
