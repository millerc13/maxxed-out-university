import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) return null;
  return session;
}

// PUT — body: { ids: string[] } in the new top-to-bottom order. Each
// section gets its `order` set to its index in the list. Wrapped in a
// transaction so partial failures don't leave the page in a broken state.
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'ids must be an array of strings' }, { status: 400 });
  }

  await prisma.$transaction(
    (ids as string[]).map((id, index) =>
      prisma.homepageSection.update({ where: { id }, data: { order: index } })
    )
  );
  return NextResponse.json({ ok: true });
}
