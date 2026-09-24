import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { CONNECT_HOST, CONNECT_URL, SITE_URL } from '@/lib/site';
import { getIndexableCoursesSafe, isApplyOnly } from '@/lib/public-courses';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? '';
  if (host === CONNECT_HOST) {
    return [{ url: CONNECT_URL, changeFrequency: 'monthly', priority: 1 }];
  }

  const courses = await getIndexableCoursesSafe();
  const latest = courses.reduce<Date | undefined>(
    (max, c) => (!max || c.updatedAt > max ? c.updatedAt : max),
    undefined,
  );

  return [
    { url: SITE_URL, lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/courses`, lastModified: latest, changeFrequency: 'weekly', priority: 0.9 },
    ...courses.map((c) => ({
      url: `${SITE_URL}/courses/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...courses.filter(isApplyOnly).map((c) => ({
      url: `${SITE_URL}/apply/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    })),
  ];
}
