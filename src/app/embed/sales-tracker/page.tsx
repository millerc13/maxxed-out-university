import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { formatUsd } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function SalesTrackerWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('sales-tracker', k)) return <EmbedDenied />;

  // Prisma Decimal fields (commissionRate) never cross into JSX — only
  // the *Cents integers are read here, so no Decimal conversion needed.
  const entries = await prisma.salesTrackerEntry.findMany({
    select: {
      tag: true,
      didShow: true,
      didClose: true,
      dealAmountCents: true,
      commissionAmountCents: true,
      commissionDue: true,
      commissionPaid: true,
    },
  });

  const contacts = entries.length;
  const shows = entries.filter((e) => e.didShow === 'YES').length;
  const closes = entries.filter((e) => e.didClose === 'YES').length;
  const dealCents = entries.reduce((a, e) => a + (e.dealAmountCents ?? 0), 0);
  const commissionCents = entries.reduce((a, e) => a + (e.commissionAmountCents ?? 0), 0);
  const paidCents = entries
    .filter((e) => e.commissionPaid)
    .reduce((a, e) => a + (e.commissionAmountCents ?? 0), 0);

  const byTag = new Map<string, { deals: number; cents: number }>();
  for (const e of entries) {
    const tag = e.tag || 'Untagged';
    const row = byTag.get(tag) ?? { deals: 0, cents: 0 };
    if (e.didClose === 'YES') {
      row.deals += 1;
      row.cents += e.dealAmountCents ?? 0;
    }
    byTag.set(tag, row);
  }
  const tagRows = [...byTag.entries()].filter(([, r]) => r.cents > 0).sort((a, b) => b[1].cents - a[1].cents).slice(0, 8);

  return (
    <EmbedShell title="Sales Tracker" subtitle="Rebecca's contact → show → close pipeline, all sessions combined">
      <StatGrid cols={4}>
        <Stat label="Deal value closed" value={formatUsd(dealCents, { compact: true })} tone="brand" />
        <Stat label="Close rate" value={contacts ? `${((closes / contacts) * 100).toFixed(1)}%` : '—'} sub={`${closes} of ${contacts} contacts`} tone="good" />
        <Stat label="Commission earned" value={formatUsd(commissionCents, { compact: true })} />
        <Stat label="Commission still owed" value={formatUsd(commissionCents - paidCents, { compact: true })} tone={commissionCents - paidCents > 0 ? 'warning' : 'default'} />
      </StatGrid>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Contact → show → close">
          <FunnelSteps
            steps={[
              { label: 'Contacts', value: contacts },
              { label: 'Showed', value: shows },
              { label: 'Closed', value: closes },
            ]}
          />
        </Card>
        <Card title="Closed value by section">
          <BarList
            items={tagRows.map(([tag, r], i) => ({
              label: `${tag} (${r.deals})`,
              value: r.cents,
              display: formatUsd(r.cents, { compact: true }),
              color: chartColor(i),
            }))}
          />
        </Card>
      </div>
    </EmbedShell>
  );
}
