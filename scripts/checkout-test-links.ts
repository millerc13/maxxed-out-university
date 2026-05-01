import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const funnels = await prisma.funnelDeployment.findMany({
    where: { active: true },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          price: true,
          published: true,
          checkoutAfterApply: true,
          externalUrl: true,
        },
      },
    },
  });

  console.log('=== FUNNEL TEST LINKS ===\n');
  for (const f of funnels) {
    const c = f.course;
    console.log(`▸ ${f.name}`);
    console.log(`  funnel landing:  http://${f.subdomain}.localhost:3001/`);
    console.log(`  funnel apply:    http://${f.subdomain}.localhost:3001/apply`);
    if (c) {
      const priceStr = c.price ? `$${(c.price / 100).toLocaleString()}` : 'free';
      console.log(`  course:          ${c.title}  (${priceStr}, ${c.published ? 'published' : 'UNPUBLISHED'})`);
      console.log(`  checkoutAfterApply: ${c.checkoutAfterApply ? 'ON' : 'OFF'}${c.externalUrl ? `   externalUrl: ${c.externalUrl}` : ''}`);
      console.log(`  university course: http://localhost:3000/courses/${c.slug}`);
      console.log(`  university apply:  http://localhost:3000/apply/${c.slug}`);
    } else {
      console.log(`  course:          (none linked)`);
    }
    console.log();
  }

  console.log('=== PROD URLS ===');
  for (const f of funnels) {
    if (f.subdomain) console.log(`  https://${f.subdomain}.maxxedout.com/`);
  }
  console.log(`  https://university.maxxedout.com/`);

  await prisma.$disconnect();
}

main();
