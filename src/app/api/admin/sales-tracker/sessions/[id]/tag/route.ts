import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Bulk-update the `tag` value for every entry in a session whose tag
 * currently equals `from`. Used by the editor's section header to
 * rename a section ({from: "MIAMI", to: "Miami"}) or delete a section
 * ({from: "MIAMI", to: null}, which moves entries to uncategorized).
 *
 * Body: { from: string | null, to: string | null }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const from =
    body.from === null ? null : typeof body.from === 'string' ? body.from : undefined;
  const to =
    body.to === null
      ? null
      : typeof body.to === 'string'
      ? body.to.trim() || null
      : undefined;

  if (from === undefined || to === undefined) {
    return NextResponse.json(
      { error: '`from` and `to` are required (string or null)' },
      { status: 400 }
    );
  }

  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!sessionRow) return notFound();

  const result = await prisma.salesTrackerEntry.updateMany({
    where: { sessionId: id, tag: from },
    data: { tag: to },
  });

  return NextResponse.json({ updated: result.count });
}
