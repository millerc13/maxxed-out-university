// Phase 1 smoke test: load the active ContractTemplate, render with fake
// tokens, run the full pipeline (markdown → HTML → buildPdfHtml) and
// optionally rasterize to PDF if a Chromium binary is available.
//
// Run with:
//   npx tsx scripts/esign-render-smoke.ts
//
// PDF rendering needs PUPPETEER_EXECUTABLE_PATH — example for macOS:
//   PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     npx tsx scripts/esign-render-smoke.ts
//
// Without that env var, the script writes only the HTML preview to /tmp.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import {
  renderMarkdown,
  markdownToHtml,
  computeSignatureHash,
  type TokenValues,
} from '../src/lib/esign-tokens';
import { buildPdfHtml, renderDocumentPdf } from '../src/lib/esign-pdf';

const prisma = new PrismaClient();

async function main() {
  const tpl = await prisma.contractTemplate.findFirst({ where: { active: true } });
  if (!tpl) {
    console.error('[smoke] No active ContractTemplate. Run scripts/seed-contract-template.ts first.');
    process.exit(1);
  }

  const now = new Date();
  const tokens: TokenValues = {
    'Agreement.EffectiveDate': 'April 30, 2026',
    'Customer.FullName': 'Brian Johnson',
    'Customer.FirstName': 'Brian',
    'Customer.LastName': 'Johnson',
    'Customer.Email': 'brian@example.com',
    'Course.Name': '6-Month Mentorship',
    'Payment.Total': '$10,000.00',
    'Payment.Initial': '$10,000.00',
    'Payment.RemainingBalance': '$0.00',
    'Payment.Date': 'April 30, 2026',
    'Payment.Schedule': 'Paid in full',
    'Payment.NumberOfInstallments': 1,
    'Payment.PerInstallmentAmount': '$10,000.00',
    'Payment.FirstDueDate': 'April 30, 2026',
    'Transaction.Id': 'pi_smoke_demo_1234',
    'Notes': '',
    'NonCompete.YearsPostProgram': '1',
    'GoverningLaw.State': 'Ohio',
    'Dispute.Location': 'Ohio',
    'Company.SignatureLine': 'Todd Pultz',
    'Company.SignatureDate': 'April 30, 2026',
  };

  const renderedMd = renderMarkdown(tpl.body, tokens);
  const renderedHtml = markdownToHtml(renderedMd);

  const signedAt = now;
  const signedFromIp = '127.0.0.1';
  const signatureHash = computeSignatureHash({
    renderedHtml,
    tokens,
    signedName: 'Brian Johnson',
    signedAt,
    signedFromIp,
  });

  const html = buildPdfHtml({
    id: 'smoke-doc-id',
    renderedHtml,
    courseTitle: '6-Month Mentorship',
    recipientName: 'Brian Johnson',
    recipientEmail: 'brian@example.com',
    signedName: 'Brian Johnson',
    signedAt,
    signedFromIp,
    signedFromUa: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    signedFromTz: 'America/New_York',
    signatureHash,
    auditEvents: [
      { type: 'sent', at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), by: 'system' },
      { type: 'viewed', at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), ip: signedFromIp },
      { type: 'signed', at: signedAt.toISOString(), ip: signedFromIp, name: 'Brian Johnson' },
    ],
  });

  writeFileSync('/tmp/test-signed.html', html, 'utf8');
  console.log('[smoke] Wrote /tmp/test-signed.html');
  console.log('[smoke] signatureHash =', signatureHash);

  const exe = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!exe) {
    console.log('[smoke] Skipping PDF render — set PUPPETEER_EXECUTABLE_PATH to a Chrome binary to enable.');
    return;
  }

  console.log('[smoke] Rendering PDF via', exe);
  const pdf = await renderDocumentPdf({
    id: 'smoke-doc-id',
    renderedHtml,
    courseTitle: '6-Month Mentorship',
    recipientName: 'Brian Johnson',
    recipientEmail: 'brian@example.com',
    signedName: 'Brian Johnson',
    signedAt,
    signedFromIp,
    signedFromUa: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    signedFromTz: 'America/New_York',
    signatureHash,
    auditEvents: [
      { type: 'sent', at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), by: 'system' },
      { type: 'viewed', at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), ip: signedFromIp },
      { type: 'signed', at: signedAt.toISOString(), ip: signedFromIp, name: 'Brian Johnson' },
    ],
  });
  writeFileSync('/tmp/test-signed.pdf', pdf);
  console.log('[smoke] Wrote /tmp/test-signed.pdf', `(${pdf.length} bytes)`);
}

main()
  .catch((err) => {
    console.error('[smoke] FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
