import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/admin/notifications/slack-channels/[id]/logs
 *
 * Recent Slack delivery attempts for this channel. notifySlackChannels()
 * writes one WebhookLog row per channel per fan-out with event="slack:*"
 * and payload.channelId set — we filter on that JSON path so the history
 * is exact per channel (not source-matched guesswork).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const logs = await prisma.webhookLog.findMany({
    where: {
      event: { startsWith: 'slack:' },
      payload: { path: ['channelId'], equals: id },
    },
    orderBy: { processedAt: 'desc' },
    take: 25,
    select: {
      id: true,
      source: true,
      event: true,
      status: true,
      errorMessage: true,
      processedAt: true,
      payload: true,
    },
  });

  return NextResponse.json({ logs });
}
