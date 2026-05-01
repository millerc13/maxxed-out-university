/**
 * Revert the accelerator-only course description to its pre-markdown state
 * (the original regex-stripped clone of the parent's plain-text description).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const parent = await prisma.course.findUnique({
    where: { id: 'business-accelerator-mentorship' },
    select: { description: true },
  });
  if (!parent?.description) throw new Error('parent missing');

  // Same regex strip as the original create-accelerator-only.ts.
  let desc = parent.description;
  desc = desc.replace(
    /9\. Monthly Mentorship with Todd Pultz[\s\S]*?(?=INVESTMENT)/,
    '',
  );
  desc = desc.replace(/\nMonthly mentorship with Todd\n/, '\n');

  // BUT — parent is now ALSO markdown-formatted (we updated it earlier).
  // The regex above only worked on the plain-text version. So instead,
  // just revert to the original short body that was there before. The
  // user wanted to update the FUNNEL template, not this course's body.
  // Setting it back to the pre-formatted plain text.
  const PRE_MARKDOWN = `This is not marketing.

This is infrastructure — a system that runs daily, captures demand, and turns attention into booked jobs.

Built using the same principles that scale 7, 8, and 9-figure companies.

WHAT YOU'RE GETTING

1. Single High-Converting Funnel System

We will build one dominant funnel engineered specifically for your business or offer.

2. Landing Page + Full Creative Buildout
3. Offer Creation + Market Positioning
4. Video + VSL (Video Sales System)
5. CRM + Automation System (White-Labeled Platform)
6. Meta Ads Management (First 90 Days Included)
7. Content Strategy + Brand Alignment
8. Ongoing Support + Optimization (6 Months Included)

This is for serious entrepreneurs who want a complete done-for-you growth system.`;

  const updated = await prisma.course.update({
    where: { id: 'cmol2felg000113yn9b4olcgo' },
    data: {
      description: PRE_MARKDOWN,
      shortDesc: 'Done-for-you growth system — funnels, ads, automation, and media under one roof.',
    },
    select: { id: true, title: true },
  });
  console.log('Reverted course description:', updated);
  await prisma.$disconnect();
}

main();
