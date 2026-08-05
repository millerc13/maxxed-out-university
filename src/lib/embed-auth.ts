import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Auth for the /embed/* dashboard widgets that get iframed into
 * GoHighLevel custom dashboard widgets.
 *
 * GHL renders widgets cross-site, so cookies are useless here. Instead
 * every widget URL carries a per-widget HMAC key in the query string:
 *
 *   https://university.maxxedout.com/embed/revenue?k=<embedKey('revenue')>
 *
 * Keys are derived from AUTH_SECRET (override with EMBED_WIDGET_SECRET),
 * so they are stable across deploys, survive DB resets, and rotating the
 * secret invalidates every embed URL at once. Leaking one widget's URL
 * does not unlock any other widget.
 *
 * The /admin/embed-widgets page (admin:access) lists the signed URL for
 * every widget so staff can copy-paste them into GHL.
 */

function embedSecret(): string | null {
  return (
    process.env.EMBED_WIDGET_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    null
  );
}

export function embedKey(widgetId: string): string {
  const secret = embedSecret();
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return createHmac('sha256', secret)
    .update(`embed-widget:${widgetId}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyEmbedKey(widgetId: string, key: string | undefined): boolean {
  if (!key || !embedSecret()) return false;
  const expected = embedKey(widgetId);
  try {
    return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  } catch {
    return false;
  }
}
