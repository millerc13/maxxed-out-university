'use client';

import { useEffect } from 'react';

/**
 * Cleanup component — DOES NOT register a new service worker. Earlier
 * deploys shipped a SW that aggressively cached HTML; visitors who
 * had it installed were getting stale pages that didn't reflect
 * fixes. This component now proactively unregisters any existing SW
 * and clears every Cache Storage bucket on mount, so regular browser
 * behavior returns: every page load hits the network.
 *
 * PWA "Add to Home Screen" still works — the web app manifest at
 * /manifest.webmanifest is enough for installation prompts.
 * We've just dropped offline mode until we choose to bring it back.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});

    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);

  return null;
}
