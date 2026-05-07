import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'Name too long' }, { status: 400 });
  }

  try {
    const updated = await prisma.salesTrackerSession.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json({ session: updated });
  } catch {
    return notFound();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  // Confirmation: require the typed name to match the stored one. This
  // happens server-side too — never trust the client's modal alone.
  const url = new URL(request.url);
  const confirmName = url.searchParams.get('confirm');

  const existing = await prisma.salesTrackerSession.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!existing) return notFound();

  if (!confirmName || confirmName !== existing.name) {
    return NextResponse.json(
      { error: 'Confirmation name does not match' },
      { status: 400 }
    );
  }

  await prisma.salesTrackerSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
