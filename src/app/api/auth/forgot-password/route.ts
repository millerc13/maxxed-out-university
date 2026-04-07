import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/password-reset';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await createPasswordResetToken(email.trim().toLowerCase());

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If an account exists with that email, we\'ve sent a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
