import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/admin/notifications/calendly-logs
 *
 * Recent Calendly events mirrored from the university-funnel repo via
 * /api/webhooks/calendly-log (source='calendly' WebhookLog rows). Read
 * model only — drives the Calendly section on /admin/notifications.
 */
export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.webhookLog.findMany({
    where: { source: 'calendly' },
    orderBy: { processedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      event: true,
      status: true,
      errorMessage: true,
      processedAt: true,
      payload: true,
    },
  });

  return NextResponse.json({ logs });
}
