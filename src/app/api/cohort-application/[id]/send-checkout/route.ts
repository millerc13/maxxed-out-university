import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';
import { verifyCohortAction, type CohortChannel } from '@/lib/cohort-assign';
import { sendCohortCheckout } from '@/lib/cohort-send';

export const runtime = 'nodejs';

/**
 * POST /api/cohort-application/[id]/send-checkout
 *
 * Closer presses "Send checkout" on the call sheet — usually mid-call — and the
 * applicant gets the enrollment link by email AND text. Optional `promo: true`
 * includes the 15% code, so a closer can choose to offer it (or not) per call.
 *
 * Email and SMS are attempted independently: one failing must not silently
 * swallow the other, and the response reports both so the UI can say what
 * actually happened rather than a blanket "sent".
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let withPromo = false;
  let token = '';
  let channel: CohortChannel = 'both';
  try {
    const body = await request.json();
    withPromo = !!body?.promo;
    token = typeof body?.token === 'string' ? body.token : '';
    if (body?.channel === 'sms' || body?.channel === 'email' || body?.channel === 'both') {
      channel = body.channel;
    }
  } catch {
    /* no body — default to no promo, both channels */
  }

  // Two ways in: an admin session (the call sheet) OR a signed token (a closer
  // tapping the Slack button on their phone, where they're not logged in). The
  // token is scoped to this exact application AND promo choice, so it can't be
  // edited into a discount that wasn't offered.
  const signed = token ? verifyCohortAction(id, withPromo, token, channel) : false;
  if (!signed) {
    const session = await sessionWithCapability('admin:access');
    if (!session) return unauthorized();
  }

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const result = await sendCohortCheckout({ app, channel, withPromo });

  return NextResponse.json({
    ok: result.ok,
    email: result.email,
    sms: result.sms,
    channel: result.channel,
    smsError: result.smsError,
    promo: result.promo,
  });
}
