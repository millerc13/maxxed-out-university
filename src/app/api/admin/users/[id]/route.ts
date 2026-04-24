import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE a user and everything that belongs to them.
 *
 * Prisma relations on User → Enrollment / LessonProgress / MagicLink /
 * Session / Account / QuizAttempt / PasswordResetToken are all
 * `onDelete: Cascade`, so the single delete below cleans up every child
 * row automatically.
 *
 * Guards:
 *   - Caller must be ADMIN
 *   - Can't delete yourself (avoids locking out the caller mid-session)
 *   - Can't delete the last remaining admin
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "You can't delete your own account while signed in." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin.' },
        { status: 400 }
      );
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  console.log(`[admin/users] ${session.user.email} deleted user ${target.email} (${userId})`);
  return NextResponse.json({ success: true });
}
