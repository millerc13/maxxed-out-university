import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { LeadsClient, type LeadRow, type CourseTab } from '@/components/admin/LeadsClient';

export const dynamic = 'force-dynamic';

/**
 * /admin/leads — mobile-first list of every Application captured from
 * funnel + on-platform apply forms, separated by course. Built for
 * Todd to review in his phone between event sessions.
 */
export default async function LeadsPage() {
  await requireAdmin();

  // Pull recent Applications + their course titles in one shot. Cap at
  // 1000 — the leads table is small enough that pagination isn't worth
  // the complexity for v1.
  const apps = await prisma.application.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      courseId: true,
      source: true,
      payload: true,
      status: true,
      ghlContactId: true,
      createdAt: true,
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const leads: LeadRow[] = apps.map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name ?? null,
    phone: a.phone ?? null,
    courseId: a.courseId,
    courseTitle: a.course.title,
    courseSlug: a.course.slug,
    source: a.source,
    status: a.status,
    ghlContactId: a.ghlContactId ?? null,
    createdAt: a.createdAt.toISOString(),
    payload: a.payload as Record<string, unknown>,
  }));

  // Build the tab list: one per course that has at least one lead,
  // sorted by lead count desc (most-active courses surface first).
  const counts = new Map<string, { courseId: string; title: string; slug: string; count: number }>();
  for (const a of apps) {
    const k = a.course.id;
    const cur = counts.get(k);
    if (cur) cur.count += 1;
    else counts.set(k, { courseId: a.course.id, title: a.course.title, slug: a.course.slug, count: 1 });
  }
  const courseTabs: CourseTab[] = [...counts.values()].sort((a, b) => b.count - a.count);

  return <LeadsClient leads={leads} courseTabs={courseTabs} />;
}
