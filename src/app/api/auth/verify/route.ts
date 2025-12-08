import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login/error?error=missing_token', request.url));
    }

    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      return NextResponse.redirect(new URL('/login/error?error=invalid_token', request.url));
    }

    // Check if already used
    if (magicLink.usedAt) {
      return NextResponse.redirect(new URL('/login/error?error=token_used', request.url));
    }

    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      return NextResponse.redirect(new URL('/login/error?error=token_expired', request.url));
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Update user's email verification status
    await prisma.user.update({
      where: { id: magicLink.userId },
      data: { emailVerified: new Date() },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const user = magicLink.user;

    // Check if user has a password set
    const hasPassword = !!user.passwordHash;

    // Create JWT session token
    const secret = process.env.AUTH_SECRET!;
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction ? '__Secure-authjs.session-token' : 'authjs.session-token';

    const sessionToken = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        sub: user.id,
      },
      secret,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the session cookie
    const cookieStore = await cookies();

    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // If user needs to set up a password, redirect to setup page (but they're logged in)
    if (!hasPassword) {
      return NextResponse.redirect(
        new URL(`/setup-password?email=${encodeURIComponent(user.email)}&userId=${user.id}`, baseUrl)
      );
    }

    // User has a password, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.redirect(new URL('/login/error?error=server_error', request.url));
  }
}
