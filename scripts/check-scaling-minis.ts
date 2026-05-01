import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'scaling-to-a-real-business' },
    include: { modules: { include: { lessons: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
  });
  if (!course) { console.error('not found'); process.exit(1); }
  for (const m of course.modules) {
    console.log(`Module ${m.order}: "${m.title}"`);
    for (const l of m.lessons) {
      console.log(`  ${m.order}.${l.order} "${l.title}" id=${l.id} published=${l.isPublished}`);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
