'use client';

import { useEffect } from 'react';

/**
 * Hands off to the phone app.
 *
 * Fires once on mount so tapping the Slack button goes straight to the dialer,
 * and still renders a full-size anchor: the auto-handoff is silently ignored on
 * desktop and in some in-app browsers, and a closer who lands here with nothing
 * to tap has hit a dead end mid-call-block.
 */
export function CohortCallDialer({ tel }: { tel: string }) {
  useEffect(() => {
    window.location.href = `tel:${tel}`;
  }, [tel]);

  return (
    <>
      <a
        href={`tel:${tel}`}
        className="mt-5 block w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:bg-emerald-700"
      >
        📞 Tap to call
      </a>
      <p className="mt-2 text-xs text-gray-400">
        Your phone app should open automatically. If it didn&apos;t, tap above.
      </p>
    </>
  );
}
