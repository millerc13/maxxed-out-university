import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendCustomEnrollmentDocument } from '@/lib/esign-flow';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

// POST — admin composes and sends a custom enrollment document.
// Used for off-list deals, payment plans, and any case where the
// auto-trigger from a self-checkout success isn't the right fit.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : '';
  const courseTitle = typeof body.courseTitle === 'string' ? body.courseTitle.trim() : '';
  const paymentTotalCents = Number.isFinite(body.paymentTotalCents) ? Math.round(body.paymentTotalCents) : NaN;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'Valid recipient email required' }, { status: 400 });
  }
  if (!recipientName) {
    return NextResponse.json({ error: 'Recipient name required' }, { status: 400 });
  }
  if (!courseTitle) {
    return NextResponse.json({ error: 'Course title required' }, { status: 400 });
  }
  if (!Number.isFinite(paymentTotalCents) || paymentTotalCents < 0) {
    return NextResponse.json({ error: 'Valid payment total required' }, { status: 400 });
  }

  // Optional payment plan — validated only when present.
  let paymentPlan: { installments: number; perInstallmentCents: number; frequency: 'monthly' | 'quarterly'; firstDueAt: string } | null = null;
  if (body.paymentPlan && typeof body.paymentPlan === 'object') {
    const p = body.paymentPlan;
    const installments = Number(p.installments);
    const perInstallmentCents = Number(p.perInstallmentCents);
    const frequency = p.frequency === 'quarterly' ? 'quarterly' : 'monthly';
    const firstDueAt = typeof p.firstDueAt === 'string' ? p.firstDueAt : '';
    if (
      Number.isFinite(installments) && installments >= 2 &&
      Number.isFinite(perInstallmentCents) && perInstallmentCents > 0 &&
      firstDueAt
    ) {
      paymentPlan = { installments, perInstallmentCents, frequency, firstDueAt };
    }
  }

  try {
    const result = await sendCustomEnrollmentDocument({
      recipientEmail,
      recipientName,
      recipientPhone: typeof body.recipientPhone === 'string' ? body.recipientPhone : undefined,
      userId: typeof body.userId === 'string' ? body.userId : undefined,
      courseId: typeof body.courseId === 'string' ? body.courseId : undefined,
      courseTitle,
      paymentTotalCents,
      paymentPlan,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      createdByUserId: session.user.id,
    });
    return NextResponse.json({ ok: true, documentId: result.documentId });
  } catch (err) {
    console.error('[POST /api/admin/documents] failed', err);
    const msg = err instanceof Error ? err.message : 'Failed to send document';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
