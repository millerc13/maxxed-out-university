/**
 * Next.js 15 auto-loaded client instrumentation.
 * Initializes PostHog once per browser session. Pageviews are captured
 * manually via PostHogPageView so App Router soft-navigations fire too.
 * /ph is proxied to PostHog in next.config.ts to sidestep ad-blockers.
 */
import posthog from 'posthog-js';

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: '/ph',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
  });
}
