'use client';

import posthog from 'posthog-js';
import { PostHogProvider as BasePostHogProvider } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}
