import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { TemplateEditorClient } from '@/components/admin/TemplateEditorClient';

export const dynamic = 'force-dynamic';

export default async function AdminContractTemplatePage() {
  await requireAdmin();
  const template = await prisma.contractTemplate.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });
  return (
    <TemplateEditorClient
      initial={template ? {
        id: template.id,
        name: template.name,
        body: template.body,
        tokens: (template.tokens as string[]) ?? [],
        updatedAt: template.updatedAt.toISOString(),
      } : null}
    />
  );
}
