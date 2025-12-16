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

    // If user has already set up their password, don't allow auto-login
    // They should use their password to log in
    if (user.passwordHash) {
      return NextResponse.redirect(new URL('/login?error=password_required', request.url));
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

// Helper endpoint to generate a signed link
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Verify the user exists before generating a link
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sig = generateSignature(email.toLowerCase());
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const autoLoginLink = `${baseUrl}/api/auth/auto-login?email=${encodeURIComponent(email.toLowerCase())}&sig=${sig}`;

    const response = NextResponse.json({
      success: true,
      email: email.toLowerCase(),
      signature: sig,
      autoLoginLink,
    });

    // Add CORS headers for GHL pages
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error) {
    console.error('Generate link error:', error);
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
