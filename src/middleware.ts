import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { can, capabilityForAdminPath } from '@/lib/permissions';

const CANONICAL_HOST = 'university.maxxedout.com';

export default auth((req) => {
  const { nextUrl } = req;

  // Canonical-host redirect. In production the app is also reachable at its
  // Vercel aliases (maxxed-out-university.vercel.app, the git-branch alias,
  // etc.). When a page loads there the Meta Pixel fires with that host, so
  // Meta flags ".vercel.app" as a new data source. 308-redirect any
  // non-canonical production host to university.maxxedout.com so the Pixel
  // only ever reports the real domain. Preview deploys (VERCEL_ENV !==
  // 'production') and localhost are left alone, and /api is excluded by the
  // matcher so server-to-server calls/webhooks aren't redirected.
  const host = req.headers.get('host') ?? '';
  if (process.env.VERCEL_ENV === 'production' && host && host !== CANONICAL_HOST) {
    const dest = new URL(nextUrl.pathname + nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(dest, 308);
  }

  const isLoggedIn = !!req.auth;

  // Protected routes
  // Note: /certificates/[id] is intentionally PUBLIC so learners can share their credential.
  // /courses listing + /courses/[slug] detail are PUBLIC so anons can browse and purchase;
  // /courses/[slug]/lessons/* and /courses/[slug]/quiz/* stay protected (actual content).
  // /checkout is PUBLIC so anons can buy as guests.
  const protectedRoutes = ['/dashboard', '/learn', '/progress', '/admin'];
  const isCourseContentPath = /^\/courses\/[^/]+\/(lessons|quiz)\//.test(nextUrl.pathname);
  const isProtectedRoute = isCourseContentPath || protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Admin routes
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');

  // Auth routes (login, password setup, etc.)
  const authRoutes = ['/login', '/setup-password', '/change-password', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Password setup / recovery routes — allowed even when logged in or when mustChangePassword is true
  const isPasswordRoute = nextUrl.pathname.startsWith('/setup-password')
    || nextUrl.pathname.startsWith('/change-password')
    || nextUrl.pathname.startsWith('/forgot-password')
    || nextUrl.pathname.startsWith('/reset-password');

  // Redirect logged-in users away from auth pages (except password routes)
  if (isLoggedIn && isAuthRoute && !isPasswordRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Redirect non-logged-in users to login for protected routes
  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce password setup — block dashboard/courses until password is set
  if (isLoggedIn && isProtectedRoute && !isPasswordRoute) {
    const mustChangePassword = req.auth?.user?.mustChangePassword;
    if (mustChangePassword) {
      console.log('[middleware] Blocking access — mustChangePassword=true', {
        path: nextUrl.pathname,
        userId: req.auth?.user?.id,
        email: req.auth?.user?.email,
      });
      return NextResponse.redirect(new URL('/setup-password', nextUrl));
    }
  }

  // Check admin access — capability-scoped per sub-path.
  //   · No admin:access at all  → bounced to /dashboard (not staff)
  //   · Staff but lacking the section's capability (e.g. MARKETING hitting
  //     /admin/payments) → bounced to /admin (the dashboard), staying in
  //     the admin area they ARE allowed to use.
  // This is the single source of truth for page-level admin gating; the
  // capability map lives in src/lib/permissions.ts.
  if (isAdminRoute && isLoggedIn) {
    const userRole = req.auth?.user?.role;
    if (!can(userRole, 'admin:access')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    const needed = capabilityForAdminPath(nextUrl.pathname);
    if (needed && !can(userRole, needed)) {
      return NextResponse.redirect(new URL('/admin', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};
