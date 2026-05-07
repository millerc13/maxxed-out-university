import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET() {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const sessions = await prisma.salesTrackerSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { entries: true } },
    },
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'Name too long' }, { status: 400 });
  }

  const created = await prisma.salesTrackerSession.create({
    data: { name },
  });

  return NextResponse.json({ session: created }, { status: 201 });
}
