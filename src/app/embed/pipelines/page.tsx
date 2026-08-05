import { verifyEmbedKey } from '@/lib/embed-auth';
import { listPipelines, listOpportunities } from '@/lib/embed/ghl';
import { formatUsd } from '@/lib/embed/revenue';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function PipelinesWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('pipelines', k)) return <EmbedDenied />;

  const [pipelines, opportunities] = await Promise.all([listPipelines(), listOpportunities()]);

  const open = opportunities.filter((o) => o.status === 'open');
  const won = opportunities.filter((o) => o.status === 'won');
  const openValue = open.reduce((a, o) => a + o.monetaryValue, 0) * 100;

  const byPipeline = pipelines.map((p) => {
    const opps = opportunities.filter((o) => o.pipelineId === p.id);
    const stageName = new Map(p.stages.map((s) => [s.id, s.name]));
    const purchased = opps.filter((o) => {
      const stage = (stageName.get(o.pipelineStageId) ?? '').toLowerCase();
      return o.status === 'won' || stage.includes('purchased') || stage.includes('paid') || stage.includes('closed');
    }).length;
    return { name: p.name, total: opps.length, open: opps.filter((o) => o.status === 'open').length, purchased };
  }).filter((p) => p.total > 0).sort((a, b) => b.total - a.total);

  return (
    <EmbedShell title="GHL Pipelines" subtitle="Every opportunity across all sales pipelines, straight from GHL">
      <StatGrid cols={4}>
        <Stat label="Open opportunities" value={open.length.toLocaleString()} tone="brand" />
        <Stat label="Open value" value={formatUsd(openValue, { compact: true })} sub="sum of opportunity values" />
        <Stat label="Won" value={String(won.length)} tone="good" />
        <Stat label="Total tracked" value={opportunities.length.toLocaleString()} />
      </StatGrid>

      <Card title="Opportunities by pipeline" className="mt-3">
        <BarList
          items={byPipeline.map((p, i) => ({
            label: `${p.name} — ${p.purchased} purchased`,
            value: p.total,
            display: String(p.total),
            color: chartColor(i),
          }))}
        />
      </Card>
    </EmbedShell>
  );
}
