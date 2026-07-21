import { prisma } from '@/lib/prisma';
import { sendCohortCheckoutEmail } from '@/lib/resend';
import { sendSmsToRecipient } from '@/lib/sms';
import type { CohortChannel } from '@/lib/cohort-assign';
import { createPlanCheckout, planPriceLabel, PLAN_PAYMENT_DOLLARS } from '@/lib/cohort-payment-plan';
import {
  COHORT_CHECKOUT_URL,
  COHORT_PROMO_CODE,
  cohortPriceLabel,
  cohortPromoPriceLabel,
  formatSendStamp,
} from '@/lib/cohort-checkout';

/**
 * Sending the enrollment link, shared by every trigger: the admin call sheet,
 * the signed one-tap page, and the Slack interactive buttons.
 *
 * Extracted so those three can't drift — a closer must get the same message
 * and the same audit stamp no matter where they pressed. Email and SMS are
 * attempted independently: one failing must not silently swallow the other.
 */

export type CohortOffer = 'full' | 'promo' | 'plan';

export interface SendInput {
  app: {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: string;
    closerNotes: string | null;
    ghlContactId: string | null;
  };
  channel: CohortChannel;
  withPromo: boolean;
}

export interface SendOutcome {
  ok: boolean;
  email: boolean | null;
  sms: boolean | null;
  smsError?: string;
  promo: string | null;
  channel: CohortChannel;
  /** One-line human summary, used for the Slack ephemeral reply. */
  summary: (by: string) => string;
}

export async function sendCohortCheckout({
  app,
  channel,
  withPromo,
}: SendInput): Promise<SendOutcome> {
  const wantEmail = channel === 'email' || channel === 'both';
  const wantSms = channel === 'sms' || channel === 'both';

  const firstName = app.name.split(' ')[0];
  const smsBody = withPromo
    ? `${firstName}, here's your 12-Week Cohort enrollment link: ${COHORT_CHECKOUT_URL} — use code ${COHORT_PROMO_CODE} for ${cohortPromoPriceLabel()}. Seats are limited.`
    : `${firstName}, here's your 12-Week Cohort enrollment link: ${COHORT_CHECKOUT_URL} — ${cohortPriceLabel()}. Seats are limited.`;

  const [emailRes, smsRes] = await Promise.allSettled([
    wantEmail
      ? sendCohortCheckoutEmail({
          to: app.email,
          name: app.name,
          checkoutUrl: COHORT_CHECKOUT_URL,
          priceLabel: withPromo ? cohortPromoPriceLabel() : cohortPriceLabel(),
          promoCode: withPromo ? COHORT_PROMO_CODE : null,
          promoPriceLabel: withPromo ? cohortPromoPriceLabel() : null,
        })
      : Promise.resolve(null),
    wantSms
      ? sendSmsToRecipient(
          { id: app.id, phone: app.phone, label: app.name, ghlContactId: app.ghlContactId },
          smsBody
        )
      : Promise.resolve(null),
  ]);

  const emailOk = wantEmail ? emailRes.status === 'fulfilled' : null;
  const smsOk = wantSms
    ? smsRes.status === 'fulfilled' && (smsRes.value as { ok?: boolean } | null)?.ok !== false
    : null;
  const smsError =
    smsOk === false
      ? smsRes.status === 'fulfilled'
        ? (smsRes.value as { error?: string } | null)?.error
        : 'send threw'
      : undefined;

  const stamp = formatSendStamp({ at: new Date(), promo: withPromo, emailOk, smsOk });
  await prisma.cohortApplication
    .update({
      where: { id: app.id },
      data: {
        status: app.status === 'new' ? 'called' : app.status,
        closerNotes: app.closerNotes ? `${app.closerNotes}\n${stamp}` : stamp,
      },
    })
    .catch(() => {});

  const what = withPromo ? `${COHORT_PROMO_CODE} coupon (${cohortPromoPriceLabel()})` : cohortPriceLabel();

  return {
    ok: emailOk === true || smsOk === true,
    email: emailOk,
    sms: smsOk,
    smsError,
    promo: withPromo ? COHORT_PROMO_CODE : null,
    channel,
    summary: (by: string) => {
      const parts = [
        smsOk === null ? null : smsOk ? '📲 text sent' : '📲 text FAILED',
        emailOk === null ? null : emailOk ? '✉️ email sent' : '✉️ email FAILED',
      ].filter(Boolean);
      const head = emailOk === false || smsOk === false ? '⚠️' : '✅';
      return `${head} ${app.name} — ${what} · ${parts.join(' · ')} (by ${by})`;
    },
  };
}

/**
 * Send the 3-payment plan link.
 *
 * Separate from sendCohortCheckout because the link is minted per applicant —
 * the plan's later payments fall on fixed dates, so the schedule depends on the
 * day it was created (see cohort-payment-plan). A failure here must NOT fall
 * back to the pay-in-full link: quietly charging someone $10,000 when a closer
 * offered them $3,500-a-month is the worst outcome available.
 */
export async function sendCohortPlan({
  app,
  channel,
}: {
  app: SendInput['app'];
  channel: CohortChannel;
}): Promise<SendOutcome> {
  const plan = await createPlanCheckout({
    applicationId: app.id,
    name: app.name,
    email: app.email,
  });

  const wantEmail = channel === 'email' || channel === 'both';
  const wantSms = channel === 'sms' || channel === 'both';
  const firstName = app.name.split(' ')[0];

  const smsBody =
    `${firstName}, here's your 12-Week Cohort payment plan: ${plan.paymentLink} — ` +
    `$${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')} today holds your seat, then ` +
    `$${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')} on Sep 14 and Oct 12. Seats are limited.`;

  const [emailRes, smsRes] = await Promise.allSettled([
    wantEmail
      ? sendCohortCheckoutEmail({
          to: app.email,
          name: app.name,
          checkoutUrl: plan.paymentLink,
          priceLabel: planPriceLabel(),
          promoCode: null,
          promoPriceLabel: null,
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

  const mark = (v: boolean | null) => (v === null ? 'skipped' : v ? 'ok' : 'FAILED');
  const stamp =
    `[${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET] ` +
    `PAYMENT PLAN sent (${planPriceLabel()}, session ${plan.checkoutSessionId}) — ` +
    `email:${mark(emailOk)} sms:${mark(smsOk)}`;

  await prisma.cohortApplication
    .update({
      where: { id: app.id },
      data: {
        status: app.status === 'new' ? 'called' : app.status,
        closerNotes: app.closerNotes ? `${app.closerNotes}\n${stamp}` : stamp,
      },
    })
    .catch(() => {});

  return {
    ok: emailOk === true || smsOk === true,
    email: emailOk,
    sms: smsOk,
    smsError:
      smsOk === false
        ? smsRes.status === 'fulfilled'
          ? (smsRes.value as { error?: string } | null)?.error
          : 'send threw'
        : undefined,
    promo: null,
    channel,
    summary: (by: string) => {
      const parts = [
        smsOk === null ? null : smsOk ? '📲 text sent' : '📲 text FAILED',
        emailOk === null ? null : emailOk ? '✉️ email sent' : '✉️ email FAILED',
      ].filter(Boolean);
      const head = emailOk === false || smsOk === false ? '⚠️' : '✅';
      return `${head} ${app.name} — PAYMENT PLAN ${planPriceLabel()} · ${parts.join(' · ')} (by ${by})`;
    },
  };
}
