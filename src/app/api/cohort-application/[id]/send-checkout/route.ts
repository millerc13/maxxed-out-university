import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';
import { verifyCohortAction } from '@/lib/cohort-assign';
import { sendCohortCheckoutEmail } from '@/lib/resend';
import { sendSmsToRecipient } from '@/lib/sms';
import {
  COHORT_CHECKOUT_URL,
  COHORT_PROMO_CODE,
  cohortPriceLabel,
  cohortPromoPriceLabel,
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
  try {
    const body = await request.json();
    withPromo = !!body?.promo;
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    /* no body — default to no promo */
  }

  // Two ways in: an admin session (the call sheet) OR a signed token (a closer
  // tapping the Slack button on their phone, where they're not logged in). The
  // token is scoped to this exact application AND promo choice, so it can't be
  // edited into a discount that wasn't offered.
  const signed = token ? verifyCohortAction(id, withPromo, token) : false;
  if (!signed) {
    const session = await sessionWithCapability('admin:access');
    if (!session) return unauthorized();
  }

  const app = await prisma.cohortApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const promoCode = withPromo ? COHORT_PROMO_CODE : null;
  const promoPrice = withPromo ? cohortPromoPriceLabel() : null;

  const [emailRes, smsRes] = await Promise.allSettled([
    sendCohortCheckoutEmail({
      to: app.email,
      name: app.name,
      checkoutUrl: COHORT_CHECKOUT_URL,
      priceLabel: withPromo ? cohortPromoPriceLabel() : cohortPriceLabel(),
      promoCode,
      promoPriceLabel: promoPrice,
    }),
    sendSmsToRecipient(
      { id: app.id, phone: app.phone, label: app.name, ghlContactId: app.ghlContactId },
      withPromo
        ? `${app.name.split(' ')[0]}, here's your 12-Week Cohort enrollment link: ${COHORT_CHECKOUT_URL} — use code ${COHORT_PROMO_CODE} for ${cohortPromoPriceLabel()}. Seats are limited.`
        : `${app.name.split(' ')[0]}, here's your 12-Week Cohort enrollment link: ${COHORT_CHECKOUT_URL} — ${cohortPriceLabel()}. Seats are limited.`
    ),
  ]);

  const emailOk = emailRes.status === 'fulfilled';
  const smsOk = smsRes.status === 'fulfilled' && smsRes.value?.ok !== false;

  // Leave a trail on the record so the next closer can see it was already sent.
  const stamp = `[${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET] Checkout link sent${
    withPromo ? ` (${COHORT_PROMO_CODE})` : ''
  } — email:${emailOk ? 'ok' : 'FAILED'} sms:${smsOk ? 'ok' : 'FAILED'}`;

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
    ok: emailOk || smsOk,
    email: emailOk,
    sms: smsOk,
    smsError: smsOk ? undefined : (smsRes.status === 'fulfilled' ? smsRes.value?.error : 'send threw'),
    promo: withPromo ? COHORT_PROMO_CODE : null,
  });
}
