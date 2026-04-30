/**
 * Refresh the accelerator FunnelConfig text to reflect the new
 * (mentorship-free) description language.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const funnel = await prisma.funnelDeployment.findUnique({
    where: { subdomain: 'accelerator' },
    include: { config: true },
  });
  if (!funnel?.config) throw new Error('accelerator funnel config not found');

  const updated = await prisma.funnelConfig.update({
    where: { id: funnel.config.id },
    data: {
      headline: 'Ultimate Business Accelerator',
      subheadline:
        'This is not marketing. This is infrastructure — a system that runs daily, captures demand, and turns attention into booked jobs.',
      ctaText: 'Apply to Qualify',
    },
    select: { headline: true, subheadline: true, ctaText: true, template: true },
  });
  console.log('Updated FunnelConfig:', JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}

main();
