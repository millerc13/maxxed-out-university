import { auth } from './auth';

export const SALES_TRACKER_EMAIL = 'admin@maxxedout.com';

/**
 * The sales tracker is gated to a single admin account. Other ADMIN users
 * must NOT be able to read or mutate this data — Todd was explicit about
 * this. Use this helper at the top of every sales-tracker page and API
 * route. Returns null when the request is not authorized so callers can
 * choose between redirect (page) and 404 (API — leaks less than 403).
 */
export async function getSalesTrackerSession() {
  const session = await auth();
  if (!session?.user?.email) return null;
  if (session.user.email !== SALES_TRACKER_EMAIL) return null;
  return session;
}
