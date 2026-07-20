import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  READINESS_OPTIONS,
  INVESTMENT_OPTIONS,
  WORK_OPTIONS,
  US_STATES,
  scoreApplication,
  closerLine,
} from '@/lib/cohort-scoring';
import { isVipBuyer } from '@/lib/cohort-vip';
import { sendSmsToRecipient, notifyRecipients, normalizePhoneE164 } from '@/lib/sms';
import { notifySlackChannels } from '@/lib/slack';

export const runtime = 'nodejs';

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
  const tags = [
    'cohort-application',
    `cohort-tier:${input.tier}`,
    'source:webinar-live',
    'sms-consent',
    ...(input.isVip ? ['webinar-vip'] : []),
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
      // Required phone + visible disclosure above the button ⇒ submitting is
      // the affirmative act. Record what they agreed to and when.
      smsConsent: true,
      smsConsentText: d.consentText ?? null,
      smsConsentAt: new Date(),
    },
  });

  const line = closerLine({ ...app, note: app.note });

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
      "Application received — Todd's team is calling tonight. Keep your phone close."
    ).catch(() => {});

    // Team alerts, tier-first so closers can triage from the notification.
    await notifyRecipients('lead', line, 'university').catch(() => {});
    await notifySlackChannels(
      'lead',
      'cohort',
      {
        headline: `Cohort application — TIER ${tier} (${score} pts)${isVip ? ' · VIP ✅' : ''}`,
        contactName: d.name,
        email: d.email,
        fields: [
          { label: 'Phone', value: app.phone },
          { label: 'State', value: d.state },
          { label: 'Tier', value: `${tier} — ${score} pts` },
          ...(reasons.length ? [{ label: 'Why', value: reasons.join('; ') }] : []),
          ...(d.note ? [{ label: 'Note', value: d.note }] : []),
        ],
      }
    ).catch(() => {});
  });

  return NextResponse.json({ ok: true, id: app.id, tier, score });
}
