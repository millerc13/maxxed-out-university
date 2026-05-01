import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HERO_STATS = [
  { iconName: 'Calendar', iconColor: 'text-blue-300', label: '6 months of mentorship' },
  { iconName: 'Phone', iconColor: 'text-maxxed-gold', label: 'Monthly 1-on-1 with Todd' },
  { iconName: 'Users', iconColor: 'text-green-400', label: 'Private community access' },
  { iconName: 'Infinity', iconColor: 'text-purple-400', label: 'Lifetime access' },
];

async function main() {
  const updated = await prisma.course.update({
    where: { id: 'ht_mentorship_12mo' },
    data: { heroStats: HERO_STATS },
    select: { id: true, title: true, heroStats: true },
  });
  console.log(JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}

main();
