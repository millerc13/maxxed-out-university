import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    where: { homepageSectionId: { not: null }, thumbnail: { not: null } },
    select: { title: true, thumbnail: true },
  });
  for (const c of courses) {
    if (!c.thumbnail) continue;
    try {
      const buf = await fetch(c.thumbnail).then((r) => r.arrayBuffer());
      writeFileSync('/tmp/probe.bin', Buffer.from(buf));
      const info = execSync('file /tmp/probe.bin').toString().trim();
      const dim = info.match(/(\d+) x (\d+)/)?.slice(1, 3);
      console.log(`${c.title}: ${dim?.join('x') ?? '?'} (${dim ? (Number(dim[0]) / Number(dim[1])).toFixed(2) : '?'})`);
    } catch (e) {
      console.log(`${c.title}: ERROR ${(e as Error).message}`);
    }
  }
  unlinkSync('/tmp/probe.bin');
  await prisma.$disconnect();
}

main();
