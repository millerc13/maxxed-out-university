// Idempotent seed for the e-sign ContractTemplate row. Reads
// prisma/seed-data/coaching-agreement.md and creates the active template
// if one with the same name doesn't already exist.
//
// Run with:
//   npx tsx scripts/seed-contract-template.ts
//
// Safe to re-run — never overwrites an existing template body so admin
// edits made via /admin/documents/template are preserved.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractTokens } from '../src/lib/esign-tokens';

const TEMPLATE_NAME = 'Elite Coaching Agreement';
const SOURCE_PATH = resolve(process.cwd(), 'prisma/seed-data/coaching-agreement.md');

const prisma = new PrismaClient();

async function main() {
  const body = readFileSync(SOURCE_PATH, 'utf8');
  const tokens = extractTokens(body);

  const existing = await prisma.contractTemplate.findFirst({
    where: { name: TEMPLATE_NAME },
  });

  if (existing) {
    console.log(`[seed] Template "${TEMPLATE_NAME}" already exists (id=${existing.id}, active=${existing.active}). Leaving body untouched.`);
    if (!existing.active) {
      console.log('[seed] Template is currently inactive; activating it.');
      await prisma.contractTemplate.update({
        where: { id: existing.id },
        data: { active: true },
      });
      // Make sure no other template is active.
      await prisma.contractTemplate.updateMany({
        where: { id: { not: existing.id }, active: true },
        data: { active: false },
      });
    }
    return;
  }

  // Deactivate any other active template first — exactly one wins.
  await prisma.contractTemplate.updateMany({
    where: { active: true },
    data: { active: false },
  });

  const created = await prisma.contractTemplate.create({
    data: {
      name: TEMPLATE_NAME,
      body,
      tokens: tokens as object,
      active: true,
    },
  });
  console.log(`[seed] Created template "${created.name}" (id=${created.id}) with ${tokens.length} tokens:`);
  console.log('  ', tokens.join(', '));
}

main()
  .catch((err) => {
    console.error('[seed] FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
