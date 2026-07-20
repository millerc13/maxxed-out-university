import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';
import {
  READINESS_OPTIONS,
  INVESTMENT_OPTIONS,
  WORK_OPTIONS,
  shortOf,
  closerLine,
} from '@/lib/cohort-scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /api/cohort-application/export — call sheet as CSV, tier-sorted. */
export async function GET() {
  const session = await sessionWithCapability('admin:access');
  if (!session) return unauthorized();

  const apps = await prisma.cohortApplication.findMany({
    orderBy: [{ tier: 'asc' }, { score: 'desc' }, { createdAt: 'asc' }],
  });

  const header = [
    'Tier', 'Score', 'VIP', 'Name', 'Phone', 'Email', 'State',
    'Readiness', 'Investment', 'Work', 'Note', 'Submitted', 'Closer line',
  ];
  const rows = apps.map((a) => [
    a.tier,
    a.score,
    a.isVip ? 'YES' : '',
    a.name,
    a.phone,
    a.email,
    a.state,
    shortOf(READINESS_OPTIONS, a.readiness),
    shortOf(INVESTMENT_OPTIONS, a.investment),
    shortOf(WORK_OPTIONS, a.work),
    a.note ?? '',
    a.createdAt.toISOString(),
    closerLine({ ...a, note: a.note }),
  ]);

  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cohort-call-sheet-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
