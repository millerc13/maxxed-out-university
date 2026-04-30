import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PHONE = '+18508601636';
const ALL_FUNNELS = ['blueprint', 'mentorship', 'donewithyou', 'accelerator'];

async function main() {
  const existing = await prisma.notificationRecipient.findFirst({
    where: { phone: PHONE },
  });
  if (existing) {
    console.log('Rebecca already exists — updating to all funnels:');
    const updated = await prisma.notificationRecipient.update({
      where: { id: existing.id },
      data: {
        label: existing.label || 'Rebecca',
        sources: ALL_FUNNELS,
        active: true,
        notifyOnLead: true,
        notifyOnSale: true,
      },
    });
    console.log(JSON.stringify(updated, null, 2));
  } else {
    const created = await prisma.notificationRecipient.create({
      data: {
        label: 'Rebecca',
        phone: PHONE,
        sources: ALL_FUNNELS,
        active: true,
        notifyOnLead: true,
        notifyOnSale: true,
      },
    });
    console.log('Created Rebecca recipient:');
    console.log(JSON.stringify(created, null, 2));
  }
  await prisma.$disconnect();
}

main();
