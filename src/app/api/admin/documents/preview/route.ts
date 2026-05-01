import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { previewEnrollmentDocument } from '@/lib/esign-flow';

// POST /api/admin/documents/preview — admin-only.
// Same payload shape as POST /api/admin/documents, but returns the
// rendered HTML instead of persisting a row + sending an email. Lets
// the Compose modal show the admin exactly what the recipient will
// see before they fire the send.
export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : '';
  const courseTitle = typeof body.courseTitle === 'string' ? body.courseTitle.trim() : '';
  const paymentTotalCents = Number(body.paymentTotalCents);
  if (!recipientEmail || !recipientName || !courseTitle || !Number.isFinite(paymentTotalCents)) {
    return NextResponse.json(
      { error: 'Recipient name, email, course title, and payment total are required.' },
      { status: 400 },
    );
  }

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
    const { html, templateName } = await previewEnrollmentDocument({
      recipientEmail,
      recipientName,
      courseTitle,
      paymentTotalCents,
      paymentPlan,
      notes: typeof body.notes === 'string' ? body.notes : null,
      templateId: typeof body.templateId === 'string' ? body.templateId : null,
    });
    return NextResponse.json({ html, templateName });
  } catch (err) {
    console.error('[POST /api/admin/documents/preview] failed', err);
    const msg = err instanceof Error ? err.message : 'Preview failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
