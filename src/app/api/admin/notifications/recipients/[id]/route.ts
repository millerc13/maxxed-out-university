import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizePhoneE164 } from '@/lib/sms';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

// PUT — update label / phone / toggles
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.phone !== undefined) {
    const normalized = normalizePhoneE164(body.phone);
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }
    // Phone changed → invalidate cached GHL contactId so the next send
    // re-resolves against the new number.
    data.phone = normalized;
    data.ghlContactId = null;
  }
  if ('label' in body) data.label = body.label?.toString().trim() || null;
  if (typeof body.notifyOnLead === 'boolean') data.notifyOnLead = body.notifyOnLead;
  if (typeof body.notifyOnSale === 'boolean') data.notifyOnSale = body.notifyOnSale;
  if (typeof body.active === 'boolean') data.active = body.active;
  if (Array.isArray(body.sources)) {
    data.sources = body.sources
      .filter((s: unknown) => typeof s === 'string' && s.trim() !== '')
      .map((s: string) => s.trim());
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  try {
    const recipient = await prisma.notificationRecipient.update({
      where: { id },
      data,
    });
    return NextResponse.json({ recipient });
  } catch {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }
}

// DELETE
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await prisma.notificationRecipient.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }
}
