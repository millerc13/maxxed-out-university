'use client';

import { useEffect } from 'react';

/**
 * Registers `/sw.js` in production. Returns null — side-effect only.
 * Skips dev because Next's HMR fights with SW caching locally.
 *
 * The SW is intentionally conservative — it caches static assets
 * only, never HTML — so we don't need any "skip waiting" / update
 * dance. New JS chunks pick up automatically on the next page load
 * because HTML always comes fresh from the network.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
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
