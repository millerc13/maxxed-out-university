import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { NotificationsClient } from '@/components/admin/NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const recipients = await prisma.notificationRecipient.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return <NotificationsClient initialRecipients={recipients} />;
}
