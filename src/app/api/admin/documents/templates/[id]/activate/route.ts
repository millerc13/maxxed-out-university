import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

// POST /api/admin/documents/templates/[id]/activate — mark this
// template as the active one. Deactivates any previously-active row
// in the same transaction so we never end up with two active rows.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const exists = await prisma.contractTemplate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const [, updated] = await prisma.$transaction([
    prisma.contractTemplate.updateMany({
      where: { active: true, NOT: { id } },
      data: { active: false },
    }),
    prisma.contractTemplate.update({
      where: { id },
      data: { active: true, lastEditedById: session.user.id },
    }),
  ]);
  return NextResponse.json({ template: updated });
}
