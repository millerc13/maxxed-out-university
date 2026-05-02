import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import {
  decorateContractHtml,
  escapeHtml,
  fillClientSignature,
} from '@/lib/esign-render';
import {
  CONTRACT_STYLES,
  CONTRACT_FONT_LINKS,
  CONTRACT_LOGO_URL,
} from '@/components/sign/contract-styles';

// Lazy PDF generation. The first call rasterizes the document HTML +
// audit page via headless Chromium and uploads to R2; subsequent calls
// stream the cached object. Same R2 bucket as course thumbnails — keys
// are CUIDs so practically unguessable, and the API routes that serve
// these are admin-gated.

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME!;

function pdfKeyFor(documentId: string): string {
  return `documents/${documentId}.pdf`;
}

type AuditEvent = {
  type: string;
  at?: string;
  by?: string;
  ip?: string;
  ua?: string;
  reason?: string | null;
  origin?: string;
  error?: string;
  name?: string;
};

type DocSummary = {
  id: string;
  renderedHtml: string;
  courseTitle: string;
  recipientName: string;
  recipientEmail: string;
  signedName: string;
  signedAt: Date;
  signedFromIp: string;
  signedFromUa: string;
  signedFromTz: string | null;
  signedSignaturePng: string | null;
  signatureHash: string;
  auditEvents: AuditEvent[];
};

export function buildPdfHtml(doc: DocSummary): string {
  const signedAtIso = doc.signedAt.toISOString();
  const signedAtPretty = doc.signedAt.toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });
  const auditRows = doc.auditEvents.map((ev, i) => {
    const at = ev.at ? new Date(ev.at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit',
    }) : '—';
    const detail = [
      ev.by && `by ${escapeHtml(ev.by)}`,
      ev.ip && `from ${escapeHtml(ev.ip)}`,
      ev.reason && `reason: ${escapeHtml(ev.reason)}`,
    ].filter(Boolean).join(' · ');
    return `<tr>
      <td style="padding:6px 12px 6px 0;color:#9ca3af;font-variant-numeric:tabular-nums;">${i + 1}</td>
      <td style="padding:6px 12px 6px 0;font-weight:600;color:#111827;text-transform:capitalize;">${escapeHtml(ev.type)}</td>
      <td style="padding:6px 12px 6px 0;color:#374151;">${at}</td>
      <td style="padding:6px 0;color:#6b7280;">${detail || ''}</td>
    </tr>`;
  }).join('\n');

  const fontLinks = CONTRACT_FONT_LINKS.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n');
  // Puppeteer loads `setContent` HTML at about:blank, so relative paths
  // like /downloads/logo.png won't resolve. Upgrade to an absolute URL
  // using whatever NEXTAUTH_URL is configured (prod or local dev).
  const baseUrl = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');
  const logoUrl = CONTRACT_LOGO_URL.startsWith('http')
    ? CONTRACT_LOGO_URL
    : `${baseUrl}${CONTRACT_LOGO_URL}`;
  const signedDateStr = doc.signedAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const filledHtml = fillClientSignature(doc.renderedHtml, {
    name: doc.signedName,
    date: signedDateStr,
    signaturePng: doc.signedSignaturePng,
  });
  const decoratedBody = decorateContractHtml(filledHtml);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.courseTitle)} — Signed Agreement</title>
${fontLinks}
<style>
  @page { size: Letter; margin: 0.75in 0.6in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body {
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${CONTRACT_STYLES}
  /* Audit certificate now leads the PDF — the contract main body
     gets the page-break-before so it always starts on a fresh sheet
     after the audit page. */
  .audit-page { padding: 0 0 12pt; }
  .contract-wrap { page-break-before: always; }
  .audit-page h1 {
    font-size: 16pt; text-transform: uppercase; letter-spacing: 0.18em;
    text-align: center; margin: 0 0 16pt; color: #111827;
  }
  .audit-grid {
    display: grid;
    grid-template-columns: 140pt 1fr;
    gap: 6pt 14pt;
    font-size: 10pt;
    margin: 0 0 18pt;
  }
  .audit-grid dt { color: #6b7280; }
  .audit-grid dd { margin: 0; color: #111827; word-break: break-word; }
  .audit-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .audit-table th {
    text-align: left; font-weight: 700; color: #6b7280;
    border-bottom: 1px solid #e5e7eb; padding: 6px 12px 6px 0;
    text-transform: uppercase; letter-spacing: 0.08em; font-size: 8pt;
  }
  .footer-hash {
    margin-top: 24pt; padding: 10pt 12pt;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6pt;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 8.5pt; color: #374151; word-break: break-all;
  }
</style>
</head>
<body>
  <section class="audit-page">
    <h1>Audit Certificate</h1>
    <dl class="audit-grid">
      <dt>Document ID</dt><dd>${escapeHtml(doc.id)}</dd>
      <dt>Course</dt><dd>${escapeHtml(doc.courseTitle)}</dd>
      <dt>Recipient</dt><dd>${escapeHtml(doc.recipientName)} &lt;${escapeHtml(doc.recipientEmail)}&gt;</dd>
      <dt>Signed name</dt><dd>${escapeHtml(doc.signedName)}</dd>
      <dt>Signed at</dt><dd>${signedAtPretty}<br/><span style="color:#9ca3af;font-size:9pt;">${signedAtIso}${doc.signedFromTz ? ` · ${escapeHtml(doc.signedFromTz)}` : ''}</span></dd>
      <dt>Signed from IP</dt><dd>${escapeHtml(doc.signedFromIp)}</dd>
      <dt>User agent</dt><dd style="font-size:9pt;color:#374151;">${escapeHtml(doc.signedFromUa)}</dd>
    </dl>

    <h2 style="font-size:12pt;text-transform:uppercase;letter-spacing:0.12em;border-left:3px solid #2563eb;padding-left:8pt;margin:0 0 8pt;">Event Timeline</h2>
    <table class="audit-table">
      <thead><tr><th style="width:24pt;">#</th><th>Event</th><th>When</th><th>Detail</th></tr></thead>
      <tbody>${auditRows}</tbody>
    </table>

    <div class="footer-hash">
      <div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4pt;">Signature Hash (SHA-256)</div>
      ${escapeHtml(doc.signatureHash)}
    </div>
  </section>

  <main class="contract-wrap">
    <header class="contract-letterhead">
      <img src="${logoUrl}" alt="Maxxed Out" />
      <p class="lh-meta">Document ${escapeHtml(doc.id)} · Effective ${escapeHtml(signedAtPretty)}</p>
    </header>
    <div class="contract-display">${decoratedBody}</div>
  </main>
</body>
</html>`;
}

// Resolves a Chromium executable path for puppeteer-core. On Vercel /
// Lambda we use @sparticuz/chromium-min, which downloads the Chromium
// binary tarball from a URL at runtime (cached in /tmp across warm
// invocations) — sidesteps Next file-tracing entirely. Locally, point
// PUPPETEER_EXECUTABLE_PATH at a system Chrome install instead.
//
// CHROMIUM_PACK_URL points to a v148 chromium-pack tarball. Defaults
// to the official Sparticuz GitHub release; can be overridden in env
// to point at our R2 mirror later if GH cold-start latency or rate
// limits become an issue.
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar';

async function launchBrowser() {
  const puppeteer = await import('puppeteer-core');
  const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium-min')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1024, height: 1280, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    });
  }

  const exe = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!exe) {
    throw new Error(
      'PUPPETEER_EXECUTABLE_PATH not set. For local PDF rendering, point this at a Chrome/Chromium binary (e.g. "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome").',
    );
  }
  return puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function renderDocumentPdf(doc: DocSummary): Promise<Buffer> {
  const html = buildPdfHtml(doc);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.75in', right: '0.6in', bottom: '0.75in', left: '0.6in' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Cache helper. Returns the R2 object key, generating + uploading if not
// already cached. Mutates the row's pdfR2Key + pdfGeneratedAt on first run.
export async function getOrGenerateDocumentPdfKey(documentId: string): Promise<string> {
  const doc = await prisma.documentSignature.findUnique({
    where: { id: documentId },
  });
  if (!doc) throw new Error(`DocumentSignature not found: ${documentId}`);
  if (doc.status !== 'completed') {
    throw new Error(`Cannot generate PDF for status=${doc.status} (must be completed)`);
  }
  if (doc.pdfR2Key) return doc.pdfR2Key;

  if (!doc.signedAt || !doc.signedName || !doc.signedFromIp || !doc.signedFromUa || !doc.signatureHash) {
    throw new Error(`Document ${documentId} is missing signing metadata`);
  }

  const pdf = await renderDocumentPdf({
    id: doc.id,
    renderedHtml: doc.renderedHtml,
    courseTitle: doc.courseTitle,
    recipientName: doc.recipientName ?? '',
    recipientEmail: doc.recipientEmail,
    signedName: doc.signedName,
    signedAt: doc.signedAt,
    signedFromIp: doc.signedFromIp,
    signedFromUa: doc.signedFromUa,
    signedFromTz: doc.signedFromTz,
    signedSignaturePng: doc.signedSignaturePng,
    signatureHash: doc.signatureHash,
    auditEvents: ((doc.auditEvents as unknown) as AuditEvent[]) ?? [],
  });

  const key = pdfKeyFor(documentId);
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: pdf,
    ContentType: 'application/pdf',
    CacheControl: 'private, max-age=31536000, immutable',
  }));

  await prisma.documentSignature.update({
    where: { id: documentId },
    data: { pdfR2Key: key, pdfGeneratedAt: new Date() },
  });

  return key;
}

// Streams the PDF body from R2. Caller is responsible for setting the
// Content-Disposition + Content-Type headers on the response.
export async function readPdfFromR2(key: string): Promise<Buffer> {
  const out = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!out.Body) throw new Error(`Empty body for R2 key ${key}`);
  const stream = out.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
