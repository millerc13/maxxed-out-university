import type { MetadataRoute } from 'next';

// Web App Manifest for the Maxxed Out University PWA. Next.js serves
// this file at `/manifest.webmanifest` automatically — no plumbing
// needed in `<head>`, the framework links it for us.
//
// Branding:
//   theme_color → tints the OS chrome (Android task bar, iOS status
//                 bar in standalone mode) — Maxxed brand blue.
//   background_color → splash background while the JS shell boots.
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
    theme_color: '#0000FF',
    categories: ['education', 'business', 'productivity'],
    icons: [
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      // 192 + 512 must be present for installability checks. Each is
      // declared twice — once as `any` and once as `maskable` — so
      // Android's adaptive-icon mask uses the same asset without
      // requiring a separate maskable-only export.
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
