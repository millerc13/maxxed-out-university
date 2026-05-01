/**
 * Seed a variety of demo promo codes so Todd can see how the admin
 * surfaces work end-to-end. Each code demonstrates a different
 * combination of features (percent vs fixed, scope, expiry, caps,
 * active/inactive).
 *
 * Idempotent: skips any code that already exists.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Demo {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number; // % 0-100, or cents for FIXED
  maxUses: number | null;
  expiresAt: Date | null;
  applyToAll: boolean;
  courseSlug?: string; // when applyToAll = false
  active: boolean;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

const DEMOS: Demo[] = [
  // ── Universal (apply to all) ─────────────────────────────────────
  {
    code: 'WELCOME10',
    description: 'New buyer welcome — 10% off any course',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxUses: null,
    expiresAt: null,
    applyToAll: true,
    active: true,
  },
  {
    code: 'TODD20',
    description: '20% off — Todd hands these out at events',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxUses: 100,
    expiresAt: daysFromNow(60),
    applyToAll: true,
    active: true,
  },
  {
    code: 'BLACKFRI25',
    description: 'Holiday seasonal — 25% off everything',
    discountType: 'PERCENTAGE',
    discountValue: 25,
    maxUses: 250,
    expiresAt: daysFromNow(30),
    applyToAll: true,
    active: true,
  },
  {
    code: 'VIP500',
    description: 'Internal $500 off — paused',
    discountType: 'FIXED',
    discountValue: 50000, // $500
    maxUses: 25,
    expiresAt: null,
    applyToAll: true,
    active: false,
  },

  // ── Course-specific ─────────────────────────────────────────────
  {
    code: 'BLUEPRINT250',
    description: 'Blueprint launch promo — $250 off',
    discountType: 'FIXED',
    discountValue: 25000,
    maxUses: 50,
    expiresAt: daysFromNow(45),
    applyToAll: false,
    courseSlug: 'real-estate-empire-blueprint',
    active: true,
  },
  {
    code: 'MENTOR2500',
    description: '6-Month Mentorship — $2,500 off for podcast guests',
    discountType: 'FIXED',
    discountValue: 250000,
    maxUses: 10,
    expiresAt: null,
    applyToAll: false,
    courseSlug: '6-month-mentorship',
    active: true,
  },
  {
    code: 'ACCEL5K',
    description: 'Business Accelerator — $5,000 launch discount',
    discountType: 'FIXED',
    discountValue: 500000,
    maxUses: 5,
    expiresAt: daysFromNow(14),
    applyToAll: false,
    courseSlug: 'business-accelerator',
    active: true,
  },
  {
    code: 'DWY3K',
    description: 'Accelerator + Mentorship — $3,000 referral discount',
    discountType: 'FIXED',
    discountValue: 300000,
    maxUses: 20,
    expiresAt: null,
    applyToAll: false,
    courseSlug: 'business-accelerator-mentorship',
    active: true,
  },
];

async function main() {
  // Cache slug → id lookup
  const slugMap = new Map<string, string>();
  const allCourses = await prisma.course.findMany({
    select: { id: true, slug: true },
  });
  for (const c of allCourses) slugMap.set(c.slug, c.id);

  let created = 0;
  let skipped = 0;
  for (const d of DEMOS) {
    const existing = await prisma.promoCode.findUnique({
      where: { code: d.code },
    });
    if (existing) {
      console.log(`  skip ${d.code} — already exists`);
      skipped++;
      continue;
    }

    let courseConnect: { connect: { id: string }[] } | undefined;
    if (!d.applyToAll && d.courseSlug) {
      const id = slugMap.get(d.courseSlug);
      if (!id) {
        console.warn(`  skip ${d.code} — course slug ${d.courseSlug} not found`);
        continue;
      }
      courseConnect = { connect: [{ id }] };
    }

    await prisma.promoCode.create({
      data: {
        code: d.code,
        description: d.description,
        discountType: d.discountType,
        discountValue: d.discountValue,
        maxUses: d.maxUses,
        expiresAt: d.expiresAt,
        applyToAll: d.applyToAll,
        active: d.active,
        ...(courseConnect && { courses: courseConnect }),
      },
    });
    console.log(
      `  + ${d.code}  (${
        d.discountType === 'PERCENTAGE'
          ? `${d.discountValue}%`
          : `$${(d.discountValue / 100).toFixed(0)}`
      }, ${d.applyToAll ? 'all courses' : d.courseSlug}, ${d.active ? 'active' : 'inactive'})`,
    );
    created++;
  }
  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
