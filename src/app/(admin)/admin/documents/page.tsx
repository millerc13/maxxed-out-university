import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { DocumentsClient } from '@/components/admin/DocumentsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDocumentsPage() {
  await requireAdmin();

  // Pull recent docs + the active template's tokens (for the compose
  // form) + the dropdown of top-level courses so admins can attach
  // a course without typing a title manually.
  const [rows, courses, activeTemplate] = await Promise.all([
    prisma.documentSignature.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        origin: true,
        recipientEmail: true,
        recipientName: true,
        courseTitle: true,
        paymentTotalCents: true,
        paymentPlan: true,
        notes: true,
        createdAt: true,
        sentAt: true,
        firstViewedAt: true,
        signedAt: true,
        cancelledAt: true,
        declinedAt: true,
      },
    }),
    prisma.course.findMany({
      where: { bundleId: null, published: true },
      select: { id: true, title: true, price: true },
      orderBy: { title: 'asc' },
    }),
    prisma.contractTemplate.findFirst({
      where: { active: true },
      select: { id: true, name: true, updatedAt: true },
    }),
  ]);

  return (
    <DocumentsClient
      initialRows={rows.map((r) => ({
        id: r.id,
        status: r.status,
        origin: r.origin,
        recipientEmail: r.recipientEmail,
        recipientName: r.recipientName,
        courseTitle: r.courseTitle,
        paymentTotalCents: r.paymentTotalCents,
        paymentPlan: r.paymentPlan as null | {
          installments: number;
          perInstallmentCents: number;
          frequency: 'monthly' | 'quarterly';
          firstDueAt: string;
        },
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        sentAt: r.sentAt?.toISOString() ?? null,
        firstViewedAt: r.firstViewedAt?.toISOString() ?? null,
        signedAt: r.signedAt?.toISOString() ?? null,
        cancelledAt: r.cancelledAt?.toISOString() ?? null,
        declinedAt: r.declinedAt?.toISOString() ?? null,
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        title: c.title,
        priceCents: c.price ?? null,
      }))}
      activeTemplate={
        activeTemplate
          ? {
              name: activeTemplate.name,
              updatedAt: activeTemplate.updatedAt.toISOString(),
            }
          : null
      }
    />
  );
}
