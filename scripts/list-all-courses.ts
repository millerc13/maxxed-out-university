import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      price: true,
      externalUrl: true,
      _count: { select: { enrollments: true, modules: true } },
    },
  });
  for (const c of courses) {
    console.log(
      `${c.published ? '✓' : '✗'} ${c.title} | slug=${c.slug} | id=${c.id} | enroll=${c._count.enrollments} | mod=${c._count.modules} | ext=${c.externalUrl ?? 'no'}`,
    );
  }
  console.log('\nHomepageSections:');
  const sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  for (const s of sections) {
    console.log(JSON.stringify(s, null, 2));
  }
  await prisma.$disconnect();
}

main();
