import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ids = ['ht_done_with_you', 'cmokzf2860001my1y1nqghqpx', 'cmokz2xuo00016r6vt2w6e4e1'];
  for (const id of ids) {
    const c = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        price: true,
        shortDesc: true,
        description: true,
        thumbnail: true,
      },
    });
    console.log('===', id, '===');
    console.log(JSON.stringify(c, null, 2));
    console.log();
  }
  await prisma.$disconnect();
}

main();
