import { redirect, notFound } from 'next/navigation';
import { findMagicLinkByShortCode } from '@/lib/magiclink';

/**
 * Short-link expander for magic-link activation. Looks up the short
 * code, then 302-redirects to /auth/activate?token=<full>. SMS-friendly
 * counterpart to the long /auth/activate?token=<64-hex> URL — same
 * destination, smaller footprint.
 *
 * Token-not-found, expired, and already-used links all 404 so we don't
 * advertise which codes exist.
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function MagicLinkShortRedirect({ params }: PageProps) {
  const { code } = await params;
  if (!code || code.length < 4) notFound();

  const link = await findMagicLinkByShortCode(code);
  if (!link) {
    console.warn('[a/code] Short code not found', { code });
    notFound();
  }
  if (link.usedAt) {
    console.warn('[a/code] Short code already used', { code, usedAt: link.usedAt });
    notFound();
  }
  if (link.expiresAt < new Date()) {
    console.warn('[a/code] Short code expired', { code, expiresAt: link.expiresAt });
    notFound();
  }

  redirect(`/auth/activate?token=${link.token}`);
}
