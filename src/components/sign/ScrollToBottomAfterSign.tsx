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
 *
 * Robustness: re-issues the scroll a few times over the first ~1s
 * because the contract HTML can lay out incrementally (image loads,
 * font swap), and a single scrollTo right after mount lands too high.
 * Each retry uses the latest scrollHeight so the final position is
 * actually the bottom.
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

    // Issue the scroll at three escalating delays. Each one uses the
    // current document height, so the final scroll always lands at
    // the actual bottom even if late layout (images, web fonts)
    // lengthened the page. iOS Safari occasionally ignores a single
    // smooth scroll triggered too early, so the multi-shot is a
    // belt-and-suspenders approach.
    const scrollNow = () => {
      const h = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
      );
      window.scrollTo({ top: h, behavior: 'smooth' });
    };
    const t0 = setTimeout(scrollNow, 50);
    const t1 = setTimeout(scrollNow, 400);
    const t2 = setTimeout(scrollNow, 1000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return null;
}
