import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { TemplateEditorClient } from '@/components/admin/TemplateEditorClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateEditPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const template = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!template) notFound();
  return (
    <TemplateEditorClient
      initial={{
        id: template.id,
        name: template.name,
        body: template.body,
        tokens: (template.tokens as string[]) ?? [],
        updatedAt: template.updatedAt.toISOString(),
      }}
    />
  );
}
