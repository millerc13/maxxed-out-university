import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdfkit reads its built-in AFM fonts via relative filesystem paths —
  // bundling it into the server build breaks those paths.
  // @sparticuz/chromium-min + puppeteer-core: chromium-min downloads
  // the binary from a URL at runtime (no on-disk binary to file-trace),
  // so we just keep the JS unbundled. No outputFileTracingIncludes
  // needed — the previous file-tracing approach with @sparticuz/chromium
  // failed to include the .br binary on Vercel. The chromium-min flow
  // sidesteps the entire bundling problem.
  serverExternalPackages: ['pdfkit', '@sparticuz/chromium-min', 'puppeteer-core'],
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
