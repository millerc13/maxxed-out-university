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
};

function describePaymentPlan(plan: PaymentPlan): string {
  const each = formatUsd(plan.perInstallmentCents);
  const start = formatDateLong(new Date(plan.firstDueAt));
  return `${plan.installments} ${plan.frequency} installments of ${each} starting ${start}`;
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
  const initialCents = input.paymentPlan
    ? input.paymentPlan.perInstallmentCents
    : input.paymentTotalCents;
  const remainingCents = input.paymentPlan
    ? Math.max(0, input.paymentTotalCents - input.paymentPlan.perInstallmentCents)
    : 0;
  const scheduleNarrative = input.paymentPlan
    ? describePaymentPlan(input.paymentPlan)
    : 'Paid in full';
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
    'Payment.NumberOfInstallments': input.paymentPlan?.installments ?? 1,
    'Payment.PerInstallmentAmount': formatUsd(initialCents),
    'Payment.FirstDueDate': input.paymentPlan
      ? formatDateLong(new Date(input.paymentPlan.firstDueAt))
      : formatDateLong(now),
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

  // Fire the signing-request email. Don't swallow errors silently — let the
  // caller decide whether to retry. But we also don't want a resend failure
  // to leave the row uncreated, so creation happens first.
  try {
    await sendSigningRequestEmail({
      to: input.recipientEmail,
      recipientName: input.recipientName,
      courseTitle: input.courseTitle,
      signingUrl: `${BASE_URL}/sign/${signingToken}`,
      expiresAt,
    });
  } catch (err) {
    console.error('[esign-flow] sendSigningRequestEmail failed', { documentId: doc.id, err });
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
