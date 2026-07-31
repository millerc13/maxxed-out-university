import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  READINESS_OPTIONS,
  INVESTMENT_OPTIONS,
  WORK_OPTIONS,
  US_STATES,
  scoreApplication,
  TIER_ACTION,
  type Tier,
} from '@/lib/cohort-scoring';
import { isVipBuyer } from '@/lib/cohort-vip';
import { nextCohortCloser, cohortSendUrl, cohortContactedUrl, closerMention } from '@/lib/cohort-assign';
import { sendSmsToRecipient, normalizePhoneE164, formatPhoneUS } from '@/lib/sms';
import { notifySlackChannels, buildBlockKitMessage } from '@/lib/slack';
import { hasSlackBot, cohortChannelId, postMessage } from '@/lib/slack-bot';
import { slackSigningSecret } from '@/lib/slack-verify';
import { cohortPriceLabel, cohortPromoPriceLabel, COHORT_PROMO_CODE } from '@/lib/cohort-checkout';
import { PLAN_PAYMENT_DOLLARS, planPriceLabel } from '@/lib/cohort-payment-plan';

export const runtime = 'nodejs';

/** Interactive buttons need a verifiable signature; without it, use URL buttons. */
const slackInteractive = () => Boolean(slackSigningSecret());

const values = <T extends readonly { value: string }[]>(opts: T) =>
  opts.map((o) => o.value) as [string, ...string[]];

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const d = v.replace(/\D/g, '');
      return d.length === 10 || (d.length === 11 && d.startsWith('1'));
    }, 'Enter a valid 10-digit US phone number'),
  email: z.string().trim().email('Enter a valid email'),
  state: z.enum(US_STATES as unknown as [string, ...string[]]),
  readiness: z.enum(values(READINESS_OPTIONS)),
  investment: z.enum(values(INVESTMENT_OPTIONS)),
  work: z.enum(values(WORK_OPTIONS)),
  note: z.string().trim().max(2000).optional(),
  /** Exact disclosure text shown above the submit button (stored for audit). */
  consentText: z.string().trim().max(1000).optional(),
});

/**
 * Routing key for this specific cohort intake. A future cohort (real-estate,
 * a later Medicaid round) should use its OWN source so Slack channels can be
 * split per cohort instead of everything landing in one room.
 */
const COHORT_SOURCE = 'medicaid-cohort';

const GHL_API_BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';

/** Lean GHL upsert — tags the contact so closers can filter by tier in the CRM. */
async function upsertGhl(input: {
  name: string;
  email: string;
  phone: string;
  state: string;
  tier: string;
  score: number;
  isVip: boolean;
}): Promise<string | null> {
  const apiKey = process.env.GHL_API_KEY?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!apiKey || !locationId) return null;

  const [firstName, ...rest] = input.name.split(/\s+/);
  // Webinar's over — no 'source:webinar-live' or 'webinar-vip' on new applicants.
  const tags = [
    'cohort-application',
    `cohort-tier:${input.tier}`,
    'source:cohort-application',
    'sms-consent',
  ];

  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Version: process.env.GHL_API_VERSION || '2021-07-28',
      },
      body: JSON.stringify({
        locationId,
        email: input.email,
        phone: normalizePhoneE164(input.phone) || input.phone,
        firstName: firstName || undefined,
        lastName: rest.join(' ') || undefined,
        state: input.state,
        tags,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.contact?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/cohort-application — public submit for the live-webinar cohort form.
 *
 * Scores + tiers the applicant, stores them, then (best-effort, never blocking
 * the response) syncs GHL, texts the applicant to set the callback expectation,
 * and alerts the team. The applicant must get their confirmation screen fast —
 * they're filling this out mid-class on a phone.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // VIP is an auto-Tier-A override, so resolve before scoring.
  const isVip = await isVipBuyer(d.email, d.phone);
  const { score, tier, reasons } = scoreApplication({
    readiness: d.readiness,
    investment: d.investment,
    work: d.work,
    isVip,
  });

  // Round-robin the lead so the team splits them evenly and everyone knows
  // whose call it is the moment the Slack message lands.
  const assignedTo = await nextCohortCloser();

  const app = await prisma.cohortApplication.create({
    data: {
      name: d.name,
      phone: normalizePhoneE164(d.phone) || d.phone,
      email: d.email.toLowerCase(),
      state: d.state,
      readiness: d.readiness,
      investment: d.investment,
      work: d.work,
      note: d.note || null,
      score,
      tier,
      isVip,
      assignedTo,
      // Required phone + visible disclosure above the button ⇒ submitting is
      // the affirmative act. Record what they agreed to and when.
      source: COHORT_SOURCE,
      smsConsent: true,
      smsConsentText: d.consentText ?? null,
      smsConsentAt: new Date(),
    },
  });

  after(async () => {
    const ghlContactId = await upsertGhl({
      name: d.name,
      email: d.email,
      phone: d.phone,
      state: d.state,
      tier,
      score,
      isVip,
    });
    if (ghlContactId) {
      await prisma.cohortApplication
        .update({ where: { id: app.id }, data: { ghlContactId } })
        .catch(() => {});
    }

    // Applicant confirmation text — sets the callback expectation and lifts
    // the connect rate (per the brief).
    await sendSmsToRecipient(
      { id: app.id, phone: app.phone, label: app.name, ghlContactId },
      "Application received — Todd's team will reach out soon. Keep your phone close."
    ).catch(() => {});

    // Internal alerts go to SLACK ONLY — no staff SMS. notifyRecipients() texts
    // every NotificationRecipient with notifyOnLead (Rebecca et al.), which is
    // not wanted for cohort applications: the volume is high and the call sheet
    // + Slack channel already cover triage.

    // Slack — its own event type so this never spams existing `lead` channels.
    // Sends EVERY form field: closers should be able to work the call straight
    // from the notification without opening the dashboard.
    const labelOf = <T extends { value: string; label: string; points: number }>(
      opts: readonly T[],
      v: string
    ) => {
      const o = opts.find((x) => x.value === v);
      return o ? `${o.label} (${o.points} pts)` : v;
    };

    const slackPayload = {
      headline: `${assignedTo.toUpperCase()} → TIER ${tier} · ${score}/28 pts${isVip ? ' · ★ VIP BUYER' : ''} — ${d.name}`,
      emoji: tier === 'A' ? '🔥' : '🎯',
      contactName: d.name,
      email: d.email,
      phone: app.phone,
      fields: [
        { label: '🎯 ASSIGNED TO', value: closerMention(assignedTo) },
        { label: 'Tier', value: `${tier} — ${TIER_ACTION[tier as Tier]}` },
        { label: 'Score', value: `${score} / 28` },
        { label: 'State', value: d.state },
        { label: 'Q: Where are you right now with this?', value: labelOf(READINESS_OPTIONS, d.readiness) },
        { label: 'Q: How much to invest in yourself', value: labelOf(INVESTMENT_OPTIONS, d.investment) },
        { label: 'Q: Current work situation', value: labelOf(WORK_OPTIONS, d.work) },
        { label: 'Q: Anything we should know?', value: d.note?.trim() || '—' },
        ...(reasons.length ? [{ label: 'Scoring overrides', value: reasons.join('; ') }] : []),
        // Slack hard-caps a section at 10 fields and the builder slices the rest,
        // so keep this list at 10 — anything past it silently disappears.
        // Just the list price. The coupon is a decision the closer makes on
        // the call, and showing both numbers here read as "which one is it?".
        { label: `💳 Price`, value: cohortPriceLabel() },
      ],
      // Repeated right above the buttons: by the time a reader scrolls past all
      // the form fields, the assignee at the top is off screen — and these
      // buttons text and email a real applicant.
      //
      // The number is a tel: link rather than a button because Slack rejects a
      // tel: URL on a button outright (invalid_blocks) — as a link it dials in
      // one tap with no browser hop in between. Bold and alone on its line is
      // as prominent as Slack gets; mrkdwn has no font sizing.
      actionsNote: [
        `🎯 This lead belongs to ${closerMention(assignedTo)} — ${d.name}`,
        `📞 *<tel:${app.phone}|${formatPhoneUS(app.phone)}>*  ← tap to call`,
      ].join('\n'),
      // Each button opens a signed one-tap confirm page that performs the send.
      // Slack URL buttons can't POST, and a bare GET would let link unfurlers
      // and mobile prefetch fire real messages at applicants.
      // Slack caps an actions block at 5 elements.
      // Interactive buttons when the Slack app has Interactivity wired up:
      // the press posts straight to /api/slack/interactive and the send happens
      // in place, with Slack's own confirm modal standing in for the browser
      // page. Without a signing secret those presses can't be verified, so we
      // fall back to the URL buttons rather than trusting an unsigned request.
      // Slack caps an actions block at 5 elements.
      links: slackInteractive()
        ? [
            {
              actionId: 'cohort_send:sms:0',
              value: app.id,
              label: '📲 Text Checkout',
              style: 'primary' as const,
              confirm: {
                title: 'Text the checkout link?',
                text: `Send *${d.name}* the ${cohortPriceLabel()} enrollment link by text.`,
                confirm: 'Send text',
              },
            },
            {
              actionId: 'cohort_send:sms:1',
              value: app.id,
              label: '📲 Text Coupon',
              confirm: {
                title: 'Text the coupon?',
                text: `Send *${d.name}* the *${COHORT_PROMO_CODE}* code (${cohortPromoPriceLabel()}) by text.`,
                confirm: 'Send coupon',
              },
            },
            {
              actionId: 'cohort_send:email:0',
              value: app.id,
              label: '✉️ Email Checkout',
              confirm: {
                title: 'Email the checkout link?',
                text: `Send *${d.name}* the ${cohortPriceLabel()} enrollment link by email.`,
                confirm: 'Send email',
              },
            },
            {
              actionId: 'cohort_send:email:1',
              value: app.id,
              label: '✉️ Email Coupon',
              confirm: {
                title: 'Email the coupon?',
                text: `Send *${d.name}* the *${COHORT_PROMO_CODE}* code (${cohortPromoPriceLabel()}) by email.`,
                confirm: 'Send coupon',
              },
            },
            {
              actionId: 'cohort_plan:sms',
              value: app.id,
              label: `💳 Text Plan (3×$${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')})`,
              confirm: {
                title: 'Text the payment plan?',
                text: `Send *${d.name}* the 3-payment plan: *$${PLAN_PAYMENT_DOLLARS.toLocaleString('en-US')} today* to hold their seat, then Sep 14 and Oct 12. Total ${planPriceLabel()} (vs ${cohortPriceLabel()} paid in full).`,
                confirm: 'Send plan',
              },
            },
            {
              actionId: 'cohort_plan:email',
              value: app.id,
              label: '✉️ Email Plan',
              confirm: {
                title: 'Email the payment plan?',
                text: `Send *${d.name}* the 3-payment plan by email. ${planPriceLabel()}, first payment today.`,
                confirm: 'Send plan',
              },
            },
            {
              actionId: 'cohort_contacted',
              value: app.id,
              label: '✅ Contacted',
              confirm: {
                title: 'Mark contacted?',
                // No '#' prefix: Slack auto-links #channel into <#C09…>, and confirm
                // dialogs don't render channel links — it shows the raw id.
                text: `Moves *${d.name}* to the cohort-contacted channel and removes this card. Does not text or email them.`,
                confirm: 'Mark contacted',
              },
            },
          ]
        : [
            { url: cohortSendUrl(app.id, false, 'sms'), label: '📲 Text Checkout', style: 'primary' as const },
            { url: cohortSendUrl(app.id, true, 'sms'), label: '📲 Text Coupon' },
            { url: cohortSendUrl(app.id, false, 'email'), label: '✉️ Email Checkout' },
            { url: cohortSendUrl(app.id, true, 'email'), label: '✉️ Email Coupon' },
            { url: cohortContactedUrl(app.id, assignedTo), label: '✅ Contacted' },
          ],
    };

    // Prefer the bot token: chat.postMessage returns a message id, which is the
    // only way the ✅ Contacted button can later collapse this card. Incoming
    // webhooks return nothing and their messages can never be edited.
    //
    // Falls back to the webhook fan-out whenever the bot isn't configured or
    // Slack rejects the call — a misconfigured token must never cost a live
    // lead its notification.
    let postedViaBot = false;
    if (hasSlackBot() && cohortChannelId()) {
      const msg = buildBlockKitMessage('cohort_application', slackPayload);
      const res = await postMessage({
        channel: cohortChannelId(),
        text: msg.text,
        blocks: msg.blocks,
      });
      if (res.ok && res.data) {
        postedViaBot = true;
        await prisma.cohortApplication
          .update({
            where: { id: app.id },
            data: { slackChannelId: res.data.channel, slackMessageTs: res.data.ts },
          })
          .catch(() => {});
      }
    }
    if (!postedViaBot) {
      await notifySlackChannels('cohort_application', COHORT_SOURCE, slackPayload).catch(() => {});
    }
  });

  return NextResponse.json({ ok: true, id: app.id, tier, score });
}
