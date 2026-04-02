import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = await prisma.paymentProvider.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(providers);
}

export async function PUT(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, enabled, isDefault, config } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
  }

  // If setting as default, ensure it's also enabled
  if (isDefault && enabled === false) {
    return NextResponse.json({ error: 'Cannot set disabled provider as default' }, { status: 400 });
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.paymentProvider.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.paymentProvider.update({
    where: { id },
    data: {
      ...(enabled !== undefined && { enabled }),
      ...(isDefault !== undefined && { isDefault }),
      ...(config !== undefined && { config }),
    },
  });

  return NextResponse.json(updated);
}
