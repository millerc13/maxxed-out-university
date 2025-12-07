import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

// Generate a signature for an email (used to verify the link is legit)
function generateSignature(email: string): string {
  const secret = process.env.AUTH_SECRET || 'fallback-secret';
  return createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 16); // Short signature for cleaner URLs
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase();
    const sig = searchParams.get('sig');

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=missing_email', request.url));
    }

    // Verify signature
    const expectedSig = generateSignature(email);
    if (sig !== expectedSig) {
      return NextResponse.redirect(new URL('/login?error=invalid_link', request.url));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url));
    }

    // Create a magic link token for this user
    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Redirect to verify endpoint which will complete the login
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL(`/api/auth/verify?token=${token}`, baseUrl));

  } catch (error) {
    console.error('Auto-login error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}

// Helper endpoint to generate a signed link (for testing)
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const sig = generateSignature(email);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const autoLoginLink = `${baseUrl}/api/auth/auto-login?email=${encodeURIComponent(email)}&sig=${sig}`;

    return NextResponse.json({
      success: true,
      email,
      signature: sig,
      autoLoginLink,
    });
  } catch (error) {
    console.error('Generate link error:', error);
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
  }
}
