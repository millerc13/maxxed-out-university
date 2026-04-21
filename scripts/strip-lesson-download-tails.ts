/**
 * Strip leftover `**Download:** ...` and `**Action Item:** Download ...` tails
 * from lesson markdown content. These were orphaned when we migrated from
 * docx downloads → interactive Tools — the `Resource` rows were updated,
 * but the markdown content still references the old downloads.
 *
 * Run dry-run first:
 *   npx tsx scripts/strip-lesson-download-tails.ts
 *
 * Apply changes:
 *   npx tsx scripts/strip-lesson-download-tails.ts --apply
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// Match:
//   optional trailing newlines
//   optional `---` horizontal rule (with any whitespace)
//   one or more `**Download:** ...` or `**Action Item:** Download ... PDF` lines
//   trailing whitespace
const TAIL_PATTERN = /\s*(?:^|\n)\s*(?:-{3,})?\s*\n*\s*(?:\*\*Download:\*\*|\*\*Action Item:\*\*\s*Download)[\s\S]*?$/;

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: { content: { contains: 'Download', mode: 'insensitive' } },
    select: { id: true, slug: true, title: true, content: true },
  });

  console.log(`Scanning ${lessons.length} lesson(s) with 'Download' in content…\n`);

  let changed = 0;
  for (const l of lessons) {
    if (!l.content) continue;
    const cleaned = l.content.replace(TAIL_PATTERN, '').trimEnd();
    if (cleaned === l.content) {
      console.log(`  [skip] ${l.slug} — pattern did not match`);
      continue;
    }

    const removed = l.content.slice(cleaned.length).trim().replace(/\n+/g, ' ').slice(0, 140);
    console.log(`  [${APPLY ? 'apply' : 'dry '}] ${l.slug}`);
    console.log(`         removed: "${removed}${removed.length >= 140 ? '…' : ''}"`);

    if (APPLY) {
      await prisma.lesson.update({
        where: { id: l.id },
        data: { content: cleaned },
      });
    }
    changed++;
  }

  console.log(`\n${APPLY ? 'Updated' : 'Would update'} ${changed} / ${lessons.length} lesson(s).`);
  if (!APPLY) console.log('Re-run with --apply to persist.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
