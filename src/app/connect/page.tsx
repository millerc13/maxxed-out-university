import type { Metadata, Viewport } from 'next';
import { ConnectClient } from '@/components/connect/ConnectClient';

/**
 * connect.maxxedout.com — Kansas event QR landing page.
 * Two options: work directly with Todd, or get his socials by text.
 * Middleware rewrites the bare connect.maxxedout.com host here.
 */
const OG_IMAGE = 'https://university.maxxedout.com/images/kansas-flyer-og.jpg';

export const metadata: Metadata = {
  title: 'Connect with Todd Pultz | Maxxed Out',
  description: 'Work directly with Todd or get his social links by text.',
  openGraph: {
    title: 'Connect with Todd Pultz | Maxxed Out',
    description: 'Work directly with Todd or get his social links by text.',
    url: 'https://connect.maxxedout.com',
    siteName: 'Maxxed Out',
    images: [{ url: OG_IMAGE, width: 1200, height: 1200 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect with Todd Pultz | Maxxed Out',
    description: 'Work directly with Todd or get his social links by text.',
    images: [OG_IMAGE],
  },
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
