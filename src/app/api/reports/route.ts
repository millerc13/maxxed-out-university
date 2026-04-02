import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_REPORTS = 10;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const toolSlug = request.nextUrl.searchParams.get('toolSlug');

  const reports = await prisma.savedReport.findMany({
    where: {
      userId: session.user.id,
      ...(toolSlug ? { toolSlug } : {}),
    },
    select: {
      id: true,
      name: true,
      toolSlug: true,
      results: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, toolSlug, inputs, results } = body;

  if (!name || !toolSlug || !inputs || !results) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Enforce global 10-report limit
  const count = await prisma.savedReport.count({
    where: { userId: session.user.id },
  });

  if (count >= MAX_REPORTS) {
    return NextResponse.json(
      { error: 'Report limit reached. Delete an existing report to save a new one.', limit: MAX_REPORTS, current: count },
      { status: 400 },
    );
  }

  const report = await prisma.savedReport.create({
    data: {
      name: String(name).slice(0, 100),
      toolSlug: String(toolSlug),
      inputs,
      results,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
