import { verifyEmbedKey } from '@/lib/embed-auth';
import { listAppointments } from '@/lib/embed/ghl';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { DataTable } from '@/components/embed/DataTable';
import { STATUS } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  confirmed: STATUS.good,
  showed: STATUS.good,
  noshow: STATUS.serious,
  cancelled: STATUS.neutral,
  invalid: STATUS.neutral,
};

export default async function AppointmentsWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('appointments', k)) return <EmbedDenied />;

  const now = Date.now();
  const [upcoming, past] = await Promise.all([
    listAppointments(now, now + 14 * 86_400_000),
    listAppointments(now - 30 * 86_400_000, now),
  ]);

  const showed = past.filter((a) => a.status === 'showed').length;
  const noShows = past.filter((a) => a.status === 'noshow').length;
  const decided = showed + noShows;

  return (
    <EmbedShell title="GHL Appointments" subtitle="Booked calls across every GHL calendar">
      <StatGrid cols={4}>
        <Stat label="Next 14 days" value={String(upcoming.length)} tone="brand" />
        <Stat label="Last 30 days" value={String(past.length)} />
        <Stat label="Showed" value={String(showed)} tone="good" />
        <Stat label="Show rate" value={decided > 0 ? `${((showed / decided) * 100).toFixed(0)}%` : '—'} sub={`${noShows} no-shows`} tone={noShows > showed ? 'serious' : 'default'} />
      </StatGrid>

      <Card title="Upcoming appointments" className="mt-3">
        <DataTable
          headers={['When (ET)', 'Title', 'Calendar', 'Status']}
          rows={upcoming.slice(0, 14).map((a) => [
            new Date(a.startTime).toLocaleString('en-US', {
              timeZone: 'America/New_York',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            <span key="t" className="line-clamp-1 max-w-[220px]">{a.title}</span>,
            a.calendarName,
            <span key="s" style={{ color: STATUS_COLOR[a.status] ?? STATUS.neutral }} className="font-medium">
              {a.status}
            </span>,
          ])}
        />
      </Card>
    </EmbedShell>
  );
}
