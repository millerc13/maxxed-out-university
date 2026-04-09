import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createMagicLink(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await prisma.magicLink.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function verifyMagicLink(token: string) {
  const link = await prisma.magicLink.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!link) return null;
  if (link.usedAt) return null;
  if (link.expiresAt < new Date()) return null;

  // Mark used
  await prisma.magicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  return link.user;
}
