import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signIn } from '@/lib/auth';
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

    // Check if user has a password set
    const hasPassword = !!magicLink.user.passwordHash;

    // If user needs to set up a password, redirect directly to setup page
    if (!hasPassword) {
      return NextResponse.redirect(
        new URL(`/setup-password?email=${encodeURIComponent(magicLink.user.email)}&userId=${magicLink.userId}`, baseUrl)
      );
    }

    // User has a password, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.redirect(new URL('/login/error?error=server_error', request.url));
  }
}
