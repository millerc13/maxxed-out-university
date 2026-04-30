import { requireAdmin } from '@/lib/admin';
import { MessagesPageClient } from '@/components/admin/MessagesPageClient';

// Read-only — this page only renders a search shell that proxies to the
// admin-gated /api/admin/ghl/conversations endpoint. The page itself is
// guarded by requireAdmin() so non-admins get redirected.
export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  await requireAdmin();
  return <MessagesPageClient />;
}
