import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  console.log('[refresh-session] GET invoked', { origin, userAgent: request.headers.get('user-agent')?.slice(0, 60) });

  try {
    const session = await auth();
    console.log('[refresh-session] Session check', { hasSession: !!session, userId: session?.user?.id, email: session?.user?.email, mustChangePassword: session?.user?.mustChangePassword });

    if (!session?.user?.id) {
      console.warn('[refresh-session] No session — redirecting to /login');
      return NextResponse.redirect(new URL('/login', origin));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true, role: true, email: true, name: true, image: true, passwordHash: true },
    });

    if (!user) {
      console.error('[refresh-session] User not found in DB', { userId: session.user.id });
      return NextResponse.redirect(new URL('/login', origin));
    }
    console.log('[refresh-session] User loaded from DB', { userId: session.user.id, email: user.email, mustChangePassword: user.mustChangePassword, role: user.role, hasPassword: !!user.passwordHash });

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!;
    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Secure-authjs.session-token' : 'authjs.session-token';
    console.log('[refresh-session] Encoding JWT', { cookieName, isProd, hasSecret: !!secret });

    const token = await encode({
      secret,
      salt: cookieName,
      token: {
        id: session.user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        sub: session.user.id,
      },
    });
    console.log('[refresh-session] JWT encoded', { tokenLength: token.length, tokenPrefix: token.slice(0, 20) + '...' });

    const response = NextResponse.redirect(new URL('/dashboard', origin));
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
    console.log('[refresh-session] Cookie set, redirecting to /dashboard', { cookieName, secure: isProd });

    return response;
  } catch (error) {
    console.error('[refresh-session] Error', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.redirect(new URL('/login', origin));
  }
}
