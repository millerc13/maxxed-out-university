import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { TemplatesListClient } from '@/components/admin/TemplatesListClient';

// Server-rendered list of every contract template. The interactive
// row actions (activate, duplicate, delete) live in TemplatesListClient
// so we can show optimistic state without a full reload.
export const dynamic = 'force-dynamic';

export default async function TemplatesListPage() {
  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      active: true,
      tokens: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { signatures: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/admin/documents" className="hover:text-maxxed-blue">
              Documents
            </Link>{' '}
            <span aria-hidden>›</span> Templates
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Contract Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Each template is a markdown contract with{' '}
            <code className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono">
              {`{{Token}}`}
            </code>{' '}
            placeholders. Only one is active at a time — that's the one auto-fired
            on self-checkout. Others are still available to send manually from the
            Compose form.
          </p>
        </div>
        <Link
          href="/admin/documents/templates/new"
          className="inline-flex items-center justify-center rounded-lg bg-maxxed-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 self-start sm:self-auto"
        >
          + New template
        </Link>
      </div>

      <TemplatesListClient
        initialTemplates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          active: t.active,
          tokenCount: Array.isArray(t.tokens) ? t.tokens.length : 0,
          signatureCount: t._count.signatures,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
