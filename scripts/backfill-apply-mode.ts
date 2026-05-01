import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.course.updateMany({
    where: { externalUrl: { not: null }, applyMode: false },
    data: { applyMode: true },
  });
  console.log(`Backfilled applyMode=true on ${updated.count} courses with externalUrl set.`);
  await prisma.$disconnect();
}

main();
