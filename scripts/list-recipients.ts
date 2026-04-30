import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recipients = await prisma.notificationRecipient.findMany({
    orderBy: { createdAt: 'asc' },
  });
  for (const r of recipients) {
    console.log(
      JSON.stringify(
        {
          id: r.id,
          label: r.label,
          phone: r.phone,
          active: r.active,
          notifyOnLead: r.notifyOnLead,
          notifyOnSale: r.notifyOnSale,
          sources: r.sources,
        },
        null,
        2,
      ),
    );
  }
  await prisma.$disconnect();
}

main();
