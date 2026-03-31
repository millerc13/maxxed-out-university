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

  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      courses: { select: { id: true, title: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json(codes);
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { code, description, discountType, discountValue, maxUses, expiresAt, applyToAll, courseIds } = body;

  if (!code || !discountType || discountValue === undefined) {
    return NextResponse.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
  }

  if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
    return NextResponse.json({ error: 'discountType must be PERCENTAGE or FIXED' }, { status: 400 });
  }

  if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 100)) {
    return NextResponse.json({ error: 'Percentage must be 1–100' }, { status: 400 });
  }

  const existing = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (existing) {
    return NextResponse.json({ error: 'A promo code with that name already exists' }, { status: 409 });
  }

  const promo = await prisma.promoCode.create({
    data: {
      code: code.toUpperCase().trim(),
      description: description ?? null,
      discountType,
      discountValue,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      applyToAll: applyToAll ?? true,
      courses: !applyToAll && courseIds?.length
        ? { connect: courseIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: {
      courses: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(promo, { status: 201 });
}
