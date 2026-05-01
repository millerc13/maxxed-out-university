/**
 * Seed per-course checkoutBullets with bullets that match each course's
 * actual offer/description, so the admin editor shows them pre-filled
 * (instead of falling back to the generic legacy defaults).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PER_COURSE: Record<string, string[]> = {
  // 6 Month Mentorship — high-touch coaching
  '6-month-mentorship': [
    '6 monthly 1-on-1 calls with Todd',
    'Monthly private group training sessions',
    'Real Estate Empire Blueprint course included',
    "Access to Todd's private network & community",
    'Lifetime access to all materials and tools',
    'Choose your path — real estate, healthcare, coaching & more',
  ],

  // $50k Done-For-You Accelerator + Mentorship
  'business-accelerator-mentorship': [
    'Custom funnel + landing page built for you',
    'Video Sales Letter + Meta ad creatives',
    'White-labeled CRM + automation system',
    '90 days Meta ads management included',
    '6 months 1-on-1 mentorship with Todd',
    'Lifetime access to all materials & tools',
    '30-day money back guarantee',
  ],

  // $35k Accelerator-only (no mentorship)
  'business-accelerator': [
    'Custom funnel + landing page built for you',
    'Video Sales Letter + Meta ad creatives',
    'White-labeled CRM + automation system',
    '90 days Meta ads management included',
    '6 months ongoing support & optimization',
    'Lifetime access to all materials & tools',
    '30-day money back guarantee',
  ],

  // Real Estate Empire Blueprint — self-serve course
  'real-estate-empire-blueprint': [
    'Step-by-step real estate framework',
    'Deal analysis tools, templates & scripts',
    'Lifetime access on all devices',
    'Certificate of completion',
    '30-day money back guarantee',
  ],

  // Done With You Medicaid Business System
  'medicaid-business-system': [
    'Done-with-you Medicaid business buildout',
    'Monthly 1-on-1 mentorship with Todd',
    'Direct access to my private network',
    '6–12 month buildout, first 90 days intensive',
    'Application required — white-glove experience',
  ],
};

async function main() {
  let updated = 0;
  for (const [slug, bullets] of Object.entries(PER_COURSE)) {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      console.log(`  miss ${slug} — course not found`);
      continue;
    }
    await prisma.course.update({
      where: { id: course.id },
      data: { checkoutBullets: bullets },
    });
    console.log(`  ✓ ${slug} (${course.title}) — ${bullets.length} bullets`);
    updated++;
  }
  console.log(`\nUpdated ${updated} courses.`);
  await prisma.$disconnect();
}

main();
