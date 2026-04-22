'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePostHog } from 'posthog-js/react';

/**
 * Links PostHog events to the logged-in user so we can see per-user
 * funnels (enrollment → first-lesson → completion). On sign-out we reset
 * so the browser starts a fresh anonymous identity.
 */
export function PostHogIdentify() {
  const { data: session, status } = useSession();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog || status === 'loading') return;
    const userId = session?.user?.id;
    if (userId) {
      posthog.identify(userId, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
    } else {
      posthog.reset();
    }
  }, [posthog, session, status]);

  return null;
}
