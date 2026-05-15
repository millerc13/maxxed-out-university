import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/admin/settings — list every Setting row. The /admin/notifications
 * banner uses this to load `internalNotificationsEnabled` and
 * `testPhoneOverride` in one round-trip.
 */
export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.setting.findMany({
    orderBy: { key: 'asc' },
    select: { key: true, value: true, updatedAt: true },
  });
  return NextResponse.json({ settings: rows });
}
