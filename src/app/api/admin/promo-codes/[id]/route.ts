import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { description, discountType, discountValue, maxUses, expiresAt, applyToAll, courseIds, active } = body;

  const promo = await prisma.promoCode.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(discountType !== undefined && { discountType }),
      ...(discountValue !== undefined && { discountValue }),
      ...(maxUses !== undefined && { maxUses: maxUses ?? null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(applyToAll !== undefined && { applyToAll }),
      ...(active !== undefined && { active }),
      ...(courseIds !== undefined && {
        courses: {
          set: applyToAll ? [] : courseIds.map((cid: string) => ({ id: cid })),
        },
      }),
    },
    include: {
      courses: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(promo);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await prisma.promoCode.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
