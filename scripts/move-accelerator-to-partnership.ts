import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCEL_COURSE_ID = 'cmokzf2860001my1y1nqghqpx';
const PARTNERSHIP_SECTION_ID = 'cmoj37n460001etjw3upa4oxp';

async function main() {
  // Show the section's existing course assignments before
  const before = await prisma.course.findMany({
    where: { homepageSectionId: PARTNERSHIP_SECTION_ID },
    select: { id: true, title: true, slug: true, homepageOrder: true, published: true },
    orderBy: { homepageOrder: 'asc' },
  });
  console.log('BEFORE — Partnership Programs section contains:');
  for (const c of before) {
    console.log(`  ${c.published ? '✓' : '✗'} [${c.homepageOrder}] ${c.title} (${c.slug})`);
  }

  // Assign the published accelerator to the partnership section. Place it
  // at the end (max order + 1).
  const maxOrder = before.reduce((m, c) => Math.max(m, c.homepageOrder), -1);

  const updated = await prisma.course.update({
    where: { id: ACCEL_COURSE_ID },
    data: {
      homepageSectionId: PARTNERSHIP_SECTION_ID,
      homepageOrder: maxOrder + 1,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      homepageSectionId: true,
      homepageOrder: true,
    },
  });
  console.log('\nMoved accelerator → Partnership Programs:');
  console.log(JSON.stringify(updated, null, 2));

  const after = await prisma.course.findMany({
    where: { homepageSectionId: PARTNERSHIP_SECTION_ID },
    select: { id: true, title: true, slug: true, homepageOrder: true, published: true },
    orderBy: { homepageOrder: 'asc' },
  });
  console.log('\nAFTER — Partnership Programs section contains:');
  for (const c of after) {
    console.log(`  ${c.published ? '✓' : '✗'} [${c.homepageOrder}] ${c.title} (${c.slug})`);
  }

  await prisma.$disconnect();
}

main();
