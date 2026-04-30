import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.course.update({
    where: { id: 'cmokzf2860001my1y1nqghqpx' },
    data: { published: false },
    select: { id: true, title: true, slug: true, published: true },
  });
  console.log('Updated:', updated);
  await prisma.$disconnect();
}

main();
