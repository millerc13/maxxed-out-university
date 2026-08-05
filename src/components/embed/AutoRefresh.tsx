'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-fetches the widget's server data every `minutes` without a full reload. */
export function AutoRefresh({ minutes = 5 }: { minutes?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), minutes * 60_000);
    return () => clearInterval(id);
  }, [router, minutes]);
  return null;
}
