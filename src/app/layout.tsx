import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { PostHogProvider } from './PostHogProvider';
import { PostHogPageView } from './PostHogPageView';
import { PostHogIdentify } from './PostHogIdentify';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { Suspense } from 'react';
import '@/styles/globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'Training Center | MaxxedOut',
  description: 'Business education and training for serious entrepreneurs',
  // PWA install metadata for iOS Safari "Add to Home Screen".
  // Deliberately uses statusBarStyle: 'default' (white status bar,
  // page content sits cleanly below it) — NOT 'black-translucent',
  // which overlays the status bar onto the page and would expose
  // the Header's blue brand border at the very top in standalone mode.
  appleWebApp: {
    capable: true,
    title: 'Maxxed University',
    statusBarStyle: 'default',
  },
  // Favicon / install icons. iOS uses apple-touch-180 from the home
  // screen; Android pulls icons from the manifest.
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Training Center | MaxxedOut',
    description: 'Business education and training for serious entrepreneurs',
    images: [
      {
        // Self-hosted under public/ so we own the asset (no third-party
        // bucket reaching its bandwidth cap can break our share previews).
        // Absolute URL is required — link unfurlers (iMessage, Slack, FB,
        // X, LinkedIn) ignore relative paths.
        url: 'https://university.maxxedout.com/images/og-image-university.png',
        width: 2752,
        height: 1536,
        alt: 'Maxxed Out University — Business education and training for serious entrepreneurs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Training Center | MaxxedOut',
    description: 'Business education and training for serious entrepreneurs',
    images: ['https://university.maxxedout.com/images/og-image-university.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body className={`${montserrat.variable} font-sans antialiased bg-background`}>
        <PostHogProvider>
          <SessionProvider>
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            <PostHogIdentify />
            <ServiceWorkerRegister />
            {children}
          </SessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
