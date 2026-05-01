import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const prisma = new PrismaClient();

async function probe(label: string, url: string | null) {
  if (!url) {
    console.log(`${label}: NO THUMBNAIL`);
    return;
  }
  try {
    const buf = await fetch(url).then((r) => r.arrayBuffer());
    writeFileSync('/tmp/probe.bin', Buffer.from(buf));
    const info = execSync('file /tmp/probe.bin').toString().trim();
    const dim = info.match(/(\d+)\s*x\s*(\d+)/)?.slice(1, 3);
    const ratio = dim ? (Number(dim[0]) / Number(dim[1])).toFixed(3) : '?';
    console.log(`${label}: ${dim?.join('x') ?? '?'} ratio=${ratio}`);
    console.log(`   url: ${url}`);
  } catch (e) {
    console.log(`${label}: ERROR ${(e as Error).message}`);
  }
}

async function main() {
  const slugs = [
    'real-estate-empire-blueprint',
    'business-accelerator-mentorship',
    'medicaid-business-system',
    '6-month-mentorship',
    'business-accelerator',
  ];
  for (const slug of slugs) {
    const c = await prisma.course.findFirst({
      where: { slug },
      select: { title: true, thumbnail: true },
    });
    if (!c) {
      console.log(`${slug}: NOT FOUND`);
      continue;
    }
    await probe(`${slug} (${c.title})`, c.thumbnail);
  }
  unlinkSync('/tmp/probe.bin');
  console.log(`\naspect-video target ratio = ${(16 / 9).toFixed(3)}`);
  await prisma.$disconnect();
}

main();
