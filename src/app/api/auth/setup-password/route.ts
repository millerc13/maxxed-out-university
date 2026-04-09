import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    console.log('[setup-password-api] Session check', { hasSession: !!session, userId: session?.user?.id, email: session?.user?.email, mustChangePassword: session?.user?.mustChangePassword });

    if (!session?.user?.id) {
      console.error('[setup-password-api] No session — returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    const userId = session.user.id;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has a password (prevent overwriting)
    if (user.passwordHash) {
      console.log('[setup-password-api] Password already set for user', { userId, email: user.email });
      return NextResponse.json(
        { error: 'Password already set. Use forgot password to reset.' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user with password and clear mustChangePassword flag
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    console.log('[setup-password-api] Password set successfully', { userId, email: user.email });
    return NextResponse.json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('[setup-password-api] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
