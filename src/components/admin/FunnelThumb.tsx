'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';

/**
 * Live thumbnail of a funnel's landing page. Renders the real site in an
 * iframe at desktop width (1280px) and scales it down to the card width so
 * you can recognize each funnel at a glance. Pointer events are disabled so
 * the thumbnail is purely visual — the card handles the click.
 */
export function FunnelThumb({ url }: { url: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const BASE = 1280;
  const FRAME_H = 860; // slice of the page captured (hero + a bit below)
  const scale = width > 0 ? width / BASE : 0;

  // Tag the preview load so the funnel app can skip PostHog capture (and any
  // other side effects) for these admin thumbnails — otherwise every time
  // someone opens this page we'd log 5 phantom pageviews per funnel.
  // The funnel app should also guard on `window.top !== window.self`.
  const src = url
    ? `${url}${url.includes('?') ? '&' : '?'}preview=1`
    : null;

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-gray-100"
      style={{ aspectRatio: '16 / 10' }}
    >
      {!src || failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1.5">
          <Globe className="w-7 h-7 text-gray-300" />
          <span className="text-[11px]">{url ? 'Preview unavailable' : 'No URL set'}</span>
        </div>
      ) : scale > 0 ? (
        <iframe
          src={src}
          title="Funnel preview"
          loading="lazy"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
          onError={() => setFailed(true)}
          style={{
            width: BASE,
            height: FRAME_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 0,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {/* subtle top sheen so overlaid text/badges stay legible */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/10 to-transparent" />
    </div>
  );
}
