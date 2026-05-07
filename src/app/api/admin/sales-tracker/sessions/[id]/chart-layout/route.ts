import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';
import {
  ALL_SLOTS,
  isValidIdForSlot,
  type Slot,
} from '@/components/admin/sales-tracker/chart-config';

const VALID_SLOTS = new Set<string>(ALL_SLOTS);

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Set or clear the chart in a single slot. Body shape:
 *   { slot: ChartSlot, chartId: string | null, reset?: false }
 *   { reset: true } — clear every slot back to defaults
 *
 * Returns the updated `chartLayout` so the client can replace state
 * without a re-fetch.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    slot?: string;
    chartId?: string | null;
    reset?: boolean;
  } | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
    select: { id: true, chartLayout: true },
  });
  if (!sessionRow) return notFound();

  // Reset all → empty object (defaults are applied client-side).
  if (body.reset === true) {
    await prisma.salesTrackerSession.update({
      where: { id },
      data: { chartLayout: {} },
    });
    return NextResponse.json({ chartLayout: {} });
  }

  if (!body.slot || !VALID_SLOTS.has(body.slot)) {
    return NextResponse.json({ error: 'Invalid `slot`' }, { status: 400 });
  }
  const slot = body.slot as Slot;

  if (
    body.chartId !== null &&
    (typeof body.chartId !== 'string' || !isValidIdForSlot(slot, body.chartId))
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid `chartId` for this slot (KPI slots accept KPI ids, chart slots accept chart ids).',
      },
      { status: 400 }
    );
  }

  const existing =
    typeof sessionRow.chartLayout === 'object' &&
    sessionRow.chartLayout !== null &&
    !Array.isArray(sessionRow.chartLayout)
      ? { ...(sessionRow.chartLayout as Record<string, string>) }
      : {};

  if (body.chartId === null) {
    delete existing[slot];
  } else {
    existing[slot] = body.chartId;
  }

  await prisma.salesTrackerSession.update({
    where: { id },
    data: { chartLayout: existing },
  });

  return NextResponse.json({ chartLayout: existing });
}
