/**
 * Create a new "Business Accelerator" course (no mentorship) at $35k,
 * unpublished, and repoint the accelerator.maxxedout.com funnel at it.
 *
 * The existing "Business Accelerator & Mentorship" course at $50k stays
 * linked to the donewithyou subdomain.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PARTNERSHIP_SECTION_ID = 'cmoj37n460001etjw3upa4oxp';
const PARENT_COURSE_ID = 'ht_done_with_you'; // Business Accelerator & Mentorship — clone description from here

async function main() {
  // Pull the parent's full description so we can clone + strip the
  // mentorship section. Todd can edit the rest in admin.
  const parent = await prisma.course.findUnique({
    where: { id: PARENT_COURSE_ID },
    select: { description: true, thumbnail: true },
  });
  if (!parent) throw new Error('parent course not found');

  // Strip section "9. Monthly Mentorship..." — everything from "9. Monthly
  // Mentorship" up to the "INVESTMENT" header (which is the next major
  // section). Also strip the "Monthly mentorship with Todd" line from the
  // value-stack and the "9. Monthly..." reference under "What's Included".
  let desc = parent.description ?? '';
  desc = desc.replace(
    /9\. Monthly Mentorship with Todd Pultz[\s\S]*?(?=INVESTMENT)/,
    '',
  );
  desc = desc.replace(/\nMonthly mentorship with Todd\n/, '\n');

  const max = await prisma.course.aggregate({
    where: { homepageSectionId: PARTNERSHIP_SECTION_ID },
    _max: { homepageOrder: true },
  });
  const nextOrder = (max._max.homepageOrder ?? -1) + 1;

  const created = await prisma.course.create({
    data: {
      title: 'Business Accelerator',
      slug: 'business-accelerator',
      price: 3500000, // $35,000 in cents
      published: false,
      shortDesc: 'Done-for-you media & marketing system — no mentorship.',
      description: desc,
      thumbnail: parent.thumbnail,
      homepageSectionId: PARTNERSHIP_SECTION_ID,
      homepageOrder: nextOrder,
    },
    select: { id: true, title: true, slug: true, price: true, published: true },
  });
  console.log('Created course:', JSON.stringify(created, null, 2));

  const funnel = await prisma.funnelDeployment.update({
    where: { subdomain: 'accelerator' },
    data: { courseId: created.id },
    include: { course: { select: { id: true, title: true, price: true, slug: true, published: true } } },
  });
  console.log('\nRepointed accelerator funnel:');
  console.log(JSON.stringify({ subdomain: funnel.subdomain, courseId: funnel.courseId, course: funnel.course }, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
