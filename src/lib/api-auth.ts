import { NextResponse } from 'next/server';
import { auth } from './auth';
import { can, type Capability } from './permissions';

/**
 * Capability-based auth for API route handlers.
 *
 * Mirrors the page-level guards in src/lib/admin.ts but returns a value
 * instead of redirecting (API routes 401 rather than redirect). Use the
 * narrowest capability each method needs:
 *
 *   GET  (read)   → 'admin:access'        any staff role
 *   POST/PUT      → 'content:manage'      editors (ADMIN, INSTRUCTOR, MARKETING)
 *   DELETE        → 'destructive:delete'  ADMIN only
 *   $ / config    → 'revenue:view' / 'settings:manage'  ADMIN only
 *
 * Returns the session when authorized, or null when not — callers pattern:
 *
 *   const session = await sessionWithCapability('content:manage');
 *   if (!session) return unauthorized();
 */
export async function sessionWithCapability(capability: Capability) {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!can(session.user.role, capability)) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
