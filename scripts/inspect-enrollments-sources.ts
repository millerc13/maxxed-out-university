import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const grouped = await prisma.enrollment.groupBy({
    by: ['source'],
    _count: { _all: true },
  });
  console.log('\n=== Enrollment source breakdown ===');
  for (const g of grouped) {
    console.log(`  ${(g.source ?? 'null').padEnd(30)} ${g._count._all}`);
  }

  // Users with ghlContactId set
  const usersWithGhl = await prisma.user.count({
    where: { ghlContactId: { not: null } },
  });
  const usersTotal = await prisma.user.count();
  console.log(`\nUsers total:                ${usersTotal}`);
  console.log(`Users with ghlContactId:    ${usersWithGhl}`);
  console.log(`Users without ghlContactId: ${usersTotal - usersWithGhl}`);

  // Sample sales — non-manual sources
  console.log('\n=== Sample non-manual enrollments (first 10) ===');
  const sales = await prisma.enrollment.findMany({
    where: {
      source: {
        notIn: ['manual', 'admin', 'manual_admin', 'admin_free', 'manual-offline'],
      },
    },
    include: {
      user: { select: { email: true, name: true, ghlContactId: true } },
      course: { select: { title: true, slug: true } },
    },
    orderBy: { enrolledAt: 'desc' },
    take: 10,
  });
  for (const e of sales) {
    console.log(
      `  ${e.user.email?.padEnd(36) ?? ''} ${(e.source ?? 'null').padEnd(15)} ${e.course.slug.padEnd(35)} ghl=${e.user.ghlContactId ? 'YES' : 'no'}`
    );
  }

  await prisma.$disconnect();
}

main();
