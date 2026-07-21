import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';
import { verifyCohortContacted } from '@/lib/cohort-assign';
import { collapseAndMove } from '@/lib/cohort-contacted';

export const runtime = 'nodejs';

/**
 * POST /api/cohort-application/[id]/contacted
 *
 * Marks the lead worked, collapses its Slack card to one line, and re-posts the
 * full card to the contacted channel.
 *
 * The DB write happens FIRST and independently of Slack: if Slack is down or
 * the bot token is wrong, the lead is still recorded as contacted and the call
 * sheet stays correct. A cosmetic channel cleanup must never be the thing that
 * loses the fact that someone was called.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let by = '';
  let token = '';
  try {
    const body = await request.json();
    by = typeof body?.by === 'string' ? body.by : '';
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    /* no body */
  }

  const signed = token && by ? verifyCohortContacted(id, by, token) : false;
  if (!signed) {
    const session = await sessionWithCapability('admin:access');
    if (!session) return unauthorized();
  }

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const contactedBy = by || app.assignedTo || 'team';
  const at = new Date();

  // Idempotent: pressing twice must not re-post to the contacted channel.
  if (app.contactedAt) {
    return NextResponse.json({
      ok: true,
      already: true,
      contactedBy: app.contactedBy,
      contactedAt: app.contactedAt,
    });
  }

  await prisma.cohortApplication.update({
    where: { id },
    data: {
      contactedBy,
      contactedAt: at,
      status: app.status === 'new' ? 'called' : app.status,
      calledAt: app.calledAt ?? at,
    },
  });

  const slack = await collapseAndMove(
    {
      name: app.name,
      phone: app.phone,
      email: app.email,
      tier: app.tier,
      score: app.score,
      state: app.state,
      assignedTo: app.assignedTo,
      note: app.note,
      contactedBy,
      at,
    },
    { channelId: app.slackChannelId, messageTs: app.slackMessageTs }
  );

  return NextResponse.json({ ok: true, contactedBy, slack });
}
