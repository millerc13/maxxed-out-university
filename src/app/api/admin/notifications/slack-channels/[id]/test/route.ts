import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

/**
 * Fire a smoke-test Slack message to a single configured channel so the
 * admin can verify the webhook URL works without manually triggering a
 * real lead/sale event.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const channel = await prisma.slackChannel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const message = {
    text: `Maxxed Out alert test — ${channel.name}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🧪 Test Alert', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `Channel: *${channel.name}*${channel.channel ? ` (${channel.channel})` : ''}\n` +
            `Event types: ${channel.eventTypes.length ? channel.eventTypes.join(', ') : '_none configured_'}\n` +
            `Sources: ${channel.sources.length ? channel.sources.join(', ') : '_all_'}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Sent from /admin/notifications · ${new Date().toLocaleString('en-US', {
              timeZone: 'America/New_York',
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })} ET`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(channel.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Slack ${res.status}: ${text.slice(0, 300)}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Test send failed' },
      { status: 502 },
    );
  }
}
