import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { NotificationsClient } from '@/components/admin/NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const [recipients, settings] = await Promise.all([
    prisma.notificationRecipient.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.setting.findMany({
      where: { key: { in: ['internalNotificationsEnabled', 'testPhoneOverride'] } },
      select: { key: true, value: true },
    }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const initialSettings = {
    internalNotificationsEnabled:
      (settingsMap.internalNotificationsEnabled ?? 'true').toLowerCase() === 'true',
    testPhoneOverride: settingsMap.testPhoneOverride ?? '',
  };

  return (
    <NotificationsClient initialRecipients={recipients} initialSettings={initialSettings} />
  );
}
