import { verifyEmbedKey } from '@/lib/embed-auth';
import { listUnifiedTransactions, formatUsd, sumCents, since } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { TrendChart } from '@/components/embed/TrendChart';
import { DataTable } from '@/components/embed/DataTable';
import { CHART_COLORS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

const RAIL_LABEL = { fanbasis: 'Fanbasis', ghl: 'GHL / Stripe', stripe: 'University Stripe' } as const;

export default async function RevenueWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('revenue', k)) return <EmbedDenied />;

  const txs = await listUnifiedTransactions();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30 = new Date(now.getTime() - 30 * 86_400_000);

  const gross = sumCents(txs);
  const net = sumCents(txs, 'netCents');
  const mtd = sumCents(since(txs, monthStart));
  const l30 = since(txs, last30);

  // Daily gross for the last 30 days, split by rail.
  const byDay = new Map<string, { fanbasis: number; ghl: number; stripe: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    byDay.set(d, { fanbasis: 0, ghl: 0, stripe: 0 });
  }
  for (const t of l30) {
    const d = t.date.slice(0, 10);
    const row = byDay.get(d);
    if (row) row[t.rail] += t.grossCents;
  }
  const chartData = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }));

  const recent = txs.slice(0, 10);

  return (
    <EmbedShell title="Revenue — All Rails" subtitle="Fanbasis + GHL checkout + University Stripe, live">
      <StatGrid cols={4}>
        <Stat label="Gross (all time)" value={formatUsd(gross, { compact: true })} tone="brand" />
        <Stat label="Net to Todd" value={formatUsd(net, { compact: true })} sub="Fanbasis net is exact; other rails gross" tone="good" />
        <Stat label="This month" value={formatUsd(mtd, { compact: true })} />
        <Stat label="Last 30 days" value={formatUsd(sumCents(l30), { compact: true })} sub={`${l30.length} transactions`} />
      </StatGrid>

      <Card title="Daily revenue — last 30 days" className="mt-3">
        <TrendChart
          data={chartData}
          kind="bar"
          valueFormatter="usd-cents"
          series={[
            { key: 'fanbasis', label: 'Fanbasis', color: CHART_COLORS[0] },
            { key: 'ghl', label: 'GHL / Stripe', color: CHART_COLORS[1] },
            { key: 'stripe', label: 'University Stripe', color: CHART_COLORS[2] },
          ]}
        />
      </Card>

      <Card title="Recent transactions" className="mt-3">
        <DataTable
          headers={['Date', 'Buyer', 'Product', 'Rail', 'Gross', 'Net']}
          align={['l', 'l', 'l', 'l', 'r', 'r']}
          rows={recent.map((t) => [
            t.date.slice(0, 10),
            t.buyerName || t.buyerEmail,
            <span key="p" className="line-clamp-1 max-w-[220px]">{t.label}</span>,
            RAIL_LABEL[t.rail],
            <b key="g">{formatUsd(t.grossCents)}</b>,
            formatUsd(t.netCents),
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
