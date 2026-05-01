import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// Legacy singular route. We've moved to a multi-template setup at
// /admin/documents/templates. If there's an active template, take the
// admin straight to that one's edit page — otherwise list all of them.
export const dynamic = 'force-dynamic';

export default async function LegacyTemplateRedirect() {
  await requireAdmin();
  const active = await prisma.contractTemplate.findFirst({
    where: { active: true },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (active) redirect(`/admin/documents/templates/${active.id}`);
  redirect('/admin/documents/templates');
}
