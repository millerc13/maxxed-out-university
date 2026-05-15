import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { NotificationsClient } from '@/components/admin/NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  await requireAdmin();

  const recipients = await prisma.notificationRecipient.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Setting table is new — wrap the fetch so we don't 500 on environments
  // where the migration hasn't landed yet. Falls back to safe defaults
  // (notifications ON, no override) so the page still renders and the
  // banner is usable; admin saves via /api/admin/settings/[key] which
  // will create rows on first write.
  let initialSettings = { internalNotificationsEnabled: true, testPhoneOverride: '' };
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ['internalNotificationsEnabled', 'testPhoneOverride'] } },
      select: { key: true, value: true },
    });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    initialSettings = {
      internalNotificationsEnabled:
        (settingsMap.internalNotificationsEnabled ?? 'true').toLowerCase() === 'true',
      testPhoneOverride: settingsMap.testPhoneOverride ?? '',
    };
  } catch (err) {
    console.error('[notifications page] Setting fetch failed, using defaults:', err);
  }

  return (
    <NotificationsClient initialRecipients={recipients} initialSettings={initialSettings} />
  );
}
