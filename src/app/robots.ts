import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { CONNECT_HOST, CONNECT_URL, SITE_URL, isIndexableEnv } from '@/lib/site';

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Bingbot',
];

// /certificates and /apply/cohort are intentionally NOT listed for `*`: both
// carry a noindex meta instead, and link unfurlers (LinkedInBot, Zoom,
// iMessage) honor robots.txt, so disallowing them would break share previews.
// AI fetchers can ignore meta robots, so certificates (which show a student's
// name) are disallowed for them via AI_ONLY_PRIVATE.
const UNIVERSITY_PRIVATE = [
  '/admin',
  '/api/',
  '/embed',
  '/dashboard',
  '/learn',
  '/progress',
  '/tools',
  '/login',
  '/auth',
  '/setup-password',
  '/change-password',
  '/forgot-password',
  '/reset-password',
  '/a/',
  '/c/',
  '/sign/',
  '/pay/',
  '/checkout',
  '/cohort/',
  '/cohort-contacted',
  '/cohort-send',
  '/dd-leads',
  '/ph/',
  '/courses/*/lessons/',
  '/courses/*/quiz/',
  '/*?*previewAs=',
];

const AI_ONLY_PRIVATE = ['/certificates/'];

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? '';
  if (!isIndexableEnv()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  const isConnect = host === CONNECT_HOST;
  const disallow = isConnect ? ['/api/'] : UNIVERSITY_PRIVATE;

  // Crawlers that match a named group ignore the `*` group, so each group
  // repeats the full disallow list.
  return {
    rules: [
      { userAgent: AI_CRAWLERS, allow: '/', disallow: isConnect ? disallow : [...disallow, ...AI_ONLY_PRIVATE] },
      { userAgent: '*', allow: '/', disallow },
    ],
    sitemap: `${isConnect ? CONNECT_URL : SITE_URL}/sitemap.xml`,
  };
}
