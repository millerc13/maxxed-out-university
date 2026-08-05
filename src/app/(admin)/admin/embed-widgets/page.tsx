import { requireStaff } from '@/lib/admin';
import { embedKey } from '@/lib/embed-auth';
import { WIDGETS } from '@/lib/embed/catalog';
import { EmbedWidgetsClient } from '@/components/admin/EmbedWidgetsClient';

export const dynamic = 'force-dynamic';

/**
 * Embed Widgets — signed iframe URLs for GoHighLevel dashboards.
 *
 * Each /embed/* page is public but requires its per-widget HMAC key in
 * `?k=`. This page is the only place those keys are surfaced; staff
 * copy the URL (or the full <iframe> snippet) into a GHL dashboard
 * "Custom Widget" (iframe) block.
 */
export default async function EmbedWidgetsPage() {
  await requireStaff();

  const origin = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');
  // Embed URLs must use the canonical host: middleware 308s everything
  // else in production, and GHL won't follow the redirect inside an
  // iframe cleanly.
  const canonicalOrigin = origin.includes('localhost') ? origin : 'https://university.maxxedout.com';

  const widgets = WIDGETS.map((w) => ({
    ...w,
    url: `${canonicalOrigin}/embed/${w.id}?k=${embedKey(w.id)}`,
  }));

  return <EmbedWidgetsClient widgets={widgets} />;
}
