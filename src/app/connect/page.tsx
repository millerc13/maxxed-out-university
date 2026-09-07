import type { Metadata, Viewport } from 'next';
import { ConnectClient } from '@/components/connect/ConnectClient';

/**
 * connect.maxxedout.com — Kansas event QR landing page.
 * Two options: work directly with Todd, or get his socials by text.
 * Middleware rewrites the bare connect.maxxedout.com host here.
 */
export const metadata: Metadata = {
  title: 'Connect with Todd Pultz | Maxxed Out',
  description: 'Work directly with Todd or get his social links by text.',
};

export const viewport: Viewport = {
  // Safari paints the notch/safe-area with this — must match the page's
  // pure white (body default is #f5f5f5, which reads as a gray strip).
  themeColor: '#ffffff',
};

export const dynamic = 'force-static';

export default function ConnectPage() {
  return <ConnectClient />;
}
