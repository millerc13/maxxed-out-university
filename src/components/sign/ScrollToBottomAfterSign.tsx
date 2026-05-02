'use client';

import { useEffect } from 'react';

/**
 * On first mount, smooth-scroll to the bottom of the document IF the
 * sessionStorage flag set by SigningPageClient.handleAdopt() is
 * present. Used on the signed-state branch of /sign/[token] so the
 * user lands on the green Download PDF banner at the bottom right
 * after adopting their signature — they don't have to scroll past the
 * whole contract to find it.
 *
 * Idempotent — clears the flag after firing, so reloading the URL
 * later doesn't keep auto-scrolling.
 */
export function ScrollToBottomAfterSign() {
  useEffect(() => {
    let flag: string | null = null;
    try {
      flag = sessionStorage.getItem('esign:justSigned');
      if (flag) sessionStorage.removeItem('esign:justSigned');
    } catch {
      /* private mode — no-op */
    }
    if (!flag) return;
    // Wait one frame so the new server-rendered DOM has laid out and
    // document.body.scrollHeight reflects the full signed-page content
    // (banner top → contract → banner bottom), then smooth-scroll.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      });
    });
  }, []);
  return null;
}
