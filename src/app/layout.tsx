import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import '@/styles/globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'Training Center | MaxxedOut',
  description: 'Real estate investment education and training platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body className={`${montserrat.variable} font-sans antialiased bg-background`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
