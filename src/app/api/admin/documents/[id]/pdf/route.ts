import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrGenerateDocumentPdfKey, readPdfFromR2 } from '@/lib/esign-pdf';

// Streams the signed PDF for an admin. Lazily renders + caches in R2 on
// first call, streams from cache thereafter. Only available for
// completed documents (we don't generate "draft" PDFs).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 });
  }

  const doc = await prisma.documentSignature.findUnique({
    where: { id },
    select: { id: true, status: true, recipientName: true, courseTitle: true },
  });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (doc.status !== 'completed') {
    return NextResponse.json(
      { error: `PDF only available for completed documents (current: ${doc.status})` },
      { status: 409 },
    );
  }

  try {
    const key = await getOrGenerateDocumentPdfKey(id);
    const pdf = await readPdfFromR2(key);
    const safeName = (doc.recipientName ?? 'recipient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const safeCourse = doc.courseTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const filename = `${safeCourse || 'agreement'}-${safeName || 'signed'}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/documents/[id]/pdf] failed', err);
    const msg = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
