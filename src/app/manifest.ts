import type { MetadataRoute } from 'next';

// Web App Manifest for the Maxxed Out University PWA. Next.js serves
// this at `/manifest.webmanifest` automatically and links it from
// <head> — no plumbing in layout.tsx required.
//
// IMPORTANT: NO `theme_color` field. We learned the hard way that
// theme_color tints OS chrome (Android status bar, iOS standalone
// title bar) and combined with the existing brand-blue Header border
// it produces a blue strip the owner doesn't want. Without it, the
// OS uses sensible defaults and nothing turns blue.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Maxxed Out University',
    short_name: 'Maxxed Out',
    description:
      'Business education and training for serious entrepreneurs. Real estate, mentorship, and growth systems from Todd Pultz.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    categories: ['education', 'business', 'productivity'],
    icons: [
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      // 192 + 512 are required for the Lighthouse installability check.
      // Each is declared twice — once `any`, once `maskable` — so
      // Android's adaptive-icon mask can use the same asset.
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
