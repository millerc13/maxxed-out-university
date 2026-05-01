// Tamper-evidence verifier. Recomputes the SHA-256 from a stored
// DocumentSignature row and compares it against the row's signatureHash.
// Use:
//   npx tsx scripts/verify-signature-hash.ts <documentId>

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { computeSignatureHash, type TokenValues } from '../src/lib/esign-tokens';

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: npx tsx scripts/verify-signature-hash.ts <documentId>');
    process.exit(1);
  }

  const doc = await prisma.documentSignature.findUnique({ where: { id } });
  if (!doc) {
    console.error(`No DocumentSignature with id=${id}`);
    process.exit(1);
  }
  if (!doc.signatureHash) {
    console.error(`Document ${id} has no signatureHash (status=${doc.status}). Nothing to verify.`);
    process.exit(1);
  }
  if (!doc.signedAt || !doc.signedName || !doc.signedFromIp) {
    console.error(`Document ${id} missing required signing fields.`);
    process.exit(1);
  }

  const recomputed = computeSignatureHash({
    renderedHtml: doc.renderedHtml,
    tokens: (doc.tokens as unknown) as TokenValues,
    signedName: doc.signedName,
    signedAt: doc.signedAt,
    signedFromIp: doc.signedFromIp,
  });

  console.log('Stored hash:    ', doc.signatureHash);
  console.log('Recomputed hash:', recomputed);
  if (recomputed === doc.signatureHash) {
    console.log('\n✔ MATCH — document has not been tampered with.');
  } else {
    console.log('\n✖ MISMATCH — the row was modified after signing.');
    process.exit(2);
  }
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
