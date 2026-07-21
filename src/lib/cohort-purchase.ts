import { prisma } from '@/lib/prisma';
import { formatPhoneUS } from '@/lib/sms';
import { postMessage, deleteMessage, hasSlackBot } from '@/lib/slack-bot';
import { COHORT_METADATA_KEY } from '@/lib/cohort-checkout';
import {
  PLAN_PAYMENTS,
  PLAN_PAYMENT_DOLLARS,
  PLAN_SECOND_PAYMENT,
  PLAN_THIRD_PAYMENT,
} from '@/lib/cohort-payment-plan';

/**
 * Cohort purchases — recording the money and moving the card.
 *
 * A sale lands in #cohort-purchases and the lead's card is removed from
 * #cohort-applications, so the applications channel only ever shows people who
 * still need working. Same move-then-delete ordering as the Contacted button:
 * nothing is deleted until the purchase card has actually posted, because a
 * failed post plus a successful delete would erase the sale from the channel.
 *
 * MATCHING
 *   · plan links carry `applicationId` in metadata (minted per applicant)
 *   · the pay-in-full link is REUSABLE, so its metadata is fixed and cannot
 *     name a person — those match on buyer email
 * An unmatched payment is still recorded, with the card saying so, rather than
 * dropped while someone works out whose it was.
 */

export const cohortPurchasesChannelId = () =>
  process.env.SLACK_COHORT_PURCHASES_CHANNEL_ID?.trim() || '';

/** Does this payment belong to the cohort at all? */
export function isCohortPurchase(metadata: Record<string, string>): boolean {
  return metadata.cohort === COHORT_METADATA_KEY || Boolean(metadata.applicationId);
}

export interface CohortPaymentInput {
  paymentId: string;
  buyerEmail: string;
  buyerName?: string;
  amountCents: number;
  metadata: Record<string, string>;
  eventType: string;
  /** Plan payments 2 and 3 arrive as subscription renewals. */
  isRenewal: boolean;
  provider?: string;
  productTitle?: string;
}

export interface RecordResult {
  recorded: boolean;
  duplicate: boolean;
  applicationId: string | null;
  paymentsMade: number;
  fullyPaid: boolean;
}

const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

/**
 * Record a payment and update the application's totals.
 *
 * Idempotent through the unique `paymentId`: Fanbasis retries webhooks, and a
 * retry must not double someone's balance or re-fire the alert.
 */
export async function recordCohortPayment(input: CohortPaymentInput): Promise<RecordResult> {
  const isPlan = input.metadata.plan === '3pay' || input.isRenewal;

  // Prefer the explicit id; fall back to email for the reusable pay-in-full link.
  let applicationId: string | null = input.metadata.applicationId || null;
  if (applicationId) {
    const exists = await prisma.cohortApplication.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!exists) applicationId = null;
  }
  if (!applicationId && input.buyerEmail) {
    const match = await prisma.cohortApplication.findFirst({
      where: { email: input.buyerEmail.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    applicationId = match?.id ?? null;
  }

  // Unique paymentId makes this the dedupe gate.
  try {
    await prisma.cohortPayment.create({
      data: {
        applicationId,
        buyerEmail: input.buyerEmail.toLowerCase(),
        buyerName: input.buyerName ?? null,
        amountCents: input.amountCents,
        paymentId: input.paymentId,
        kind: isPlan ? 'plan' : 'full',
        isRenewal: input.isRenewal,
        eventType: input.eventType,
      },
    });
  } catch {
    // Unique violation = we already processed this payment.
    return {
      recorded: false,
      duplicate: true,
      applicationId,
      paymentsMade: 0,
      fullyPaid: false,
    };
  }

  let paymentsMade = 1;
  let fullyPaid = !isPlan;

  if (applicationId) {
    const agg = await prisma.cohortPayment.aggregate({
      where: { applicationId },
      _sum: { amountCents: true },
      _count: true,
    });
    paymentsMade = agg._count;
    const total = agg._sum.amountCents ?? 0;
    fullyPaid = isPlan ? paymentsMade >= PLAN_PAYMENTS : true;

    const now = new Date();
    const existing = await prisma.cohortApplication.findUnique({
      where: { id: applicationId },
      select: { firstPaidAt: true, paidInFullAt: true },
    });
    await prisma.cohortApplication.update({
      where: { id: applicationId },
      data: {
        paymentPlan: isPlan,
        paidTotalCents: total,
        paymentsMade,
        firstPaidAt: existing?.firstPaidAt ?? now,
        paidInFullAt: fullyPaid ? (existing?.paidInFullAt ?? now) : null,
        status: 'enrolled',
      },
    });
  }

  return { recorded: true, duplicate: false, applicationId, paymentsMade, fullyPaid };
}

/**
 * Post the sale to #cohort-purchases, then remove the lead card from
 * #cohort-applications. Move first — a delete that outruns a failed post would
 * erase the sale from Slack entirely.
 */
export async function announceCohortPurchase(
  input: CohortPaymentInput,
  result: RecordResult,
): Promise<{ posted: boolean; removed: boolean; error?: string }> {
  if (!hasSlackBot()) return { posted: false, removed: false, error: 'no_bot_token' };
  const channel = cohortPurchasesChannelId();
  if (!channel) return { posted: false, removed: false, error: 'no_purchases_channel' };

  const app = result.applicationId
    ? await prisma.cohortApplication.findUnique({ where: { id: result.applicationId } })
    : null;

  const isPlan = input.metadata.plan === '3pay' || input.isRenewal;
  const when = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const planLine = isPlan
    ? `Payment *${result.paymentsMade} of ${PLAN_PAYMENTS}* · $${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')} each` +
      (result.fullyPaid
        ? ' · *PAID IN FULL* ✅'
        : `\nRemaining: ${[PLAN_SECOND_PAYMENT, PLAN_THIRD_PAYMENT]
            .slice(result.paymentsMade - 1)
            .join(' · ')}`)
    : 'Paid in full ✅';

  const headline = result.fullyPaid
    ? `💰 COHORT SALE — ${input.buyerName || input.buyerEmail}`
    : `💵 Cohort payment ${result.paymentsMade}/${PLAN_PAYMENTS} — ${input.buyerName || input.buyerEmail}`;

  const fields: { type: 'mrkdwn'; text: string }[] = [
    { type: 'mrkdwn', text: `*Amount:*\n${money(input.amountCents)}` },
    { type: 'mrkdwn', text: `*Type:*\n${isPlan ? '3-payment plan' : 'Pay in full'}` },
    { type: 'mrkdwn', text: `*Email:*\n${input.buyerEmail}` },
    {
      type: 'mrkdwn',
      text: `*Phone:*\n${app?.phone ? `*<tel:${app.phone}|${formatPhoneUS(app.phone)}>*` : '—'}`,
    },
    { type: 'mrkdwn', text: `*Provider:*\n${input.provider || 'Fanbasis'}` },
    { type: 'mrkdwn', text: `*Payment ID:*\n\`${input.paymentId}\`` },
  ];
  if (app) {
    fields.push(
      { type: 'mrkdwn', text: `*Closer:*\n${app.assignedTo ?? '—'}` },
      { type: 'mrkdwn', text: `*Tier:*\n${app.tier} · ${app.score}/28` },
      { type: 'mrkdwn', text: `*State:*\n${app.state}` },
      { type: 'mrkdwn', text: `*Total paid:*\n${money(app.paidTotalCents)}` },
    );
  }

  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: headline, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: planLine } },
    { type: 'section', fields: fields.slice(0, 10) },
  ];
  if (input.productTitle) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Product: ${input.productTitle} · ${input.eventType} · ${when} ET` }],
    });
  }
  if (!app) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *No matching application* for ${input.buyerEmail}. Payment is recorded — someone needs to work out who this is and onboard them manually.`,
      },
    });
  }
  blocks.push({ type: 'divider' });

  const post = await postMessage({
    channel,
    text: headline,
    blocks,
  });
  if (!post.ok) return { posted: false, removed: false, error: `post:${post.error}` };

  // Only now is the applications card safe to remove.
  let removed = false;
  let removeErr: string | undefined;
  if (app?.slackChannelId && app.slackMessageTs) {
    const del = await deleteMessage({ channel: app.slackChannelId, ts: app.slackMessageTs });
    removed = del.ok;
    if (!del.ok) removeErr = `remove:${del.error}`;
    if (del.ok) {
      await prisma.cohortApplication
        .update({ where: { id: app.id }, data: { slackMessageTs: null } })
        .catch(() => {});
    }
  }

  return { posted: true, removed, error: removeErr };
}
