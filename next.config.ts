import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdfkit reads its built-in AFM fonts via relative filesystem paths —
  // bundling it into the server build breaks those paths.
  serverExternalPackages: ['pdfkit'],
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
    ],
  },
};

export default nextConfig;
