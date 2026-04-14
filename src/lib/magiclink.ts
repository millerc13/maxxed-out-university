import { prisma } from './prisma';

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createMagicLink(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.magicLink.create({
    data: { token, userId, expiresAt },
  });
  console.log('[magiclink] Created', { userId, tokenPrefix: token.slice(0, 8) + '...', expiresAt });

  return token;
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
