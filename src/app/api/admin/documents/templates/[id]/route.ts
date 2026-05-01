import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractTokens } from '@/lib/esign-tokens';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') return null;
  return session;
}

// GET /api/admin/documents/templates/[id] — fetch a single template.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const template = await prisma.contractTemplate.findUnique({
    where: { id },
    include: { _count: { select: { signatures: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ template });
}

// PUT /api/admin/documents/templates/[id] — update name or body. Token
// list is auto-derived from the body so admins don't have to manage it.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const data: Prisma.ContractTemplateUpdateInput = {
    lastEditedById: session.user.id,
  };
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    data.name = trimmed;
  }
  if (typeof body.body === 'string') {
    if (body.body.trim().length < 100) {
      return NextResponse.json({ error: 'Template body looks too short' }, { status: 400 });
    }
    data.body = body.body;
    data.tokens = extractTokens(body.body) as Prisma.InputJsonValue;
  }
  try {
    const updated = await prisma.contractTemplate.update({ where: { id }, data });
    return NextResponse.json({ template: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw err;
  }
}

// DELETE /api/admin/documents/templates/[id] — block if currently active
// or if any signatures reference it (we'd lose the link).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const template = await prisma.contractTemplate.findUnique({
    where: { id },
    include: { _count: { select: { signatures: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (template.active) {
    return NextResponse.json(
      { error: 'Cannot delete the active template. Activate a different one first.' },
      { status: 409 },
    );
  }
  if (template._count.signatures > 0) {
    return NextResponse.json(
      {
        error:
          'Cannot delete a template that has been used to send documents. ' +
          'Duplicate it instead and mark this one inactive.',
      },
      { status: 409 },
    );
  }
  await prisma.contractTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
