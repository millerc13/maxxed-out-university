import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// CSV export for a single session. Streams a small response (a few
// hundred rows max in practice) so it doesn't need streaming infra.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
  });
  if (!sessionRow) return notFound();

  const entries = await prisma.salesTrackerEntry.findMany({
    where: { sessionId: id },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  const headers = [
    'Section',
    'Name',
    'Email',
    'Phone',
    'Date',
    'Time',
    'Showed?',
    'Closed?',
    'Deal Amount',
    'Commission %',
    'My Commission',
    'Pay Date',
    'Got Paid?',
    'Notes',
  ];

  const rows = entries.map((e) => {
    const dealCents = e.dealAmountCents ?? 0;
    const rate = e.commissionRate ? Number(e.commissionRate) : 0;
    const auto = Math.round(dealCents * rate);
    const commCents = e.commissionAmountCents ?? auto;
    return [
      e.tag ?? '',
      e.name ?? '',
      e.email ?? '',
      e.phone ?? '',
      e.contactDate ? e.contactDate.toISOString().slice(0, 10) : '',
      e.contactTime ?? '',
      e.didShow ?? '',
      e.didClose ?? '',
      e.dealAmountCents != null ? (e.dealAmountCents / 100).toFixed(2) : '',
      e.commissionRate != null ? (Number(e.commissionRate) * 100).toFixed(2) + '%' : '',
      e.dealAmountCents != null && e.commissionRate != null
        ? (commCents / 100).toFixed(2)
        : '',
      e.commissionDue ? e.commissionDue.toISOString().slice(0, 10) : '',
      e.commissionPaid ? 'Yes' : 'No',
      e.notes ?? '',
    ];
  });

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          // Quote any cell with a comma, quote, or newline. Double up
          // embedded quotes per RFC 4180.
          if (/[",\n\r]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(',')
    )
    .join('\r\n');

  // Date-stamped filename so re-exports don't overwrite each other.
  const today = new Date().toISOString().slice(0, 10);
  const safeName = sessionRow.name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const filename = `${safeName || 'session'}-${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
