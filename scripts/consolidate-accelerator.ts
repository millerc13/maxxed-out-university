/**
 * Consolidate to a single canonical Business Accelerator & Mentorship course.
 *
 * Decision tree (per user):
 *   - Slug must be `business-accelerator-mentorship`
 *   - The 1 enrollment on `ht_done_with_you` is NOT a real customer (user
 *     confirmed) — safe to delete
 *   - The two newer rows I created/copied are duplicates — delete them
 *
 * Result: one course `ht_done_with_you` (title=Business Accelerator &
 * Mentorship, slug=business-accelerator-mentorship), served by BOTH the
 * `donewithyou` and `accelerator` funnel subdomains via different templates.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CANONICAL_ID = 'ht_done_with_you';
const DUPLICATE_PUBLISHED = 'cmokzf2860001my1y1nqghqpx'; // the one I created
const DUPLICATE_DRAFT = 'cmokz2xuo00016r6vt2w6e4e1'; // Todd's "(DRAFT)" copy

async function main() {
  // Step 1: repoint accelerator funnel from the duplicate → canonical
  const accelFunnel = await prisma.funnelDeployment.findUnique({
    where: { subdomain: 'accelerator' },
    select: { id: true, courseId: true },
  });
  if (!accelFunnel) throw new Error('accelerator funnel not found');
  console.log(
    `accelerator funnel: courseId ${accelFunnel.courseId} → ${CANONICAL_ID}`,
  );
  await prisma.funnelDeployment.update({
    where: { id: accelFunnel.id },
    data: { courseId: CANONICAL_ID },
  });

  // Step 2: delete the fake enrollment on the canonical row
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: CANONICAL_ID },
    include: { user: { select: { email: true, name: true } } },
  });
  console.log(`\nEnrollments on ${CANONICAL_ID} before deletion:`);
  for (const e of enrollments) {
    console.log(
      `  - ${e.user.email} (${e.user.name ?? 'no-name'}) source=${e.source ?? 'null'} txn=${e.transactionId ?? 'null'}`,
    );
  }
  const delEnroll = await prisma.enrollment.deleteMany({
    where: { courseId: CANONICAL_ID },
  });
  console.log(`Deleted ${delEnroll.count} fake enrollment(s)`);

  // Step 3: delete the two duplicate courses
  for (const id of [DUPLICATE_PUBLISHED, DUPLICATE_DRAFT]) {
    const c = await prisma.course.findUnique({
      where: { id },
      select: {
        title: true,
        _count: { select: { enrollments: true, modules: true } },
      },
    });
    if (!c) {
      console.log(`\nCourse ${id} already gone — skipping`);
      continue;
    }
    if (c._count.enrollments > 0) {
      console.log(
        `\nWARNING: course ${id} (${c.title}) has ${c._count.enrollments} enrollments — refusing to delete`,
      );
      continue;
    }
    console.log(
      `\nDeleting duplicate course: ${id} "${c.title}" (modules=${c._count.modules})`,
    );
    await prisma.course.delete({ where: { id } });
  }

  // Final sanity check
  console.log('\n=== After cleanup ===');
  const canon = await prisma.course.findUnique({
    where: { id: CANONICAL_ID },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      homepageSectionId: true,
      _count: { select: { enrollments: true, funnels: true } },
    },
  });
  console.log('Canonical course:', JSON.stringify(canon, null, 2));

  const funnels = await prisma.funnelDeployment.findMany({
    where: { courseId: CANONICAL_ID },
    select: { subdomain: true, name: true },
  });
  console.log(`\nFunnels pointing at ${CANONICAL_ID}:`);
  for (const f of funnels) console.log(`  ${f.subdomain} — ${f.name}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
