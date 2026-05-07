import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';
import { SessionDetail } from '@/components/admin/sales-tracker/SessionDetail';
import type { TagColorName } from '@/components/admin/sales-tracker/types';
import { sanitizeChartLayout } from '@/components/admin/sales-tracker/chart-config';

const VALID_COLORS = new Set<TagColorName>([
  'rose', 'orange', 'amber', 'yellow', 'lime', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'pink',
]);

// Coerce the JSON tagColors object into a strictly-typed map. Drop any
// unknown color names so a stale DB value can't crash hydration.
function sanitizeTagColors(raw: unknown): Partial<Record<string, TagColorName>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Partial<Record<string, TagColorName>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && VALID_COLORS.has(v as TagColorName)) {
      out[k] = v as TagColorName;
    }
  }
  return out;
}

export const metadata: Metadata = {
  title: 'Sales Tracker | Admin',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SalesTrackerSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const auth = await getSalesTrackerSession();
  if (!auth) redirect('/admin');

  const { sessionId } = await params;

  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id: sessionId },
  });
  if (!sessionRow) notFound();

  const entries = await prisma.salesTrackerEntry.findMany({
    where: { sessionId },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  const initialSession = {
    id: sessionRow.id,
    name: sessionRow.name,
    createdAt: sessionRow.createdAt.toISOString(),
    updatedAt: sessionRow.updatedAt.toISOString(),
    tagColors: sanitizeTagColors(sessionRow.tagColors),
    chartLayout: sanitizeChartLayout(sessionRow.chartLayout),
  };

  const initialEntries = entries.map((e) => ({
    id: e.id,
    sessionId: e.sessionId,
    position: e.position,
    tag: e.tag,
    name: e.name,
    email: e.email,
    phone: e.phone,
    contactDate: e.contactDate ? e.contactDate.toISOString() : null,
    contactTime: e.contactTime,
    didShow: e.didShow as 'YES' | 'NO' | 'PENDING' | null,
    didClose: e.didClose as 'YES' | 'NO' | 'PENDING' | null,
    dealAmountCents: e.dealAmountCents,
    commissionRate: e.commissionRate ? Number(e.commissionRate) : null,
    commissionAmountCents: e.commissionAmountCents,
    commissionDue: e.commissionDue ? e.commissionDue.toISOString() : null,
    commissionPaid: e.commissionPaid,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <SessionDetail
      initialSession={initialSession}
      initialEntries={initialEntries}
    />
  );
}
