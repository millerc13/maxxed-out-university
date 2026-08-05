import { verifyEmbedKey } from '@/lib/embed-auth';
import { getHubData } from '@/lib/embed/hub-data';
import { EmbedDenied } from '@/components/embed/EmbedShell';
import { HubClient } from '@/components/embed/hub/HubClient';

export const dynamic = 'force-dynamic';

/**
 * The full-page Command Center: server assembles every data source
 * (Fanbasis, GHL, Calendly, PostHog, webinar app, university DB) into
 * one payload; the client shell renders it as a tabbed app. Designed
 * to be embedded as a whole custom page in the GHL sidebar menu.
 * Tabs deep-link via hash: /embed/hub?k=...#revenue
 */
export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('hub', k)) return <EmbedDenied />;

  const data = await getHubData();
  return <HubClient data={data} />;
}
