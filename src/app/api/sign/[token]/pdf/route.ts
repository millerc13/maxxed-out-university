import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyDownloadToken } from '@/lib/esign-tokens';
import { getOrGenerateDocumentPdfKey, readPdfFromR2 } from '@/lib/esign-pdf';

// chromium-min cold start may exceed default 60s function timeout —
// see admin pdf route for context.
export const runtime = 'nodejs';
export const maxDuration = 120;

// GET /api/sign/[token]/pdf — post-sign download for the recipient.
//
// Auth model: the [token] here is NOT the original signingToken
// (that gets revoked on sign). It's a 24-hour HMAC-signed token
// minted by POST /api/sign/[token] over the documentId. Anyone with
// the URL can download — but the URL is only handed to the recipient
// in the success response and expires in a day.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const verified = verifyDownloadToken(token);
  if (!verified) {
    return NextResponse.json(
      { error: 'Download link expired or invalid' },
      { status: 401 },
    );
  }

  const doc = await prisma.documentSignature.findUnique({
    where: { id: verified.documentId },
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
    const key = await getOrGenerateDocumentPdfKey(doc.id);
    const pdf = await readPdfFromR2(key);
    const safeName = (doc.recipientName ?? 'recipient')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase();
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
    console.error('[GET /api/sign/[token]/pdf] failed', err);
    const msg = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
