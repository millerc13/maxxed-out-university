import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

const VALID_EVENT_TYPES = new Set([
  'lead',
  'sale',
  'dd_application',
  'abandoned_checkout',
  'contract_signed',
]);

const SLACK_WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/-]+$/;

function sanitizeStringArray(value: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    .map((s) => s.trim())
    .filter((s) => (allowed ? allowed.has(s) : true));
}

/** Strip the webhook URL secret tail before sending to client. */
function maskWebhook(url: string): string {
  if (!url) return '';
  const tail = url.slice(-6);
  return `https://hooks.slack.com/services/…/${tail}`;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const channels = await prisma.slackChannel.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      webhookUrlMasked: maskWebhook(c.webhookUrl),
      hasWebhook: !!c.webhookUrl,
      eventTypes: c.eventTypes,
      sources: c.sources,
      active: c.active,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const webhookUrl = String(body.webhookUrl ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Channel name required' }, { status: 400 });
  if (!SLACK_WEBHOOK_RE.test(webhookUrl)) {
    return NextResponse.json(
      { error: 'Webhook URL must look like https://hooks.slack.com/services/…' },
      { status: 400 },
    );
  }

  const eventTypes = sanitizeStringArray(body.eventTypes, VALID_EVENT_TYPES);
  const sources = sanitizeStringArray(body.sources);

  const channel = await prisma.slackChannel.create({
    data: {
      name,
      channel: body.channel?.toString().trim() || null,
      webhookUrl,
      eventTypes,
      sources,
      active: body.active ?? true,
    },
  });
  return NextResponse.json({
    channel: {
      id: channel.id,
      name: channel.name,
      channel: channel.channel,
      webhookUrlMasked: maskWebhook(channel.webhookUrl),
      hasWebhook: true,
      eventTypes: channel.eventTypes,
      sources: channel.sources,
      active: channel.active,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    },
  });
}
