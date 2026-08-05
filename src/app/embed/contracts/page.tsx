import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { formatUsd } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { FunnelSteps } from '@/components/embed/FunnelSteps';
import { DataTable } from '@/components/embed/DataTable';
import { STATUS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  completed: STATUS.good,
  sent: STATUS.neutral,
  viewed: STATUS.warning,
  declined: STATUS.serious,
  cancelled: STATUS.neutral,
  expired: STATUS.serious,
  draft: STATUS.neutral,
};

export default async function ContractsWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('contracts', k)) return <EmbedDenied />;

  const docs = await prisma.documentSignature.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      recipientName: true,
      recipientEmail: true,
      status: true,
      paymentTotalCents: true,
      sentAt: true,
      firstViewedAt: true,
      signedAt: true,
      createdAt: true,
    },
  });

  const sent = docs.filter((d) => d.sentAt !== null).length;
  const viewed = docs.filter((d) => d.firstViewedAt !== null).length;
  const signed = docs.filter((d) => d.status === 'completed').length;
  const outstanding = docs.filter((d) => ['sent', 'viewed'].includes(d.status));
  const outstandingValue = outstanding.reduce((a, d) => a + (d.paymentTotalCents ?? 0), 0);
  const signedValue = docs
    .filter((d) => d.status === 'completed')
    .reduce((a, d) => a + (d.paymentTotalCents ?? 0), 0);

  return (
    <EmbedShell title="Contracts & E-Sign" subtitle="Enrollment agreements: sent → viewed → signed">
      <StatGrid cols={4}>
        <Stat label="Signed" value={String(signed)} tone="good" sub={formatUsd(signedValue, { compact: true }) + ' contract value'} />
        <Stat label="Awaiting signature" value={String(outstanding.length)} tone={outstanding.length > 0 ? 'warning' : 'default'} />
        <Stat label="Outstanding value" value={formatUsd(outstandingValue, { compact: true })} />
        <Stat label="All documents" value={String(docs.length)} />
      </StatGrid>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Signature funnel">
          <FunnelSteps
            steps={[
              { label: 'Sent', value: sent },
              { label: 'Viewed', value: viewed },
              { label: 'Signed', value: signed },
            ]}
          />
        </Card>
        <Card title="Recent documents">
          <DataTable
            headers={['Recipient', 'Value', 'Status', 'When']}
            align={['l', 'r', 'l', 'l']}
            rows={docs.slice(0, 8).map((d) => [
              d.recipientName ?? d.recipientEmail ?? '—',
              d.paymentTotalCents ? formatUsd(d.paymentTotalCents) : '—',
              <span key="s" style={{ color: STATUS_COLOR[d.status] ?? STATUS.neutral }} className="font-medium">
                {d.status}
              </span>,
              d.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ])}
          />
        </Card>
      </div>
    </EmbedShell>
  );
}
