import type { Metadata, Viewport } from 'next';
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
  // PWA: iOS-specific install meta tags (status-bar style, home-screen
  // title, capable flag). Android picks everything up from the
  // manifest at /manifest.webmanifest, which Next links automatically.
  appleWebApp: {
    capable: true,
    title: 'Maxxed Out',
    statusBarStyle: 'black-translucent',
  },
  // Apple Touch icon for the iOS home screen. 180×180 is the size iOS
  // actually uses; smaller sizes are derived by the OS.
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
        url: 'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/6938430a35652be0d603e258.jpeg',
        width: 1200,
        height: 630,
        alt: 'MaxxedOut Training Center',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Training Center | MaxxedOut',
    description: 'Business education and training for serious entrepreneurs',
    images: ['https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/6938430a35652be0d603e258.jpeg'],
  },
};

// Theme color tints the OS chrome when launched as a PWA. Android
// uses it for the status bar; iOS standalone uses it as the title bar
// background. Lives on `viewport`, not `metadata`, per Next.js 14+ API.
export const viewport: Viewport = {
  themeColor: '#0000FF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
