import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';
import { renderSalesTrackerPdf } from '@/lib/sales-tracker-pdf';

// Puppeteer + chromium-min cold-start can be slow. Match the timeout we
// use for the esign PDF route so the function doesn't kill itself
// mid-render on Vercel.
export const maxDuration = 60;

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

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

  let pdf: Buffer;
  try {
    pdf = await renderSalesTrackerPdf(sessionRow, entries);
  } catch (err) {
    console.error('[sales-tracker-pdf] render failed', err);
    return NextResponse.json(
      { error: 'PDF generation failed' },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const safeName = sessionRow.name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const filename = `${safeName || 'session'}-report-${today}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
