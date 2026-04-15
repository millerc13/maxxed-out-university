import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const GOLD = '#D4AF37';
const BLUE = '#0000CC'; // Todd's brand blue
const INK = '#0c1829';
const MUTED = '#6b7280';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const { certificateId } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  const studentName = certificate.user.name || certificate.user.email.split('@')[0];
  const courseName = certificate.course.title;
  const dateStr = certificate.issuedAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  try {
    // Landscape Letter: 792 x 612 pt
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done: Promise<Buffer> = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const W = doc.page.width; // 792
    const H = doc.page.height; // 612
    const centerX = W / 2;

    // Double gold border
    doc.lineWidth(2).strokeColor(GOLD).rect(24, 24, W - 48, H - 48).stroke();
    doc.lineWidth(0.75).strokeColor(GOLD).rect(36, 36, W - 72, H - 72).stroke();

    // Corner flourishes (L-shapes at each corner)
    const CF = 40; // flourish length
    const CI = 52; // distance from edge
    doc.lineWidth(3).strokeColor(GOLD);
    // top-left
    doc.moveTo(CI, CI + CF).lineTo(CI, CI).lineTo(CI + CF, CI).stroke();
    // top-right
    doc.moveTo(W - CI - CF, CI).lineTo(W - CI, CI).lineTo(W - CI, CI + CF).stroke();
    // bottom-left
    doc.moveTo(CI, H - CI - CF).lineTo(CI, H - CI).lineTo(CI + CF, H - CI).stroke();
    // bottom-right
    doc.moveTo(W - CI - CF, H - CI).lineTo(W - CI, H - CI).lineTo(W - CI, H - CI - CF).stroke();

    // Brand chip (blue) flanked by two short blue lines
    const chipY = 94;
    const chipText = 'MAXXED  OUT  UNIVERSITY';
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLUE);
    const chipWidth = doc.widthOfString(chipText, { characterSpacing: 4 });
    doc.text(chipText, 0, chipY, { width: W, align: 'center', characterSpacing: 4 });
    // flanking lines
    doc.lineWidth(1).strokeColor(BLUE);
    const lineLen = 24;
    const gap = 14;
    const chipLeft = (W - chipWidth) / 2;
    const chipRight = chipLeft + chipWidth;
    doc.moveTo(chipLeft - gap - lineLen, chipY + 4).lineTo(chipLeft - gap, chipY + 4).stroke();
    doc.moveTo(chipRight + gap, chipY + 4).lineTo(chipRight + gap + lineLen, chipY + 4).stroke();

    // Title — use built-in serif (Times-Roman) since Cormorant would require font embedding
    doc.font('Times-Roman').fontSize(48).fillColor(INK).text('Certificate of Completion', 0, 115, {
      width: W,
      align: 'center',
    });

    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('— An Award of Achievement —', 0, 180, {
      width: W,
      align: 'center',
      characterSpacing: 2,
    });

    // Gold divider
    doc.lineWidth(1.5).strokeColor(GOLD);
    doc.moveTo(centerX - 40, 210).lineTo(centerX + 40, 210).stroke();

    // "This certifies that"
    doc.font('Helvetica').fontSize(11).fillColor(MUTED).text('THIS CERTIFIES THAT', 0, 230, {
      width: W,
      align: 'center',
      characterSpacing: 2,
    });

    // Student name (serif, big)
    doc.font('Times-Bold').fontSize(52).fillColor(INK).text(studentName, 0, 260, {
      width: W,
      align: 'center',
    });

    // Body
    doc.font('Helvetica').fontSize(12).fillColor(MUTED).text(
      'has successfully completed the final exam and all required coursework for',
      0,
      340,
      { width: W, align: 'center' }
    );

    // Course title — in Todd's brand blue
    doc.font('Times-Bold').fontSize(24).fillColor(BLUE).text(courseName, 0, 370, {
      width: W,
      align: 'center',
    });

    // Signature footer
    const sigY = 470;
    const sigLineW = 180;
    const leftX = centerX - 200 - sigLineW / 2;
    const rightX = centerX + 200 - sigLineW / 2;

    // Left col — date
    doc.lineWidth(0.75).strokeColor(INK).moveTo(leftX, sigY).lineTo(leftX + sigLineW, sigY).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('DATE AWARDED', leftX, sigY + 8, {
      width: sigLineW,
      align: 'center',
      characterSpacing: 2,
    });
    doc.font('Times-Bold').fontSize(14).fillColor(INK).text(dateStr, leftX, sigY + 24, {
      width: sigLineW,
      align: 'center',
    });

    // Right col — instructor
    doc.lineWidth(0.75).strokeColor(INK).moveTo(rightX, sigY).lineTo(rightX + sigLineW, sigY).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('INSTRUCTOR', rightX, sigY + 8, {
      width: sigLineW,
      align: 'center',
      characterSpacing: 2,
    });
    doc.font('Times-Bold').fontSize(14).fillColor(INK).text('Todd Pultz', rightX, sigY + 24, {
      width: sigLineW,
      align: 'center',
    });

    // ID strip
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    doc.text(`CERTIFICATE ID: ${certificate.certificateId}`, 48, H - 40, {
      characterSpacing: 1,
    });
    doc.text(`maxxedout.com/certificates/${certificate.certificateId}`, 0, H - 40, {
      width: W - 48,
      align: 'right',
      characterSpacing: 1,
    });

    doc.end();
    const pdfBuffer = await done;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Maxxed-Out-Certificate-${certificate.certificateId}.pdf"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[certificate-pdf] render failed', { error: msg });
    return NextResponse.json({ error: 'Failed to render certificate', detail: msg }, { status: 500 });
  }
}
