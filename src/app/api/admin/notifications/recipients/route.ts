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

// GET — list all recipients (admin-only)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recipients = await prisma.notificationRecipient.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ recipients });
}

// POST — create a new recipient
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const phone = normalizePhoneE164(body.phone);
  if (!phone) {
    return NextResponse.json(
      { error: 'A valid phone number is required' },
      { status: 400 }
    );
  }

  const sources = Array.isArray(body.sources)
    ? body.sources
        .filter((s: unknown) => typeof s === 'string' && s.trim() !== '')
        .map((s: string) => s.trim())
    : [];

  const recipient = await prisma.notificationRecipient.create({
    data: {
      phone,
      label: body.label?.toString().trim() || null,
      notifyOnLead: body.notifyOnLead ?? true,
      notifyOnSale: body.notifyOnSale ?? true,
      active: body.active ?? true,
      sources,
    },
  });
  return NextResponse.json({ recipient });
}
