import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    const session = await auth();
    console.log('[refresh-session] Session check', { hasSession: !!session, userId: session?.user?.id });

    if (!session?.user?.id) {
      console.log('[refresh-session] No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', origin));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true, role: true, email: true, name: true, image: true },
    });

    if (!user) {
      console.error('[refresh-session] User not found in DB', { userId: session.user.id });
      return NextResponse.redirect(new URL('/login', origin));
    }

    // Encode fresh JWT with current DB values
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!;
    const cookieName = process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';
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

    console.log('[refresh-session] JWT refreshed successfully', {
      userId: session.user.id,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      role: user.role,
    });

    // Set cookie directly on the redirect response — cookies() from next/headers
    // does NOT propagate onto NextResponse.redirect() (separate response objects)
    const response = NextResponse.redirect(new URL('/dashboard', origin));
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[refresh-session] Error:', error);
    return NextResponse.redirect(new URL('/login', origin));
  }
}
