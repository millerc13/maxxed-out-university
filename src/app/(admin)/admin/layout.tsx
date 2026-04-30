import { requireAdmin } from '@/lib/admin';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return <AdminShell user={session.user!}>{children}</AdminShell>;
}
