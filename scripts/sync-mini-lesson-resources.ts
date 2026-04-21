/**
 * Mini-lesson resource backfill.
 *
 * Standalone courses (deal-analysis-underwriting, the-brrrr-method, etc.)
 * contain "mini" copies of bundle lessons — the lesson id is `mini_<bundleLessonId>`.
 * When the bundle was seeded with Resource rows linking to interactive Tools,
 * the mini copies did not get the same resources, so standalone-course
 * students see an empty "Tools & Resources" panel.
 *
 * This script finds every lesson whose id starts with `mini_`, looks up the
 * source bundle lesson's resources, and creates matching Resource rows on
 * the mini lesson (idempotent — skips any that already exist by title+fileUrl).
 *
 * Dry-run:  npx tsx scripts/sync-mini-lesson-resources.ts
 * Apply:    npx tsx scripts/sync-mini-lesson-resources.ts --apply
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const miniLessons = await prisma.lesson.findMany({
    where: { id: { startsWith: 'mini_' } },
    select: {
      id: true,
      slug: true,
      resources: { select: { title: true, fileUrl: true } },
      module: { select: { course: { select: { slug: true } } } },
    },
  });

  console.log(`Found ${miniLessons.length} mini-lesson(s).\n`);

  let toCreate = 0;
  let lessonsTouched = 0;

  for (const mini of miniLessons) {
    const sourceId = mini.id.replace(/^mini_/, '');
    const source = await prisma.lesson.findUnique({
      where: { id: sourceId },
      select: { id: true, resources: { select: { title: true, fileUrl: true, fileType: true, fileSize: true } } },
    });

    if (!source) {
      console.log(`  [skip] ${mini.module.course.slug}/${mini.slug} — source ${sourceId} not found`);
      continue;
    }

    if (source.resources.length === 0) continue;

    // Skip any resource that already exists on the mini (match on title+fileUrl)
    const existing = new Set(mini.resources.map((r) => `${r.title}::${r.fileUrl}`));
    const missing = source.resources.filter((r) => !existing.has(`${r.title}::${r.fileUrl}`));

    if (missing.length === 0) continue;

    console.log(`  [${APPLY ? 'apply' : 'dry '}] ${mini.module.course.slug}/${mini.slug} — +${missing.length} resource(s)`);
    for (const r of missing) console.log(`           → ${r.title} (${r.fileUrl})`);

    if (APPLY) {
      await prisma.resource.createMany({
        data: missing.map((r) => ({
          title: r.title,
          fileUrl: r.fileUrl,
          fileType: r.fileType,
          fileSize: r.fileSize,
          lessonId: mini.id,
        })),
      });
    }
    toCreate += missing.length;
    lessonsTouched++;
  }

  console.log(`\n${APPLY ? 'Created' : 'Would create'} ${toCreate} resource row(s) across ${lessonsTouched} lesson(s).`);
  if (!APPLY) console.log('Re-run with --apply to persist.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
