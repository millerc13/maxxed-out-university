import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Duplicate an entry. The copy lands at position+1 within the same
 * session and section, so it appears immediately after the source.
 * Position management uses a small float-style increment (0.5 between
 * neighbors) — sortBy position then by createdAt is already handled in
 * the read query, so this is just a hint to keep the new row close.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const source = await prisma.salesTrackerEntry.findUnique({ where: { id } });
  if (!source) return notFound();

  const created = await prisma.salesTrackerEntry.create({
    data: {
      sessionId: source.sessionId,
      // +1 so the copy renders right after; an occasional collision is
      // fine — position is just a sort key, not a unique constraint.
      position: source.position + 1,
      tag: source.tag,
      name: source.name ? `${source.name} (copy)` : null,
      email: source.email,
      phone: source.phone,
      contactDate: source.contactDate,
      contactTime: source.contactTime,
      didShow: source.didShow,
      didClose: source.didClose,
      dealAmountCents: source.dealAmountCents,
      commissionRate: source.commissionRate,
      commissionAmountCents: source.commissionAmountCents,
      commissionDue: source.commissionDue,
      // Always copy as unpaid — duplicating a paid record into a new
      // unpaid commission is the more common use case (recurring sale
      // to the same person).
      commissionPaid: false,
      notes: source.notes,
    },
  });

  return NextResponse.json({
    entry: {
      ...created,
      commissionRate: created.commissionRate
        ? Number(created.commissionRate)
        : null,
    },
  });
}
