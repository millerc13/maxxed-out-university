'use client';

import { useEffect } from 'react';

/**
 * Registers `/sw.js` once per page load. Mounts an empty fragment —
 * the side-effect is the registration. Skips dev (the Next dev server
 * serves stale chunks that confuse the SW cache logic) so devs aren't
 * fighting the cache locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Don't register in dev — `process.env.NODE_ENV` is replaced at
    // build time so this branch is dead-code-eliminated in prod.
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // If a new SW is already waiting (because the user has the
          // app open across deploys), nudge it to take over.
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                installing.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch((err) => {
          // Don't crash the UI on a registration failure — the app
          // still works fine without offline support.
          console.warn('[sw] register failed', err);
        });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return null;
}
