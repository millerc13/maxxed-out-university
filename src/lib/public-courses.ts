import { prisma } from '@/lib/prisma';

// Programs that always go through the apply flow (1:1 coaching), even if the
// course-level applyMode toggle hasn't been flipped.
export const HIGH_TICKET_SLUGS = new Set([
  'done-with-you-real-estate-business',
  '6-month-mentorship',
  'business-mentorship',
]);

type ApplyFields = {
  slug: string;
  applyMode?: boolean | null;
  checkoutAfterApply?: boolean | null;
};

export function isApplyOnly(c: ApplyFields): boolean {
  return c.applyMode === true || c.checkoutAfterApply === true || HIGH_TICKET_SLUGS.has(c.slug);
}

/** salePrice (when set) is the actual charge; price is then only the struck-through anchor. */
export function effectivePriceCents(c: { price: number | null; salePrice: number | null }): number | null {
  return c.salePrice ?? c.price;
}

/**
 * Page-level mirror of getIndexableCourses' where clause, for metadata robots
 * on /courses/[slug] and /apply/[slug]. Callers must already have filtered on
 * published: true.
 */
export function isIndexableCourse(c: {
  comingSoon: boolean;
  externalUrl: string | null;
  homepageSection: { published: boolean } | null;
}): boolean {
  return !c.comingSoon && !c.externalUrl && c.homepageSection?.published === true;
}

/**
 * Courses with a real public detail page: published, not coming soon, not an
 * external redirect, and placed in a published catalog section (a null
 * section means hidden / admin-only product).
 */
export async function getIndexableCourses() {
  const courses = await prisma.course.findMany({
    where: {
      published: true,
      comingSoon: false,
      externalUrl: null,
      homepageSection: { is: { published: true } },
    },
    orderBy: [{ homepageSection: { order: 'asc' } }, { homepageOrder: 'asc' }],
    select: {
      slug: true,
      title: true,
      shortDesc: true,
      description: true,
      thumbnail: true,
      price: true,
      salePrice: true,
      applyMode: true,
      checkoutAfterApply: true,
      updatedAt: true,
    },
  });
  return courses;
}

export type IndexableCourse = Awaited<ReturnType<typeof getIndexableCourses>>[number];

/** Same as getIndexableCourses but never throws — for sitemap/llms.txt, which must not 500 on a DB outage. */
export async function getIndexableCoursesSafe(): Promise<IndexableCourse[]> {
  try {
    return await getIndexableCourses();
  } catch (error) {
    console.error('[seo] getIndexableCourses failed:', error);
    return [];
  }
}

export function plainSummary(text: string | null | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const clean = text
    .replace(/[#*_`>\[\]]/g, '')
    .replace(/\(https?:[^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// Admin-written course copy sometimes carries marketing self-claims ("ultimate",
// "proven", unit counts). Structured data and llms.txt state facts only, so
// such copy is dropped there (the page itself still shows it).
const SELF_CLAIM = /\b(ultimate|best|top|number one|proven|most|leading|like a pro|guarantee[ds]?|max(imum)? profit)\b|\d[\d,]*\+/i;

/** plainSummary, minus copy containing self-claims; always ends with sentence punctuation. */
export function factualSummary(text: string | null | undefined, max = 160): string | undefined {
  const summary = plainSummary(text, max);
  if (!summary || SELF_CLAIM.test(summary)) return undefined;
  return /[.!?…]$/.test(summary) ? summary : `${summary}.`;
}
