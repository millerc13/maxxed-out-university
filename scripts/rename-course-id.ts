/**
 * Migrate the course id `ht_done_with_you` → `business-accelerator-mentorship`.
 *
 * Postgres FKs on Course.id default to ON UPDATE NO ACTION via Prisma, so we
 * can't just rename in place. Instead we do it in a single transaction:
 *
 *   1. INSERT a new Course row with id='business-accelerator-mentorship'
 *      and every column copied from the old row (slug stays the same — slug
 *      is independent of id).
 *   2. Reassign every FK that points at `ht_done_with_you`:
 *        - FunnelDeployment.courseId       (we know about 2: donewithyou, accelerator)
 *        - Module.courseId                 (cascade)
 *        - Enrollment.courseId             (deleted earlier, but defensive)
 *        - Certificate.courseId
 *        - Quiz.courseId
 *        - ProductMapping.courseId
 *        - Tool.courseId
 *        - Course.bundleId                 (self-ref for child courses)
 *      And the join tables:
 *        - _FunnelFeaturedCourses
 *        - _PromoCodeCourses
 *   3. DELETE the old `ht_done_with_you` row.
 *
 * Wrapped in $transaction — atomic. If anything fails, no half-renamed state.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLD_ID = 'ht_done_with_you';
const NEW_ID = 'business-accelerator-mentorship';

async function main() {
  // Sanity check
  const exists = await prisma.course.findUnique({ where: { id: OLD_ID } });
  if (!exists) throw new Error(`${OLD_ID} not found`);
  const conflict = await prisma.course.findUnique({ where: { id: NEW_ID } });
  if (conflict) throw new Error(`${NEW_ID} already exists — bailing`);

  console.log(`Migrating course id: ${OLD_ID} → ${NEW_ID}`);
  console.log(`  title: "${exists.title}"`);
  console.log(`  slug:  "${exists.slug}"`);

  await prisma.$transaction(async (tx) => {
    // 1. Snapshot the old row, then free its slug so we can re-use it on
    //    the new row inside this same transaction. Postgres unique
    //    indexes are checked statement-by-statement, so both rows
    //    coexist briefly — the slug needs to be unique at every point.
    const old = await tx.course.findUnique({ where: { id: OLD_ID } });
    if (!old) throw new Error('row vanished mid-transaction');
    const targetSlug = old.slug;
    await tx.course.update({
      where: { id: OLD_ID },
      data: { slug: `__migrating__${OLD_ID}` },
    });

    await tx.course.create({
      data: {
        id: NEW_ID,
        title: old.title,
        slug: targetSlug,
        description: old.description,
        shortDesc: old.shortDesc,
        thumbnail: old.thumbnail,
        previewVideo: old.previewVideo,
        price: old.price,
        published: old.published,
        comingSoon: old.comingSoon,
        isBundle: old.isBundle,
        bundleId: old.bundleId,
        externalUrl: old.externalUrl,
        checkoutAfterApply: old.checkoutAfterApply,
        notifyClosersOnApply: old.notifyClosersOnApply,
        order: old.order,
        homepageSectionId: old.homepageSectionId,
        homepageOrder: old.homepageOrder,
        heroStats: old.heroStats as any,
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
      },
    });

    // 2. Reassign FKs. Slug is unique so we can't have both rows live with the
    //    same slug — clear it on the old row before the new row claims it.
    //    Wait — we just created the new row WITH the same slug. That'd
    //    violate the unique constraint. Need to swap order: clear slug on
    //    old row first, THEN create new. Re-doing.
    //    (Caught here only because we're writing this carefully.)

    // Move every relation to the new course id. Each .updateMany call is a
    // single SQL UPDATE.
    const fkUpdates = await Promise.all([
      tx.funnelDeployment.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.module.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.enrollment.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.certificate.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.quiz.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.productMapping.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.tool.updateMany({
        where: { courseId: OLD_ID },
        data: { courseId: NEW_ID },
      }),
      tx.course.updateMany({
        where: { bundleId: OLD_ID },
        data: { bundleId: NEW_ID },
      }),
    ]);
    console.log('FK updates:', fkUpdates.map((r) => r.count));

    // Many-to-many join tables — Prisma uses raw join-table updates via
    // $executeRaw because the implicit M2M API doesn't expose them directly.
    const m2mFeatured = await tx.$executeRaw`UPDATE "_FunnelFeaturedCourses" SET "B" = ${NEW_ID} WHERE "B" = ${OLD_ID}`;
    const m2mPromo = await tx.$executeRaw`UPDATE "_PromoCodeCourses" SET "B" = ${NEW_ID} WHERE "B" = ${OLD_ID}`;
    console.log(`M2M updates: featured=${m2mFeatured} promo=${m2mPromo}`);

    // 3. Delete the old row
    await tx.course.delete({ where: { id: OLD_ID } });
  });

  console.log('\nDone.');
  const after = await prisma.course.findUnique({
    where: { id: NEW_ID },
    select: {
      id: true,
      title: true,
      slug: true,
      _count: { select: { funnels: true, modules: true, enrollments: true } },
    },
  });
  console.log(JSON.stringify(after, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
