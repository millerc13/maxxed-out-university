import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdfkit reads its built-in AFM fonts via relative filesystem paths —
  // bundling it into the server build breaks those paths.
  // @sparticuz/chromium ships a Chromium binary at
  // node_modules/@sparticuz/chromium/bin — Turbopack relocates it
  // during bundling and the launch fails on Vercel with "input
  // directory ... does not exist". Mark it (and puppeteer-core,
  // which calls it) as external so Vercel includes the package on
  // disk and our require() resolves the binary path.
  serverExternalPackages: ['pdfkit', '@sparticuz/chromium', 'puppeteer-core'],
  // Proxy PostHog through /ph so ad-blockers don't kill analytics.
  async rewrites() {
    return [
      { source: '/ph/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ph/array/:path*', destination: 'https://us-assets.i.posthog.com/array/:path*' },
      { source: '/ph/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },
  skipTrailingSlashRedirect: true,
  images: {
    qualities: [75, 80, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflarestream.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.leadconnectorhq.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.cdn.filesafe.space',
      },
      // R2.dev subdomain for our public bucket (used for admin-uploaded images)
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
};

export default nextConfig;
