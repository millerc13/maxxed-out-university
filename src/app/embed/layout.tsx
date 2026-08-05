import type { Metadata } from 'next';

/**
 * /embed/* — key-gated dashboard widgets iframed into GoHighLevel.
 * Public path (outside middleware's protected routes) on purpose; each
 * page verifies its own ?k= HMAC key. Never indexed.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Maxxed Out — Dashboard Widget',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
