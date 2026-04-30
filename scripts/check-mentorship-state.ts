import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.course.findUnique({
    where: { id: 'ht_mentorship_12mo' },
    select: { id: true, heroStats: true, externalUrl: true, price: true, slug: true, title: true },
  });
  console.log(JSON.stringify(c, null, 2));
  await prisma.$disconnect();
}
main();
