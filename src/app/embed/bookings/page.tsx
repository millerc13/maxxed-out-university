import { verifyEmbedKey } from '@/lib/embed-auth';
import { listCalendlyEvents } from '@/lib/embed/calendly';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { DataTable } from '@/components/embed/DataTable';
import { chartColor, STATUS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function BookingsWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('bookings', k)) return <EmbedDenied />;

  const events = await listCalendlyEvents(30);
  const nowIso = new Date().toISOString();

  const upcoming = events.filter((e) => e.status === 'active' && e.startTime >= nowIso);
  const past30 = events.filter((e) => e.startTime < nowIso);
  const booked30 = past30.length + upcoming.length;
  const canceled30 = events.filter((e) => e.status === 'canceled').length;
  const held30 = past30.filter((e) => e.status === 'active').length;

  const byType = new Map<string, number>();
  for (const e of events) byType.set(e.name, (byType.get(e.name) ?? 0) + 1);
  const typeRows = [...byType.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <EmbedShell title="Calendly — Rebecca's Bookings" subtitle="Mentorship intro calls + Masterminds bookings, last 30 days & upcoming">
      <StatGrid cols={4}>
        <Stat label="Booked (30d window)" value={String(booked30)} tone="brand" />
        <Stat label="Held" value={String(held30)} tone="good" />
        <Stat label="Canceled" value={String(canceled30)} tone={canceled30 > held30 ? 'serious' : 'default'} />
        <Stat label="Upcoming" value={String(upcoming.length)} />
      </StatGrid>

      <Card title="Bookings by call type (30d + upcoming)" className="mt-3">
        <BarList
          items={typeRows.map(([label, value], i) => ({
            label,
            value,
            display: String(value),
            color: chartColor(i),
          }))}
        />
      </Card>

      <Card title="Upcoming calls" className="mt-3">
        <DataTable
          headers={['When (ET)', 'Call type', 'Status']}
          rows={upcoming.slice(0, 12).map((e) => [
            new Date(e.startTime).toLocaleString('en-US', {
              timeZone: 'America/New_York',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            e.name,
            <span key="s" style={{ color: STATUS.good }}>confirmed</span>,
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
