import { CONNECT_URL, SITE_URL, TODD_SITE_URL } from '@/lib/site';
import { effectivePriceCents, factualSummary, isApplyOnly } from '@/lib/public-courses';

// Canonical entity @ids. The full Person / parent Organization nodes live on
// toddpultz.com only; every other Todd property references them by @id.
export const TODD_ID = `${TODD_SITE_URL}/#todd`;
export const MAXXEDOUT_ID = `${TODD_SITE_URL}/#maxxedout`;
export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const ORG_NAME = 'Maxxed Out University';
const ORG_DESCRIPTION = 'Business education and training for serious entrepreneurs.';

export const toddRef = { '@type': 'Person', '@id': TODD_ID, name: 'Todd Pultz', url: TODD_SITE_URL };
export const maxxedOutRef = { '@type': 'Organization', '@id': MAXXEDOUT_ID, name: 'Maxxed Out', url: TODD_SITE_URL };
export const orgRef = { '@type': 'EducationalOrganization', '@id': ORG_ID, name: ORG_NAME, url: SITE_URL };

type JsonLdObject = Record<string, unknown>;

/** Serialize for a <script type="application/ld+json"> body; escapes `<` so no string can close the tag. */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function abs(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function universityGraph(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': ORG_ID,
        name: ORG_NAME,
        alternateName: 'Maxxed Out',
        url: SITE_URL,
        description: ORG_DESCRIPTION,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 },
        image: `${SITE_URL}/images/og-image-university.png`,
        email: 'support@maxxedout.com',
        parentOrganization: maxxedOutRef,
        founder: toddRef,
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: ORG_NAME,
        description: ORG_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

export function breadcrumbList(items: { name: string; url: string }[]): JsonLdObject {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

export function courseListGraph(courses: { slug: string; title: string }[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/courses#list`,
        name: 'Maxxed Out University courses',
        itemListElement: courses.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/courses/${c.slug}`,
          name: c.title,
        })),
      },
      breadcrumbList([
        { name: 'Home', url: '/' },
        { name: 'Courses', url: '/courses' },
      ]),
    ],
  };
}

/** ISO-8601 duration, e.g. 5400s -> PT1H30M. */
function isoDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `PT${h > 0 ? `${h}H` : ''}${m > 0 || h === 0 ? `${m}M` : ''}`;
}

export interface CourseJsonLdInput {
  slug: string;
  title: string;
  shortDesc: string | null;
  description: string | null;
  thumbnail: string | null;
  price: number | null;
  salePrice: number | null;
  applyMode: boolean;
  checkoutAfterApply: boolean;
  totalDurationSeconds: number;
}

type CanonicalOffer =
  | { kind: 'Course'; id: string; name: string; url: string; description: string }
  | { kind: 'Service'; id: string; name: string; url: string; description: string; serviceType: string };

/**
 * Offers that also have their own funnel site. toddpultz.com (lib/seo.ts
 * OFFERINGS) owns these @ids and the university-funnel repo emits the same
 * nodes, so name/description/type/provider are copied verbatim from there:
 * one @id must never carry two different names. Keyed by the Course slug each
 * FunnelDeployment points at.
 */
const CANONICAL_OFFERS: Record<string, CanonicalOffer> = {
  'real-estate-empire-blueprint': {
    kind: 'Course',
    id: 'https://blueprint.maxxedout.com/#course',
    name: 'Real Estate Empire Blueprint',
    url: 'https://blueprint.maxxedout.com',
    description:
      'Online real estate investing course: 10 video modules with calculators, templates and lifetime access.',
  },
  '6-month-mentorship': {
    kind: 'Service',
    id: 'https://mentorship.maxxedout.com/#service',
    name: '6 Month Business Mentorship with Todd',
    serviceType: 'Business mentorship',
    url: 'https://mentorship.maxxedout.com',
    description:
      'Six-month mentorship with biweekly calls, deal reviews and network introductions. Application required.',
  },
  'business-accelerator-mentorship': {
    kind: 'Service',
    id: 'https://business-mentorship.maxxedout.com/#service',
    name: 'Business Accelerator & Mentorship',
    serviceType: 'Done-with-you marketing and mentorship',
    url: 'https://business-mentorship.maxxedout.com',
    description:
      'Done-with-you funnel, CRM, ads and creative plus six months of 1-on-1 mentorship. Application required.',
  },
  'business-accelerator': {
    kind: 'Service',
    id: 'https://accelerator.maxxedout.com/#service',
    name: 'Ultimate Business Accelerator',
    serviceType: 'Done-for-you marketing and media',
    url: 'https://accelerator.maxxedout.com',
    description:
      'Done-for-you growth system: websites, funnels, ads, automation and media under one roof. Application required.',
  },
  'inner-circle-experience': {
    kind: 'Service',
    id: 'https://experience.maxxedout.com/#service',
    name: 'Inner Circle Jet Experience',
    serviceType: 'Private mentorship experience',
    url: 'https://experience.maxxedout.com',
    description: 'Private-jet immersion and mastermind with Todd Pultz. Application required.',
  },
};

/**
 * Course + breadcrumb graph. Prices come from the DB row at request time and
 * are only emitted where /courses/[slug] renders them: self-serve courses with
 * a positive `price` (the "Get Access Now" branch). The anchor (`price` when
 * salePrice is set) is never the Offer price.
 *
 * Funnel-backed offers reference the canonical node by @id instead of minting
 * a second entity; the university page is linked to it as a WebPage `about`.
 */
export function courseGraph(c: CourseJsonLdInput): JsonLdObject {
  const url = `${SITE_URL}/courses/${c.slug}`;
  const chargeCents = effectivePriceCents(c);
  const showsPrice = !isApplyOnly(c) && !!c.price && c.price > 0 && !!chargeCents && chargeCents > 0;
  const offers = showsPrice
    ? {
        '@type': 'Offer',
        price: (chargeCents! / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        category: 'Paid',
        url,
        offeredBy: { '@id': ORG_ID },
      }
    : undefined;
  const courseInstance: JsonLdObject = { '@type': 'CourseInstance', courseMode: 'Online' };
  if (c.totalDurationSeconds > 0) courseInstance.courseWorkload = isoDuration(c.totalDurationSeconds);

  const breadcrumb = breadcrumbList([
    { name: 'Home', url: '/' },
    { name: 'Courses', url: '/courses' },
    { name: c.title, url: `/courses/${c.slug}` },
  ]);

  const canonical = CANONICAL_OFFERS[c.slug];
  if (canonical) {
    const node: JsonLdObject = {
      '@type': canonical.kind,
      '@id': canonical.id,
      name: canonical.name,
      description: canonical.description,
      url: canonical.url,
      provider: maxxedOutRef,
    };
    if (c.thumbnail) node.image = abs(c.thumbnail);
    if (canonical.kind === 'Service') {
      node.serviceType = canonical.serviceType;
    } else {
      node.inLanguage = 'en';
      node.hasCourseInstance = { ...courseInstance, instructor: toddRef };
    }
    if (offers) node.offers = offers;

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: c.title,
          inLanguage: 'en',
          isPartOf: { '@id': WEBSITE_ID },
          publisher: { '@id': ORG_ID },
          about: { '@id': canonical.id },
        },
        node,
        breadcrumb,
      ],
    };
  }

  const course: JsonLdObject = {
    '@type': 'Course',
    '@id': `${url}#course`,
    name: c.title,
    description:
      factualSummary(c.shortDesc, 500) ??
      factualSummary(c.description, 500) ??
      `${c.title}: online training from Maxxed Out University.`,
    url,
    inLanguage: 'en',
    provider: orgRef,
    publisher: { '@id': ORG_ID },
  };
  if (c.thumbnail) course.image = abs(c.thumbnail);
  if (c.totalDurationSeconds > 0) course.hasCourseInstance = courseInstance;
  if (offers) course.offers = offers;

  return {
    '@context': 'https://schema.org',
    '@graph': [course, breadcrumb],
  };
}

export function connectGraph(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${CONNECT_URL}/#webpage`,
        url: CONNECT_URL,
        name: 'Connect with Todd Pultz | Maxxed Out',
        description: 'Work directly with Todd or get his social links by text.',
        inLanguage: 'en',
        about: toddRef,
        publisher: maxxedOutRef,
      },
    ],
  };
}
