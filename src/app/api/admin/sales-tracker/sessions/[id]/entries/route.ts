import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
  });
  if (!sessionRow) return notFound();

  const entries = await prisma.salesTrackerEntry.findMany({
    where: { sessionId: id },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  // Decimal isn't a plain object — serialize for the client.
  const serialized = entries.map((e) => ({
    ...e,
    commissionRate: e.commissionRate ? Number(e.commissionRate) : null,
  }));

  return NextResponse.json({ session: sessionRow, entries: serialized });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!sessionRow) return notFound();

  // Optional starting tag — used by "+ Add to section" buttons in the
  // editor so the new row lands inside the section the user clicked.
  const body = await request.json().catch(() => null);
  const tag =
    body && typeof body.tag === 'string' && body.tag.trim()
      ? body.tag.trim()
      : null;

  // New row goes to the bottom. Use `count` rather than max(position)+1 so
  // we don't have to deal with NULL positions on a fresh session.
  const count = await prisma.salesTrackerEntry.count({
    where: { sessionId: id },
  });

  const created = await prisma.salesTrackerEntry.create({
    data: {
      sessionId: id,
      position: count,
      tag,
      commissionRate: 0.1, // Sensible default; she can edit per row.
    },
  });

  return NextResponse.json(
    {
      entry: {
        ...created,
        commissionRate: created.commissionRate
          ? Number(created.commissionRate)
          : null,
      },
    },
    { status: 201 }
  );
}
