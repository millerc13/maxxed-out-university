import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Bulk operations across multiple entries. Body:
 *   { ids: string[], op: 'delete' | 'paid' | 'unpaid' | 'move', tag?: string | null }
 *
 * Used by the editor's selection action bar to mark many entries as
 * paid, move them to a different section, or delete them in one shot.
 * No per-entry session check — the IDs are trusted because the only
 * caller is the admin editor and IDs are unguessable cuids; a bad ID
 * just won't match anything.
 */
export async function POST(request: NextRequest) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    !body.ids.every((x: unknown) => typeof x === 'string')
  ) {
    return NextResponse.json(
      { error: '`ids` must be a non-empty string array' },
      { status: 400 }
    );
  }
  const ids: string[] = body.ids;
  const op = body.op;

  let result;
  switch (op) {
    case 'delete':
      result = await prisma.salesTrackerEntry.deleteMany({
        where: { id: { in: ids } },
      });
      break;
    case 'paid':
      result = await prisma.salesTrackerEntry.updateMany({
        where: { id: { in: ids } },
        data: { commissionPaid: true },
      });
      break;
    case 'unpaid':
      result = await prisma.salesTrackerEntry.updateMany({
        where: { id: { in: ids } },
        data: { commissionPaid: false },
      });
      break;
    case 'move': {
      const tag =
        body.tag === null
          ? null
          : typeof body.tag === 'string' && body.tag.trim()
          ? body.tag.trim()
          : undefined;
      if (tag === undefined) {
        return NextResponse.json(
          { error: '`tag` (string or null) required for move' },
          { status: 400 }
        );
      }
      result = await prisma.salesTrackerEntry.updateMany({
        where: { id: { in: ids } },
        data: { tag },
      });
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
  }

  return NextResponse.json({ count: result.count });
}
