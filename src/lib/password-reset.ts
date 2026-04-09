import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';

export async function createPasswordResetToken(email: string): Promise<{ sent: boolean }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal whether the email exists
    return { sent: true };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  // Send the email
  const { sendPasswordResetEmail } = await import('./resend');
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name || 'there',
    token,
  });

  return { sent: true };
}

export async function verifyPasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) return null;
  if (resetToken.usedAt) return null;
  if (resetToken.expiresAt < new Date()) return null;

  // Mark as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return resetToken.user;
}
