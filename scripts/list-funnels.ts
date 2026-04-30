import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const funnels = await prisma.funnelDeployment.findMany({
    include: {
      config: true,
      course: { select: { id: true, title: true, slug: true } },
    },
  });
  for (const f of funnels) {
    console.log(
      JSON.stringify(
        {
          id: f.id,
          name: f.name,
          subdomain: f.subdomain,
          url: f.url,
          courseId: f.courseId,
          courseSlug: f.course?.slug,
          active: f.active,
          template: f.config?.template,
        },
        null,
        2,
      ),
    );
  }
  const accel = await prisma.course.findFirst({
    where: { slug: 'business-accelerator' },
    select: { id: true, title: true, slug: true, published: true, price: true },
  });
  console.log('\nAccelerator course:', JSON.stringify(accel, null, 2));
  await prisma.$disconnect();
}

main();
