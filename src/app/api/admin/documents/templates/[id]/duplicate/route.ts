import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractTokens } from '@/lib/esign-tokens';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

// POST /api/admin/documents/templates/[id]/duplicate — clone an
// existing template into a new (inactive) row. The new template
// is named "<original> (copy)" and ready to be edited.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const src = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!src) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const created = await prisma.contractTemplate.create({
    data: {
      name: `${src.name} (copy)`,
      body: src.body,
      tokens: extractTokens(src.body),
      active: false,
      lastEditedById: session.user.id,
    },
  });
  return NextResponse.json({ template: created });
}
