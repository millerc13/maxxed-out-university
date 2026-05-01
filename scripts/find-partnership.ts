import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { title: { contains: 'partnership', mode: 'insensitive' } },
        { title: { contains: 'accelerator', mode: 'insensitive' } },
        { slug: { contains: 'partnership', mode: 'insensitive' } },
        { slug: { contains: 'accelerator', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      price: true,
      _count: { select: { enrollments: true, modules: true } },
    },
  });
  for (const c of courses) {
    console.log(JSON.stringify(c, null, 2));
  }
  await prisma.$disconnect();
}

main();
