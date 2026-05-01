import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.notificationRecipient.update({
    where: { id: 'cmol25v7w0000bvkucotpoua1' },
    data: { label: 'Rebecca Nardi' },
  });
  console.log(JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}

main();
