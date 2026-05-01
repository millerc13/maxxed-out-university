import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  computeSignatureHash,
  signDownloadToken,
  type TokenValues,
} from '@/lib/esign-tokens';
import {
  sendSigningCompletedEmail,
  sendAdminSigningNotification,
} from '@/lib/esign-email';
import { getOrGenerateDocumentPdfKey } from '@/lib/esign-pdf';

interface PostBody {
  typedName?: unknown;
  screenW?: unknown;
  screenH?: unknown;
  tz?: unknown;
}

// POST /api/sign/[token] — completes a signature.
//
// Auth model: the token in the URL IS the credential. It's a 32-byte
// random hex string that's set on send and cleared on complete, so a
// successful submit is the only thing that revokes it. After this
// returns ok, the URL becomes useless and can't be reused.
//
// We:
//   1. Look up the row by signingToken (and validate state)
//   2. Compute the SHA-256 signatureHash over the canonical payload
//      (renderedHtml + tokens + signedName + signedAt + IP) so the
//      record is tamper-evident
//   3. Mark status=completed, capture device + IP + UA snapshot,
//      append a 'signed' audit event, clear signingToken
//   4. Fire-and-forget the recipient + admin emails and trigger
//      lazy PDF generation (don't block the response on either)
//   5. Return a short-lived HMAC-signed download token so the
//      success page can offer "Download a copy" without re-using
//      the now-revoked sign token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const typedName = typeof body.typedName === 'string' ? body.typedName.trim() : '';
  if (typedName.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Please type your full legal name.' },
      { status: 400 },
    );
  }

  const screenW = typeof body.screenW === 'number' ? Math.round(body.screenW) : null;
  const screenH = typeof body.screenH === 'number' ? Math.round(body.screenH) : null;
  const tz = typeof body.tz === 'string' ? body.tz : null;

  const ip =
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '';
  const ua = request.headers.get('user-agent') ?? '';

  const doc = await prisma.documentSignature.findUnique({
    where: { signingToken: token },
    select: {
      id: true,
      status: true,
      recipientEmail: true,
      recipientName: true,
      courseTitle: true,
      renderedHtml: true,
      tokens: true,
      signingTokenExpiresAt: true,
      auditEvents: true,
    },
  });

  if (!doc) {
    return NextResponse.json(
      { ok: false, error: 'This signing link is no longer valid.' },
      { status: 404 },
    );
  }
  if (doc.status === 'completed') {
    return NextResponse.json(
      { ok: false, error: 'This document has already been signed.' },
      { status: 409 },
    );
  }
  if (doc.status !== 'sent' && doc.status !== 'viewed') {
    return NextResponse.json(
      { ok: false, error: 'This document is not in a signable state.' },
      { status: 409 },
    );
  }
  if (doc.signingTokenExpiresAt && doc.signingTokenExpiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, error: 'This signing link has expired.' },
      { status: 410 },
    );
  }

  const signedAt = new Date();
  const signatureHash = computeSignatureHash({
    renderedHtml: doc.renderedHtml,
    tokens: (doc.tokens ?? {}) as TokenValues,
    signedName: typedName,
    signedAt,
    signedFromIp: ip,
  });

  const events = Array.isArray(doc.auditEvents) ? doc.auditEvents : [];
  const auditEvents = [
    ...events,
    {
      type: 'signed',
      at: signedAt.toISOString(),
      ip,
      ua,
      tz,
      name: typedName,
      screenW,
      screenH,
    },
  ];

  await prisma.documentSignature.update({
    where: { id: doc.id },
    data: {
      status: 'completed',
      signedAt,
      signedName: typedName,
      signedFromIp: ip || null,
      signedFromUa: ua || null,
      signedFromTz: tz,
      signedScreenW: screenW,
      signedScreenH: screenH,
      signatureHash,
      signingToken: null, // one-time-use; revoke on sign
      auditEvents,
    },
  });

  // Build URLs for the post-sign emails. The recipient gets a
  // 1-year-TTL download link (they may come back to it weeks later
  // for tax / records purposes); the success-page link below is a
  // shorter 24h token tied to the active browser session.
  const baseUrl = process.env.NEXTAUTH_URL || 'https://university.maxxedout.com';
  const longLivedDownloadToken = signDownloadToken(doc.id, 60 * 60 * 24 * 365);
  const pdfDownloadUrl = `${baseUrl}/api/sign/${encodeURIComponent(longLivedDownloadToken)}/pdf`;
  const adminUrl = `${baseUrl}/admin/documents`;

  // Fire-and-forget side effects. Failures are logged but do not
  // block the success response — the signature is already persisted.
  void Promise.allSettled([
    sendSigningCompletedEmail({
      to: doc.recipientEmail,
      recipientName: doc.recipientName ?? typedName,
      courseTitle: doc.courseTitle,
      pdfDownloadUrl,
    }).catch((err) => {
      console.warn('[sign] recipient confirmation email failed', err);
    }),
    sendAdminSigningNotification({
      recipientEmail: doc.recipientEmail,
      recipientName: doc.recipientName ?? typedName,
      courseTitle: doc.courseTitle,
      signedAt,
      adminUrl,
    }).catch((err) => {
      console.warn('[sign] admin notification email failed', err);
    }),
    // Pre-warm the PDF cache. If R2 is slow this tops out near 100ms
    // before we hand back the response — worst case the next download
    // hit triggers generation lazily.
    Promise.race([
      getOrGenerateDocumentPdfKey(doc.id).catch((err) => {
        console.warn('[sign] pdf pre-warm failed', err);
      }),
      new Promise((resolve) => setTimeout(resolve, 100)),
    ]),
  ]);

  const successDownloadToken = signDownloadToken(doc.id);
  return NextResponse.json({
    ok: true,
    downloadUrl: `/api/sign/${encodeURIComponent(successDownloadToken)}/pdf`,
  });
}
