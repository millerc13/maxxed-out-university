import type { Viewport } from 'next';
import { requireAdmin } from '@/lib/admin';
import { AdminShell } from '@/components/admin/AdminShell';

// Tints the iOS Safari address bar / Android status bar dark on
// admin routes only — matches AdminHeader's bg-gray-900 (#111827)
// so the OS chrome blends into the admin shell. Scoped to this
// route segment by exporting `viewport` from the admin layout;
// the root layout has no viewport export, so non-admin pages
// keep the browser's default white chrome.
export const viewport: Viewport = {
  themeColor: '#111827',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return <AdminShell user={session.user!}>{children}</AdminShell>;
}
