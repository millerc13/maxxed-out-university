import { verifyEmbedKey } from '@/lib/embed-auth';
import { prisma } from '@/lib/prisma';
import { EmbedShell, Card, EmbedDenied } from '@/components/embed/EmbedShell';
import { Stat, StatGrid } from '@/components/embed/Stat';
import { BarList } from '@/components/embed/BarList';
import { DataTable } from '@/components/embed/DataTable';
import { chartColor } from '@/lib/embed/theme';

export const dynamic = 'force-dynamic';

export default async function StudentsWidget({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;
  if (!verifyEmbedKey('students', k)) return <EmbedDenied />;

  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [students, enrollments, completedLessons, startedLessons, active7, newEnrollments30, quizAttempts, topCourses, recentEnrollments] =
    await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.enrollment.count({ where: { course: { bundleId: null } } }),
      prisma.lessonProgress.count({ where: { completed: true } }),
      prisma.lessonProgress.count(),
      prisma.lessonProgress.groupBy({ by: ['userId'], where: { updatedAt: { gte: since7 } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: since30 }, course: { bundleId: null } } }),
      prisma.quizAttempt.findMany({ where: { completedAt: { not: null } }, select: { passed: true } }),
      prisma.enrollment.groupBy({
        by: ['courseId'],
        _count: { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
        take: 6,
      }),
      prisma.enrollment.findMany({
        orderBy: { enrolledAt: 'desc' },
        take: 6,
        select: {
          enrolledAt: true,
          source: true,
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
      }),
    ]);

  const courseTitles = await prisma.course.findMany({
    where: { id: { in: topCourses.map((c) => c.courseId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(courseTitles.map((c) => [c.id, c.title]));

  const completionRate = startedLessons > 0 ? (completedLessons / startedLessons) * 100 : 0;
  const quizPassRate = quizAttempts.length > 0 ? (quizAttempts.filter((q) => q.passed).length / quizAttempts.length) * 100 : 0;

  return (
    <EmbedShell title="University Engagement" subtitle="Students, enrollments and course progress inside the platform">
      <StatGrid cols={4}>
        <Stat label="Students" value={students.toLocaleString()} tone="brand" />
        <Stat label="Enrollments" value={enrollments.toLocaleString()} sub={`+${newEnrollments30} in last 30d`} />
        <Stat label="Active this week" value={String(active7.length)} tone="good" sub="students with lesson activity" />
        <Stat label="Lesson completion" value={`${completionRate.toFixed(0)}%`} sub={`quiz pass rate ${quizPassRate.toFixed(0)}%`} />
      </StatGrid>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Enrollments by course">
          <BarList
            items={topCourses.map((c, i) => ({
              label: titleById.get(c.courseId) ?? c.courseId,
              value: c._count.courseId,
              display: String(c._count.courseId),
              color: chartColor(i),
            }))}
          />
        </Card>
        <Card title="Newest enrollments">
          <DataTable
            headers={['Student', 'Course', 'Via', 'When']}
            rows={recentEnrollments.map((e) => [
              e.user.name ?? e.user.email,
              <span key="c" className="line-clamp-1 max-w-[180px]">{e.course.title}</span>,
              e.source ?? '—',
              e.enrolledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ])}
          />
        </Card>
      </div>
    </EmbedShell>
  );
}
