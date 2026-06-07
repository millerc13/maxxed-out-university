import { auth } from './auth';
import { redirect } from 'next/navigation';
import { can, isStaff, type Capability } from './permissions';

export type { Role } from './permissions';

/**
 * Strict ADMIN gate. Use for pages/actions that must remain ADMIN-only
 * regardless of the staff-role model (e.g. anything ADMIN-exclusive).
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const role = session.user.role;

  if (role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  return session;
}

/**
 * Any staff role (ADMIN, INSTRUCTOR, MARKETING, SALES, SUPPORT) may load
 * the admin shell. Per-section access is then scoped by capability via
 * middleware + requireCapability below. Use this on the admin layout and
 * on pages every staff member is allowed to open.
 */
export async function requireStaff() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!isStaff(session.user.role)) {
    redirect('/dashboard?error=unauthorized');
  }

  return session;
}

/**
 * Gate a page on a specific capability. Logged-out → /login; logged-in but
 * lacking the capability → bounced back into the admin dashboard (they're
 * staff, just not allowed here) rather than kicked out of the admin area.
 */
export async function requireCapability(capability: Capability) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!can(session.user.role, capability)) {
    redirect(isStaff(session.user.role) ? '/admin' : '/dashboard?error=unauthorized');
  }

  return session;
}

export async function requireInstructorOrAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const role = session.user.role;

  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    redirect('/dashboard?error=unauthorized');
  }

  return session;
}

export function isAdmin(session: any): boolean {
  return session?.user && session.user.role === 'ADMIN';
}

export function isInstructor(session: any): boolean {
  const role = (session?.user as any)?.role;
  return role === 'ADMIN' || role === 'INSTRUCTOR';
}

/** Capability check against a session object (for conditional UI in server components). */
export function sessionCan(session: any, capability: Capability): boolean {
  return can((session?.user as any)?.role, capability);
}
