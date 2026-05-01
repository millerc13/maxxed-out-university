import { prisma } from './prisma';

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// 6-char URL-safe alphanumeric — same vibe as CheckoutLink's 6-char
// token but generated via Web Crypto so this module stays Edge-runtime
// safe (auth.ts → middleware.ts pulls magiclink.ts onto the edge).
// 62^6 ≈ 56B combinations; with a 5-attempt collision retry loop the
// failure rate is effectively zero at our volume.
const SHORT_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateShortCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SHORT_CODE_ALPHABET[b % SHORT_CODE_ALPHABET.length]).join('');
}

export async function createMagicLink(userId: string): Promise<{ token: string; shortCode: string }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Retry up to 5 times on the off chance of a shortCode collision.
  let shortCode: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateShortCode();
    const existing = await prisma.magicLink.findUnique({ where: { shortCode: candidate }, select: { id: true } });
    if (!existing) {
      shortCode = candidate;
      break;
    }
  }
  if (!shortCode) throw new Error('createMagicLink: failed to generate unique shortCode after 5 tries');

  await prisma.magicLink.create({
    data: { token, shortCode, userId, expiresAt },
  });
  console.log('[magiclink] Created', { userId, tokenPrefix: token.slice(0, 8) + '...', shortCode, expiresAt });

  return { token, shortCode };
}

/**
 * Look up a magic link by its short code. Used by the /a/[code] short-URL
 * redirector. Returns the row or null — callers handle the 404. Does NOT
 * mark the row used (that happens at /auth/activate via verifyMagicLink).
 */
export async function findMagicLinkByShortCode(shortCode: string) {
  return prisma.magicLink.findUnique({
    where: { shortCode },
    select: { token: true, expiresAt: true, usedAt: true },
  });
}

export async function verifyMagicLink(token: string) {
  console.log('[magiclink] Verifying token', { tokenPrefix: token?.slice(0, 8) + '...' });
  const link = await prisma.magicLink.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!link) {
    console.warn('[magiclink] Token not found');
    return null;
  }
  if (link.usedAt) {
    console.warn('[magiclink] Token already used', { userId: link.userId, usedAt: link.usedAt });
    return null;
  }
  if (link.expiresAt < new Date()) {
    console.warn('[magiclink] Token expired', { userId: link.userId, expiresAt: link.expiresAt });
    return null;
  }

  await prisma.magicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });
  console.log('[magiclink] Verified, marked used', { userId: link.userId, email: link.user.email });

  return link.user;
}
