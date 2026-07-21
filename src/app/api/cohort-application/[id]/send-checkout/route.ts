import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';
import { verifyCohortAction, type CohortChannel } from '@/lib/cohort-assign';
import { sendCohortCheckoutEmail } from '@/lib/resend';
import { sendSmsToRecipient } from '@/lib/sms';
import {
  COHORT_CHECKOUT_URL,
  COHORT_PROMO_CODE,
  cohortPriceLabel,
  cohortPromoPriceLabel,
  formatSendStamp,
} from '@/lib/cohort-checkout';

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

  const promoCode = withPromo ? COHORT_PROMO_CODE : null;
  const promoPrice = withPromo ? cohortPromoPriceLabel() : null;

  const wantEmail = channel === 'email' || channel === 'both';
  const wantSms = channel === 'sms' || channel === 'both';

  const firstName = app.name.split(' ')[0];
  const smsBody = withPromo
    ? `${firstName}, here's your 12-Week Cohort enrollment link: ${COHORT_CHECKOUT_URL} — use code ${COHORT_PROMO_CODE} for ${cohortPromoPriceLabel()}. Seats are limited.`
    : `${firstName}, here's your 12-Week Cohort enrollment link: ${COHORT_CHECKOUT_URL} — ${cohortPriceLabel()}. Seats are limited.`;

  // Only the requested channel(s) fire, and they're independent — one failing
  // must not silently swallow the other.
  const [emailRes, smsRes] = await Promise.allSettled([
    wantEmail
      ? sendCohortCheckoutEmail({
          to: app.email,
          name: app.name,
          checkoutUrl: COHORT_CHECKOUT_URL,
          priceLabel: withPromo ? cohortPromoPriceLabel() : cohortPriceLabel(),
          promoCode,
          promoPriceLabel: promoPrice,
        })
      : Promise.resolve(null),
    wantSms
      ? sendSmsToRecipient(
          { id: app.id, phone: app.phone, label: app.name, ghlContactId: app.ghlContactId },
          smsBody,
        )
      : Promise.resolve(null),
  ]);

  const emailOk = wantEmail ? emailRes.status === 'fulfilled' : null;
  const smsOk = wantSms
    ? smsRes.status === 'fulfilled' && (smsRes.value as { ok?: boolean } | null)?.ok !== false
    : null;

  // Leave a trail on the record so the next closer can see it was already sent.
  const stamp = formatSendStamp({ at: new Date(), promo: withPromo, emailOk, smsOk });

  await prisma.cohortApplication
    .update({
      where: { id },
      data: {
        status: app.status === 'new' ? 'called' : app.status,
        closerNotes: app.closerNotes ? `${app.closerNotes}\n${stamp}` : stamp,
      },
    })
    .catch(() => {});

  return NextResponse.json({
    ok: emailOk === true || smsOk === true,
    email: emailOk,
    sms: smsOk,
    channel,
    smsError:
      smsOk === false
        ? (smsRes.status === 'fulfilled' ? (smsRes.value as { error?: string } | null)?.error : 'send threw')
        : undefined,
    promo: withPromo ? COHORT_PROMO_CODE : null,
  });
}
