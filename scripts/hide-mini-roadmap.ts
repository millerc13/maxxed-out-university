import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.lesson.update({
    where: { id: 'mini_cmixs8p4u002ngxwaxg50se7y' },
    data: { isPublished: false },
    select: { id: true, title: true, isPublished: true },
  });
  console.log(`✓ hid mini "${updated.title}" (id=${updated.id}) published=${updated.isPublished}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
