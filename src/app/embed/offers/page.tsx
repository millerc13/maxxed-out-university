import { verifyEmbedKey } from '@/lib/embed-auth';
import { listUnifiedTransactions, formatUsd } from '@/lib/embed/revenue';
import { OFFERS } from '@/lib/embed/offers';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { DataTable } from '@/components/embed/DataTable';
import { chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function OffersWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('offers', k)) return <EmbedDenied />;

  const txs = await listUnifiedTransactions();

  const byOffer = new Map<string, { label: string; colorIndex: number; gross: number; net: number; units: number }>();
  for (const o of OFFERS) byOffer.set(o.id, { label: o.label, colorIndex: o.colorIndex, gross: 0, net: 0, units: 0 });
  for (const t of txs) {
    const row = byOffer.get(t.offerId)!;
    row.gross += t.grossCents;
    row.net += t.netCents;
    row.units += 1;
  }
  const rows = [...byOffer.values()].filter((r) => r.units > 0).sort((a, b) => b.gross - a.gross);

  const topOffer = rows[0];
  const totalGross = rows.reduce((a, r) => a + r.gross, 0);

  return (
    <EmbedShell title="Revenue by Offer" subtitle="Every sale across Fanbasis, GHL and Stripe, bucketed by offer">
      <StatGrid cols={3}>
        <Stat label="Total gross" value={formatUsd(totalGross, { compact: true })} tone="brand" />
        <Stat label="Top offer" value={topOffer ? topOffer.label : '—'} sub={topOffer ? formatUsd(topOffer.gross, { compact: true }) : undefined} />
        <Stat label="Total sales" value={String(rows.reduce((a, r) => a + r.units, 0))} />
      </StatGrid>

      <Card title="Gross revenue by offer" className="mt-3">
        <BarList
          items={rows.map((r, i) => ({
            label: r.label,
            value: r.gross,
            display: formatUsd(r.gross, { compact: true }),
            color: chartColor(i),
          }))}
        />
      </Card>

      <Card title="Offer detail" className="mt-3">
        <DataTable
          headers={['Offer', 'Sales', 'Gross', 'Net', 'Avg ticket']}
          align={['l', 'r', 'r', 'r', 'r']}
          rows={rows.map((r) => [
            r.label,
            String(r.units),
            <b key="g">{formatUsd(r.gross)}</b>,
            formatUsd(r.net),
            formatUsd(Math.round(r.gross / r.units)),
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
