import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  generateSigningToken,
  renderMarkdown,
  markdownToHtml,
  type TokenValues,
} from '@/lib/esign-tokens';
import {
  sendSigningRequestEmail,
} from '@/lib/esign-email';

const TOKEN_TTL_DAYS = Number(process.env.ESIGN_TOKEN_TTL_DAYS ?? 30);
const BASE_URL = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');

// Defaults baked in for the static template tokens that aren't per-doc
// editable (NonCompete duration, governing law). Phase 4 template editor
// will eventually let admin override these from the UI.
const STATIC_TOKEN_DEFAULTS: TokenValues = {
  'NonCompete.YearsPostProgram': '1',
  'GoverningLaw.State': 'Ohio',
  'Dispute.Location': 'Ohio',
  'Company.SignatureLine': 'Todd Pultz',
};

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

type PaymentPlan = {
  installments: number;
  perInstallmentCents: number;
  frequency: 'monthly' | 'quarterly';
  firstDueAt: string; // ISO date string (YYYY-MM-DD)
  // Optional explicit per-installment due dates. When set, length must
  // equal `installments`. Used by the Compose modal so admins can
  // override the auto-computed-from-frequency dates per row. The
  // contract's {{Payment.Schedule}} renders these verbatim. Falls back
  // to firstDueAt + frequency when absent.
  dueDates?: string[];
  // Optional per-installment amounts in cents. Length must equal
  // `installments`. Used for unequal payment plans (e.g. larger
  // initial deposit). Falls back to perInstallmentCents (equal split)
  // when absent.
  amountsCents?: number[];
  // Optional per-installment refundability flags. Length must equal
  // `installments`. true = refundable, false = NON-REFUNDABLE.
  // Default when absent: ALL installments are non-refundable (matches
  // section 3.3 of the contract: "ALL SALES ARE FINAL"). Admin can
  // flip individual rows in the Compose modal.
  refundable?: boolean[];
};

// Parse a YYYY-MM-DD string as a *local* calendar date, not UTC.
// `new Date('2026-06-01')` is parsed as UTC by spec, which then prints
// as the previous day in any negative-offset timezone (e.g. EDT).
// Splitting the string and using the multi-arg constructor keeps the
// y/m/d in the server's local time zone — which is what an admin
// editing a date picker means.
function parseIsoLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Fallback: anything else (full ISO etc.) — accept browser's interpretation.
  return new Date(s);
}

// Date arithmetic that survives end-of-month edge cases (Jan 31 + 1
// month → Feb 28/29). We clamp the day-of-month rather than overflow
// into the next month, matching how a person reads "the 31st of every
// month → the last day of February".
function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDayOfTarget));
  return d;
}

// Compute the per-installment due dates from firstDueAt + frequency.
// Used as the fallback when an admin hasn't specified explicit dates.
function computeDueDatesFromFrequency(plan: Pick<PaymentPlan, 'firstDueAt' | 'frequency' | 'installments'>): Date[] {
  const stepMonths = plan.frequency === 'monthly' ? 1 : 3;
  const start = parseIsoLocalDate(plan.firstDueAt);
  return Array.from({ length: plan.installments }, (_, i) => addMonthsClamped(start, i * stepMonths));
}

// Resolve the canonical due-date list for a plan: explicit dueDates
// when set + length matches, otherwise computed from frequency.
function resolveDueDates(plan: PaymentPlan): Date[] {
  if (plan.dueDates && plan.dueDates.length === plan.installments) {
    return plan.dueDates.map(parseIsoLocalDate);
  }
  return computeDueDatesFromFrequency(plan);
}

function resolveAmounts(plan: PaymentPlan): number[] {
  if (plan.amountsCents && plan.amountsCents.length === plan.installments) {
    return plan.amountsCents;
  }
  return Array.from({ length: plan.installments }, () => plan.perInstallmentCents);
}

// Resolve per-row refundability. Default: every installment is
// non-refundable (matches the contract's "ALL SALES ARE FINAL" clause).
// Admin can flip individual rows in the Compose modal — those edits
// arrive in `plan.refundable` as a length-installments boolean array.
function resolveRefundable(plan: PaymentPlan): boolean[] {
  if (plan.refundable && plan.refundable.length === plan.installments) {
    return plan.refundable;
  }
  return Array.from({ length: plan.installments }, () => false);
}

// Renders the payment schedule as a markdown bullet list — one row per
// installment with date + amount + the NON-REFUNDABLE flag (default)
// or no flag when the admin marked it refundable. Substituted into
// the contract via {{Payment.Schedule}}.
function describePaymentPlan(plan: PaymentPlan): string {
  const dates = resolveDueDates(plan);
  const amounts = resolveAmounts(plan);
  const refundable = resolveRefundable(plan);
  return dates
    .map((date, i) => {
      const amount = formatUsd(amounts[i]);
      const dateStr = formatDateLong(date);
      const refundFlag = refundable[i] ? '' : ' *(NON-REFUNDABLE)*';
      return `- **Installment ${i + 1}:** ${amount} due ${dateStr}${refundFlag}`;
    })
    .join('\n');
}

async function loadActiveTemplate() {
  const tpl = await prisma.contractTemplate.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!tpl) {
    throw new Error('No active ContractTemplate found. Seed one before sending documents.');
  }
  return tpl;
}

// Loads a specific template by id. Falls back to loadActiveTemplate
// when id is null/undefined so the auto-trigger on self-checkout
// keeps using the default active template.
async function loadTemplate(id?: string | null) {
  if (!id) return loadActiveTemplate();
  const tpl = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!tpl) {
    throw new Error(`ContractTemplate not found: ${id}`);
  }
  return tpl;
}

type CreateInput = {
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  userId?: string | null;
  courseId?: string | null;
  courseTitle: string;
  paymentTotalCents: number;
  paymentPlan?: PaymentPlan | null;
  notes?: string | null;
  origin: 'auto_self_checkout' | 'manual_admin';
  enrollmentTransactionId?: string | null;
  createdByUserId?: string | null;
  // When set, send using THIS specific template instead of whichever
  // is currently `active`. Used by the admin Compose modal's
  // template picker so admins can fire a non-active variant
  // without flipping the active flag.
  templateId?: string | null;
  // When set, also fire an SMS with the signing link via GHL after
  // the email send. Webhook auto-trigger passes the buyer's cached
  // GHL contact id so we don't have to upsert again at SMS time.
  // Compose-from-admin doesn't pass this (no contact yet) so the
  // SMS step is skipped silently.
  ghlContactId?: string | null;
};

// Builds the canonical token map for a recipient's enrollment doc.
// Shared between createAndSendDocument (the actual send) and the
// admin /preview endpoint so a preview always matches what gets
// rendered into the snapshotted renderedHtml on send.
function buildEnrollmentTokens(
  input: Pick<
    CreateInput,
    'recipientName' | 'recipientEmail' | 'courseTitle' | 'paymentTotalCents'
    | 'paymentPlan' | 'notes' | 'enrollmentTransactionId'
  >,
  now: Date,
): TokenValues {
  const { first, last } = splitName(input.recipientName);
  const plan = input.paymentPlan ?? null;
  const planAmounts = plan ? resolveAmounts(plan) : null;
  const planDates = plan ? resolveDueDates(plan) : null;

  // Initial = first installment's amount when on a plan; full total when paid in full.
  const initialCents = planAmounts ? planAmounts[0] : input.paymentTotalCents;
  // Remaining = sum of all installments after the first when on a plan; 0 when paid in full.
  const remainingCents = planAmounts
    ? planAmounts.slice(1).reduce((sum, n) => sum + n, 0)
    : 0;

  // Payment.Schedule is markdown when on a plan (renders as bullets in
  // the contract), short string when paid in full. Substitution
  // happens before markdown→HTML so multi-line markdown is fine.
  const scheduleNarrative = plan
    ? describePaymentPlan(plan)
    : `**Paid in full** on ${formatDateLong(now)} — **${formatUsd(input.paymentTotalCents)}** *(NON-REFUNDABLE)*`;
  return {
    ...STATIC_TOKEN_DEFAULTS,
    'Agreement.EffectiveDate': formatDateLong(now),
    'Customer.FullName': input.recipientName,
    'Customer.FirstName': first,
    'Customer.LastName': last,
    'Customer.Email': input.recipientEmail,
    'Course.Name': input.courseTitle,
    'Payment.Total': formatUsd(input.paymentTotalCents),
    'Payment.Initial': formatUsd(initialCents),
    'Payment.RemainingBalance': formatUsd(remainingCents),
    'Payment.Date': formatDateLong(now),
    'Payment.Schedule': scheduleNarrative,
    'Payment.NumberOfInstallments': plan?.installments ?? 1,
    'Payment.PerInstallmentAmount': formatUsd(initialCents),
    'Payment.FirstDueDate': planDates ? formatDateLong(planDates[0]) : formatDateLong(now),
    'Transaction.Id': input.enrollmentTransactionId ?? '',
    'Notes': input.notes ?? '',
    'Company.SignatureDate': formatDateLong(now),
  };
}

// Render-only entrypoint used by the admin preview endpoint. Same
// token-build pipeline as the live send, but doesn't touch the
// database — returns the HTML so the admin can eyeball the contract
// before they actually fire it.
export async function previewEnrollmentDocument(input: {
  recipientEmail: string;
  recipientName: string;
  courseTitle: string;
  paymentTotalCents: number;
  paymentPlan?: PaymentPlan | null;
  notes?: string | null;
  templateId?: string | null;
}): Promise<{ html: string; templateName: string }> {
  const tpl = await loadTemplate(input.templateId);
  const tokens = buildEnrollmentTokens(
    {
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      courseTitle: input.courseTitle,
      paymentTotalCents: input.paymentTotalCents,
      paymentPlan: input.paymentPlan ?? null,
      notes: input.notes ?? null,
      enrollmentTransactionId: null,
    },
    new Date(),
  );
  const md = renderMarkdown(tpl.body, tokens);
  const html = markdownToHtml(md);
  return { html, templateName: tpl.name };
}

async function createAndSendDocument(input: CreateInput): Promise<{ documentId: string }> {
  const tpl = await loadTemplate(input.templateId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const tokens = buildEnrollmentTokens(input, now);

  const renderedMarkdown = renderMarkdown(tpl.body, tokens);
  const renderedHtml = markdownToHtml(renderedMarkdown);
  const signingToken = generateSigningToken();

  const doc = await prisma.documentSignature.create({
    data: {
      userId: input.userId ?? null,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone ?? null,
      courseId: input.courseId ?? null,
      courseTitle: input.courseTitle,
      contractTemplateId: tpl.id,
      tokens: tokens as object,
      renderedHtml,
      renderedMarkdown,
      status: 'sent',
      origin: input.origin,
      signingToken,
      signingTokenExpiresAt: expiresAt,
      paymentTotalCents: input.paymentTotalCents,
      paymentPlan: input.paymentPlan
        ? (input.paymentPlan as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      notes: input.notes ?? null,
      auditEvents: [
        {
          type: 'sent',
          at: now.toISOString(),
          by: input.createdByUserId ?? 'system',
          origin: input.origin,
        },
      ] as object[],
      sentAt: now,
      createdByUserId: input.createdByUserId ?? null,
      enrollmentTransactionId: input.enrollmentTransactionId ?? null,
    },
  });

  const signingUrl = `${BASE_URL}/sign/${signingToken}`;

  // Fire the signing-request email. sendSigningRequestEmail uses the
  // safeSend wrapper which RETURNS { error } on failure rather than
  // throwing — so we have to inspect the result to detect Resend
  // rejections (suppression list, invalid recipient, rate limit, etc.)
  // and surface them in the audit trail. Without this check the doc
  // looks "sent" forever even when Resend silently rejected the email.
  let emailSent = false;
  try {
    const result = (await sendSigningRequestEmail({
      to: input.recipientEmail,
      recipientName: input.recipientName,
      courseTitle: input.courseTitle,
      signingUrl,
      expiresAt,
    })) as { error?: unknown } | undefined;
    if (result?.error) {
      console.error('[esign-flow] sendSigningRequestEmail returned error', {
        documentId: doc.id,
        error: result.error,
      });
      await prisma.documentSignature.update({
        where: { id: doc.id },
        data: {
          auditEvents: [
            ...((doc.auditEvents as unknown as object[]) ?? []),
            {
              type: 'send_failed',
              at: new Date().toISOString(),
              error: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
            },
          ] as object[],
        },
      });
    } else {
      emailSent = true;
    }
  } catch (err) {
    console.error('[esign-flow] sendSigningRequestEmail threw', { documentId: doc.id, err });
    await prisma.documentSignature.update({
      where: { id: doc.id },
      data: {
        auditEvents: [
          ...((doc.auditEvents as unknown as object[]) ?? []),
          { type: 'send_failed', at: new Date().toISOString(), error: String(err) },
        ] as object[],
      },
    });
  }
  void emailSent; // reserved for future "send_succeeded" audit if needed

  // SMS with the signing link. Resolves a GHL contact id from one of
  // three sources, in priority order:
  //   1. caller passed input.ghlContactId (webhook auto-trigger)
  //   2. input.userId → User.ghlContactId (admin Compose for an
  //      existing student)
  //   3. input.recipientPhone → upsert by phone (admin Compose for an
  //      off-list buyer with a phone). Done lazily inside sendGhlSmsByPhone.
  // Skipped silently when none of the above resolve.
  let smsContactId: string | null = input.ghlContactId ?? null;
  if (!smsContactId && input.userId) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { ghlContactId: true },
      });
      if (u?.ghlContactId) smsContactId = u.ghlContactId;
    } catch (err) {
      console.warn('[esign-flow] could not look up User.ghlContactId for SMS', { userId: input.userId, err });
    }
  }
  if (smsContactId) {
    try {
      const { sendGhlSms } = await import('@/lib/ghl');
      const firstName = splitName(input.recipientName).first || 'Hi';
      const smsBody =
        `${firstName}, your ${input.courseTitle} enrollment is confirmed. ` +
        `Please review and sign your agreement: ${signingUrl} ` +
        `– Todd / Maxxed Out`;
      await sendGhlSms(smsContactId, smsBody);
      console.log('[esign-flow] Signing-link SMS sent', { documentId: doc.id, contactId: smsContactId });
    } catch (err) {
      console.error('[esign-flow] Signing-link SMS failed (non-fatal)', { documentId: doc.id, err });
      try {
        await prisma.documentSignature.update({
          where: { id: doc.id },
          data: {
            auditEvents: [
              ...((doc.auditEvents as unknown as object[]) ?? []),
              { type: 'sms_failed', at: new Date().toISOString(), error: String(err) },
            ] as object[],
          },
        });
      } catch { /* audit-write failure is non-fatal */ }
    }
  } else if (input.recipientPhone) {
    // Off-list compose: no User row, no cached contactId, but a phone
    // was provided. Upsert a GHL contact and send via the same path
    // the lead-notify SMS uses (with stale-cache recovery built in).
    try {
      const { upsertGhlContactByPhone, sendGhlSms } = await import('@/lib/ghl');
      const upserted = await upsertGhlContactByPhone({
        phone: input.recipientPhone,
        email: input.recipientEmail,
        firstName: splitName(input.recipientName).first,
        lastName: splitName(input.recipientName).last,
      });
      if (upserted) {
        const firstName = splitName(input.recipientName).first || 'Hi';
        const smsBody =
          `${firstName}, your ${input.courseTitle} enrollment is confirmed. ` +
          `Please review and sign your agreement: ${signingUrl} ` +
          `– Todd / Maxxed Out`;
        await sendGhlSms(upserted, smsBody);
        console.log('[esign-flow] Signing-link SMS sent (upserted contact)', { documentId: doc.id, contactId: upserted });
      }
    } catch (err) {
      console.warn('[esign-flow] phone-only SMS upsert failed (non-fatal)', { documentId: doc.id, err });
    }
  }

  return { documentId: doc.id };
}

// Webhook entrypoint. Idempotent on (recipientEmail + courseId + transactionId).
export async function sendStandardEnrollmentDocument(input: {
  userId: string;
  email: string;
  name: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  paidCents: number;
  transactionId: string;
  // Optional — when present, esign-flow also sends an SMS with the
  // signing link via GHL. Webhook callers pass the buyer's cached
  // GHL contact id from earlier in the same handler. If null/missing,
  // only the email goes out.
  ghlContactId?: string | null;
}): Promise<{ documentId: string; status: 'created' | 'already_existed' }> {
  const existing = await prisma.documentSignature.findFirst({
    where: {
      recipientEmail: input.email,
      courseId: input.courseId,
      enrollmentTransactionId: input.transactionId,
    },
    select: { id: true },
  });
  if (existing) {
    return { documentId: existing.id, status: 'already_existed' };
  }

  const { documentId } = await createAndSendDocument({
    recipientEmail: input.email,
    recipientName: input.name,
    userId: input.userId,
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    paymentTotalCents: input.paidCents,
    paymentPlan: null,
    notes: null,
    origin: 'auto_self_checkout',
    enrollmentTransactionId: input.transactionId,
    createdByUserId: null,
    ghlContactId: input.ghlContactId ?? null,
  });
  return { documentId, status: 'created' };
}

// Admin Compose entrypoint. Allows custom payment plan + free-text notes,
// optional off-list (no userId / no courseId) sends, and an optional
// templateId so the admin can pick a non-active template variant
// (e.g. "VIP Coaching") without flipping the active flag.
export async function sendCustomEnrollmentDocument(input: {
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  userId?: string;
  courseId?: string;
  courseTitle: string;
  paymentTotalCents: number;
  paymentPlan?: PaymentPlan | null;
  notes?: string;
  templateId?: string;
  createdByUserId: string;
}): Promise<{ documentId: string }> {
  return createAndSendDocument({
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    userId: input.userId ?? null,
    courseId: input.courseId ?? null,
    courseTitle: input.courseTitle,
    templateId: input.templateId ?? null,
    paymentTotalCents: input.paymentTotalCents,
    paymentPlan: input.paymentPlan ?? null,
    notes: input.notes ?? null,
    origin: 'manual_admin',
    enrollmentTransactionId: null,
    createdByUserId: input.createdByUserId,
  });
}

export async function cancelDocument(
  documentId: string,
  byUserId: string,
  reason?: string,
): Promise<void> {
  const doc = await prisma.documentSignature.findUnique({
    where: { id: documentId },
    select: { auditEvents: true, status: true },
  });
  if (!doc) throw new Error(`DocumentSignature not found: ${documentId}`);
  if (doc.status === 'completed') {
    throw new Error('Cannot cancel a completed document');
  }
  if (doc.status === 'cancelled') return;

  const now = new Date();
  await prisma.documentSignature.update({
    where: { id: documentId },
    data: {
      status: 'cancelled',
      cancelledAt: now,
      signingToken: null,
      auditEvents: [
        ...((doc.auditEvents as unknown as object[]) ?? []),
        { type: 'cancelled', at: now.toISOString(), by: byUserId, reason: reason ?? null },
      ] as object[],
    },
  });
}

export async function resendDocument(documentId: string, byUserId: string): Promise<void> {
  const doc = await prisma.documentSignature.findUnique({
    where: { id: documentId },
  });
  if (!doc) throw new Error(`DocumentSignature not found: ${documentId}`);
  if (doc.status === 'completed' || doc.status === 'cancelled' || doc.status === 'declined') {
    throw new Error(`Cannot resend a ${doc.status} document`);
  }

  const now = new Date();
  const newToken = generateSigningToken();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.documentSignature.update({
    where: { id: documentId },
    data: {
      signingToken: newToken,
      signingTokenExpiresAt: expiresAt,
      status: 'sent',
      auditEvents: [
        ...((doc.auditEvents as unknown as object[]) ?? []),
        { type: 'resent', at: now.toISOString(), by: byUserId },
      ] as object[],
    },
  });

  await sendSigningRequestEmail({
    to: doc.recipientEmail,
    recipientName: doc.recipientName ?? '',
    courseTitle: doc.courseTitle,
    signingUrl: `${BASE_URL}/sign/${newToken}`,
    expiresAt,
  });
}
