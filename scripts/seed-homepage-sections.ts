// One-shot migration: create the default homepage sections and assign
// every existing published course to the section it'd fall into under the
// old price-tier logic. After this runs, / and /courses look identical to
// before — but every assignment is now editable via /admin/homepage.
//
// Re-running is safe: skips sections that already exist, and only assigns
// courses that don't yet have a homepageSectionId.
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Mirrors the old PRICE_TIERS constant (values in cents).
const TIER_BOUNDARIES = {
  LOW_MAX: 9700,        // ≤ $97
  MID_MAX: 150000,      // $97.01 – $1,500
  HIGH_MAX: 2500000,    // $1,500.01 – $25,000
  // > $25,000 → Elite
};

// Order matches the order they currently render on / today.
const DEFAULT_SECTIONS = [
  {
    key: 'elite',
    title: 'Elite Access',
    description: 'Direct mentorship and partnerships',
    iconName: 'Crown',
    iconColor: 'text-[#D4AF37]',
    order: 1,
  },
  {
    key: 'partnership',
    title: 'Partnership Programs',
    description: 'Work with Todd to build your business',
    iconName: 'Handshake',
    iconColor: 'text-[#0000CC]',
    order: 2,
  },
  {
    key: 'full',
    title: 'Full Courses',
    description: 'Complete multi-module programs',
    iconName: 'Star',
    iconColor: 'text-amber-500',
    order: 3,
  },
  {
    key: 'core',
    title: 'Core Training',
    description: 'Deep-dive courses to build your skills',
    iconName: 'Flame',
    iconColor: 'text-orange-500',
    order: 4,
  },
  {
    key: 'quick',
    title: 'Quick Start Guides & Tools',
    description: 'Bite-sized training to get you moving fast',
    iconName: 'Zap',
    iconColor: 'text-[#0000CC]',
    order: 5,
  },
  {
    key: 'free',
    title: 'Free Resources',
    description: 'Start learning for free',
    iconName: 'Sparkles',
    iconColor: 'text-green-500',
    order: 6,
  },
];

function classify(course: {
  price: number | null;
  isBundle: boolean;
  externalUrl: string | null;
}): string | null {
  // External / partner programs (e.g. Healthcare) → Partnership Programs
  if (course.externalUrl) return 'partnership';
  if (course.isBundle) return 'full';
  if (course.price == null) return 'free';
  if (course.price > TIER_BOUNDARIES.HIGH_MAX) return 'elite';
  if (course.price > TIER_BOUNDARIES.MID_MAX) return 'partnership';
  if (course.price > TIER_BOUNDARIES.LOW_MAX) return 'core';
  return 'quick';
}

async function main() {
  console.log('Seeding default homepage sections…');
  const keyToId: Record<string, string> = {};

  for (const def of DEFAULT_SECTIONS) {
    // Match by title (no key column) — sections are admin-editable so the
    // title is the only stable identifier we have. Skip if already exists.
    const existing = await prisma.homepageSection.findFirst({
      where: { title: def.title },
    });
    if (existing) {
      keyToId[def.key] = existing.id;
      console.log(`  · "${def.title}" already exists (${existing.id})`);
      continue;
    }
    const created = await prisma.homepageSection.create({
      data: {
        title: def.title,
        description: def.description,
        iconName: def.iconName,
        iconColor: def.iconColor,
        order: def.order,
      },
    });
    keyToId[def.key] = created.id;
    console.log(`  + created "${def.title}" (${created.id})`);
  }

  console.log('\nAssigning existing courses to sections (only those without an assignment)…');
  const courses = await prisma.course.findMany({
    where: { homepageSectionId: null },
    select: {
      id: true,
      title: true,
      price: true,
      isBundle: true,
      externalUrl: true,
      order: true,
    },
  });
  console.log(`  ${courses.length} unassigned courses found`);

  let assigned = 0;
  for (const c of courses) {
    const key = classify(c);
    if (!key) continue;
    const sectionId = keyToId[key];
    if (!sectionId) continue;
    await prisma.course.update({
      where: { id: c.id },
      data: { homepageSectionId: sectionId, homepageOrder: c.order },
    });
    assigned++;
    console.log(`  → "${c.title}" → ${key}`);
  }

  console.log(`\nDone. Assigned ${assigned} course(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
