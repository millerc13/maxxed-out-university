import { requireAdmin } from '@/lib/admin';
import { TemplateEditorClient } from '@/components/admin/TemplateEditorClient';

export const dynamic = 'force-dynamic';

// New-template scratchpad. The editor's `initial={null}` mode posts
// to /api/admin/documents/templates (collection POST) on first save,
// then redirects the browser to /admin/documents/templates/[id] so
// subsequent saves PUT against the persisted row.
export default async function NewTemplatePage() {
  await requireAdmin();
  return <TemplateEditorClient initial={null} />;
}
