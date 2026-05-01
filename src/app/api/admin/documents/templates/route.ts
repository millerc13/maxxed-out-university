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

// GET /api/admin/documents/templates — list every template, newest
// edited first. The list page uses this for the table.
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      active: true,
      tokens: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { signatures: true } },
    },
  });
  return NextResponse.json({ templates });
}

// POST /api/admin/documents/templates — create a new template (NOT
// active by default — the admin explicitly activates from the list).
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const md = typeof body.body === 'string' ? body.body : '';
  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  if (md.trim().length < 100) {
    return NextResponse.json({ error: 'Template body looks too short' }, { status: 400 });
  }
  const created = await prisma.contractTemplate.create({
    data: {
      name,
      body: md,
      tokens: extractTokens(md),
      active: false,
      lastEditedById: session.user.id,
    },
  });
  return NextResponse.json({ template: created });
}
