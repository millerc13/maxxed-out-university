import { auth } from './auth';
import { redirect } from 'next/navigation';

export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const role = (session.user as any).role as Role;

  if (role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  return session;
}

export async function requireInstructorOrAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const role = (session.user as any).role as Role;

  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    redirect('/dashboard?error=unauthorized');
  }

  return session;
}

export function isAdmin(session: any): boolean {
  return session?.user && (session.user as any).role === 'ADMIN';
}

export function isInstructor(session: any): boolean {
  const role = (session?.user as any)?.role;
  return role === 'ADMIN' || role === 'INSTRUCTOR';
}
