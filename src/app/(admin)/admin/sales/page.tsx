import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';
import { SessionsIndex } from '@/components/admin/sales-tracker/SessionsIndex';

export const metadata: Metadata = {
  title: 'Sales Tracker | Admin',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SalesTrackerIndexPage() {
  const session = await getSalesTrackerSession();
  if (!session) redirect('/admin');

  const sessions = await prisma.salesTrackerSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { entries: true } },
      // Pull just the fields needed to compute per-card stats and the
      // global roll-up. Cheap join — sessions are few (one per
      // salesperson) and entries per session top out in the low hundreds.
      entries: {
        select: {
          didShow: true,
          didClose: true,
          dealAmountCents: true,
          commissionRate: true,
          commissionAmountCents: true,
          commissionPaid: true,
        },
      },
    },
  });

  // Per-session stats + a single roll-up across all sessions.
  let globalContacts = 0;
  let globalShows = 0;
  let globalCloses = 0;
  let globalDealCents = 0;
  let globalCommissionCents = 0;
  let globalPaidCents = 0;

  const initialSessions = sessions.map((s) => {
    let closedCount = 0;
    let totalCommissionCents = 0;
    let paidCents = 0;
    let dealCents = 0;
    for (const e of s.entries) {
      globalContacts++;
      if (e.didShow === 'YES') globalShows++;
      if (e.didClose !== 'YES') continue;
      globalCloses++;
      closedCount++;
      const auto =
        e.dealAmountCents != null && e.commissionRate != null
          ? Math.round(e.dealAmountCents * Number(e.commissionRate))
          : 0;
      const eff = e.commissionAmountCents ?? auto;
      totalCommissionCents += eff;
      dealCents += e.dealAmountCents ?? 0;
      if (e.commissionPaid) paidCents += eff;
    }
    globalDealCents += dealCents;
    globalCommissionCents += totalCommissionCents;
    globalPaidCents += paidCents;
    return {
      id: s.id,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      _count: s._count,
      stats: {
        closedCount,
        totalCommissionCents,
        paidCents,
        unpaidCents: totalCommissionCents - paidCents,
      },
    };
  });

  const globalStats = {
    sessionCount: sessions.length,
    contacts: globalContacts,
    shows: globalShows,
    closes: globalCloses,
    totalDealCents: globalDealCents,
    totalCommissionCents: globalCommissionCents,
    paidCents: globalPaidCents,
    unpaidCents: globalCommissionCents - globalPaidCents,
  };

  return (
    <SessionsIndex
      initialSessions={initialSessions}
      globalStats={globalStats}
    />
  );
}
