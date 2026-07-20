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
  'cohort_application',
]);

const SLACK_WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/-]+$/;

function maskWebhook(url: string): string {
  if (!url) return '';
  const tail = url.slice(-6);
  return `https://hooks.slack.com/services/…/${tail}`;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string') {
    const next = body.name.trim();
    if (!next) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    data.name = next;
  }
  if ('channel' in body) data.channel = body.channel?.toString().trim() || null;
  if (typeof body.webhookUrl === 'string' && body.webhookUrl.trim()) {
    const next = body.webhookUrl.trim();
    if (!SLACK_WEBHOOK_RE.test(next)) {
      return NextResponse.json(
        { error: 'Webhook URL must look like https://hooks.slack.com/services/…' },
        { status: 400 },
      );
    }
    data.webhookUrl = next;
  }
  if (Array.isArray(body.eventTypes)) {
    data.eventTypes = body.eventTypes
      .filter((s: unknown): s is string => typeof s === 'string' && VALID_EVENT_TYPES.has(s));
  }
  if (Array.isArray(body.sources)) {
    data.sources = body.sources
      .filter((s: unknown): s is string => typeof s === 'string' && s.trim() !== '')
      .map((s: string) => s.trim());
  }
  if (typeof body.active === 'boolean') data.active = body.active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  try {
    const channel = await prisma.slackChannel.update({ where: { id }, data });
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
  } catch {
    return NextResponse.json({ error: 'Slack channel not found' }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await prisma.slackChannel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Slack channel not found' }, { status: 404 });
  }
}
