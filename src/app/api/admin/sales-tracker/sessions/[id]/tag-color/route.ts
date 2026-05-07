import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

const VALID_COLORS = new Set([
  'rose',
  'orange',
  'amber',
  'yellow',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'pink',
]);

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Set or clear an explicit color for a tag in this session.
 * Body: { tag: string, color: string | null }
 *   color === null  → revert to Auto (delete the entry from tagColors)
 *   color === 'rose' (etc) → set explicit
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.tag !== 'string' || !body.tag.trim()) {
    return NextResponse.json({ error: '`tag` is required' }, { status: 400 });
  }
  const color = body.color;
  if (color !== null && (typeof color !== 'string' || !VALID_COLORS.has(color))) {
    return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
  }

  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
    select: { id: true, tagColors: true },
  });
  if (!sessionRow) return notFound();

  // tagColors is JSON in Prisma — coerce to a plain object so we can
  // mutate. Unknown keys are dropped (no schema enforcement at the row
  // level — tags can come and go freely).
  const next: Record<string, string> =
    typeof sessionRow.tagColors === 'object' &&
    sessionRow.tagColors !== null &&
    !Array.isArray(sessionRow.tagColors)
      ? { ...(sessionRow.tagColors as Record<string, string>) }
      : {};

  if (color === null) {
    delete next[body.tag];
  } else {
    next[body.tag] = color;
  }

  await prisma.salesTrackerSession.update({
    where: { id },
    data: { tagColors: next },
  });

  return NextResponse.json({ tagColors: next });
}
