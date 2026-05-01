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

// GET — returns the active ContractTemplate (or null if none seeded).
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const template = await prisma.contractTemplate.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ template });
}

// PUT — update the active template. Token list is auto-derived from the
// body so admins don't have to maintain it manually.
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const data: Prisma.ContractTemplateUpdateInput = {
    lastEditedById: session.user.id,
  };
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    data.name = trimmed;
  }
  if (typeof body.body === 'string') {
    if (body.body.trim().length < 100) {
      return NextResponse.json({ error: 'Template body looks too short' }, { status: 400 });
    }
    data.body = body.body;
    data.tokens = extractTokens(body.body) as Prisma.InputJsonValue;
  }

  const active = await prisma.contractTemplate.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!active) {
    return NextResponse.json({ error: 'No active template — POST to create one' }, { status: 404 });
  }
  const updated = await prisma.contractTemplate.update({
    where: { id: active.id },
    data,
  });
  return NextResponse.json({ template: updated });
}

// POST — create a new active template, deactivating any previous active row.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  if (typeof body.body !== 'string' || body.body.trim().length < 100) {
    return NextResponse.json({ error: 'Template body required' }, { status: 400 });
  }

  await prisma.contractTemplate.updateMany({
    where: { active: true },
    data: { active: false },
  });
  const created = await prisma.contractTemplate.create({
    data: {
      name: body.name.trim(),
      body: body.body,
      tokens: extractTokens(body.body),
      active: true,
      lastEditedById: session.user.id,
    },
  });
  return NextResponse.json({ template: created });
}
