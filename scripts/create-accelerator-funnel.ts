/**
 * One-shot: create the accelerator FunnelDeployment + FunnelConfig.
 *
 * - Subdomain: `accelerator` (so the funnel app's host detection picks
 *   `accelerator.maxxedout.com` and `accelerator.localhost`)
 * - Course: `cmokzf2860001my1y1nqghqpx` (Business Accelerator & Mentorship,
 *   $50,000, published)
 * - Template: `accelerator` (the new TemplateAccelerator with stage-sell
 *   ported sections)
 *
 * Idempotent — if the row already exists, we leave it alone and just print
 * the current state. Won't touch any of the other 3 FunnelDeployment rows.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUBDOMAIN = 'accelerator';
const COURSE_ID = 'cmokzf2860001my1y1nqghqpx';

async function main() {
  const existing = await prisma.funnelDeployment.findUnique({
    where: { subdomain: SUBDOMAIN },
    include: { config: true, course: { select: { id: true, slug: true, title: true } } },
  });

  if (existing) {
    console.log('FunnelDeployment already exists for subdomain=accelerator:');
    console.log(JSON.stringify(existing, null, 2));
    await prisma.$disconnect();
    return;
  }

  const course = await prisma.course.findUnique({
    where: { id: COURSE_ID },
    select: { id: true, slug: true, title: true, published: true },
  });
  if (!course) {
    throw new Error(`Course ${COURSE_ID} not found — bailing out`);
  }
  console.log(`Linking new funnel to course: ${course.title} (slug=${course.slug})`);

  const funnel = await prisma.funnelDeployment.create({
    data: {
      name: 'Ultimate Business Accelerator',
      url: 'https://accelerator.maxxedout.com',
      subdomain: SUBDOMAIN,
      courseId: COURSE_ID,
      active: true,
      config: {
        create: {
          headline: 'Ultimate Business Accelerator',
          subheadline:
            "For founders doing $20K+/mo who are tired of stitching together freelancers, agencies, and SaaS tools.",
          ctaText: 'Apply to Qualify',
          template: 'accelerator',
        },
      },
    },
    include: { config: true },
  });

  console.log('Created FunnelDeployment:');
  console.log(JSON.stringify(funnel, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
