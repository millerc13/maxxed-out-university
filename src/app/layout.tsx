import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { PostHogProvider } from './PostHogProvider';
import { PostHogPageView } from './PostHogPageView';
import { PostHogIdentify } from './PostHogIdentify';
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
            {children}
          </SessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
