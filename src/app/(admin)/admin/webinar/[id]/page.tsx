import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/admin';
import { WebinarEditor } from '@/components/webinar-admin/WebinarEditor';

/**
 * Webinar editor — the ported 9-tab admin from maxxed-webinar. Data is fetched
 * from the webinar app's existing admin API with the server-side bearer; the
 * client editor then reads/writes through the /api/webinar-admin proxy.
 */
export const dynamic = 'force-dynamic';

export default async function EditWebinarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('webinar:manage');
  const { id } = await params;

  const base = process.env.WEBINAR_APP_URL;
  if (!base) throw new Error('WEBINAR_APP_URL is not configured');

  const res = await fetch(`${base}/api/webinars/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.WEBINAR_ADMIN_TOKEN ?? ''}` },
    cache: 'no-store',
  });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Failed to load webinar ${id}: ${res.status} ${res.statusText}`);

  const { webinar } = await res.json();
  if (!webinar) notFound();

  return (
    <div className="webinar-admin">
      <WebinarEditor initial={webinar} appBaseUrl={base} />
    </div>
  );
}
