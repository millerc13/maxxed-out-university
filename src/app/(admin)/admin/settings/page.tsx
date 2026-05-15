import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { FunnelIntegrationSettings } from '@/components/admin/FunnelIntegrationSettings';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();

  const funnels = await prisma.funnelDeployment.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, subdomain: true, apiKey: true },
  });

  // Health signal: the most recent successfully-delivered lead alert.
  // A row only exists if the funnel authenticated to /api/notify/lead
  // AND notifySlackChannels ran — i.e. the whole pipeline is working.
  // Wrapped so a missing/empty WebhookLog never 500s the page.
  let lastLeadAt: string | null = null;
  try {
    const lastLead = await prisma.webhookLog.findFirst({
      where: { event: { startsWith: 'slack:' }, status: 'success' },
      orderBy: { processedAt: 'desc' },
      select: { processedAt: true },
    });
    lastLeadAt = lastLead ? lastLead.processedAt.toISOString() : null;
  } catch {
    /* leave null — UI shows "unknown" */
  }

  return (
    <FunnelIntegrationSettings
      funnels={funnels}
      lastLeadAt={lastLeadAt}
    />
  );
}
