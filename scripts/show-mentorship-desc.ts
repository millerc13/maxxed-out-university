import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.course.findFirst({
    where: { slug: '6-month-mentorship' },
    select: { description: true },
  });
  console.log(c?.description);
  await prisma.$disconnect();
}

main();
