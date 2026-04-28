import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) return null;
  return session;
}

// PUT — update title / description / iconName / iconColor / published
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if ('description' in body) data.description = body.description ?? null;
  if (typeof body.iconName === 'string') data.iconName = body.iconName;
  if ('iconColor' in body) data.iconColor = body.iconColor ?? null;
  if (typeof body.published === 'boolean') data.published = body.published;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  try {
    const section = await prisma.homepageSection.update({ where: { id }, data });
    return NextResponse.json({ section });
  } catch {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }
}

// DELETE — drop a section. Courses with this homepageSectionId fall back to
// null (handled by `onDelete: SetNull` in the schema), so they just stop
// appearing on / and /courses. Reassign them to keep them visible.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await prisma.homepageSection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }
}
