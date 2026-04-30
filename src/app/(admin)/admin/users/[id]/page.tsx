import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Mail, Calendar, Shield, GraduationCap, CheckCircle2, FileQuestion,
  TrendingUp, BookOpen, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserRoleSelect } from '@/components/admin/UserRoleSelect';
import { ConversationViewer } from '@/components/admin/ConversationViewer';

// Always fresh — progress rows change as students work through content.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function relative(date: Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              isBundle: true,
              modules: {
                select: {
                  id: true,
                  title: true,
                  order: true,
                  lessons: {
                    select: { id: true, title: true, order: true, isPublished: true },
                    orderBy: { order: 'asc' },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      },
      progress: {
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  order: true,
                  course: { select: { title: true, slug: true } },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (!user) notFound();

  // Quiz attempts (no back-relation from User, so fetch separately)
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId: id },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          course: { select: { title: true, slug: true } },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  const progressByLesson = new Map(user.progress.map((p) => [p.lessonId, p]));

  const completedLessons = user.progress.filter((p) => p.completed).length;
  const startedLessons = user.progress.length;
  const quizzesTaken = quizAttempts.length;
  const quizzesPassed = quizAttempts.filter((a) => a.passed).length;

  // Build per-course completion summary
  const courseSummaries = user.enrollments.map((e) => {
    const publishedLessons = e.course.modules.flatMap((m) =>
      m.lessons.filter((l) => l.isPublished)
    );
    const completedInCourse = publishedLessons.filter((l) => {
      const p = progressByLesson.get(l.id);
      return p?.completed;
    }).length;
    const pct = publishedLessons.length > 0
      ? Math.round((completedInCourse / publishedLessons.length) * 100)
      : 0;
    return {
      courseId: e.course.id,
      title: e.course.title,
      slug: e.course.slug,
      isBundle: e.course.isBundle,
      enrolledAt: e.enrolledAt,
      source: e.source,
      completed: completedInCourse,
      total: publishedLessons.length,
      pct,
    };
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* User header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-maxxed-blue/10 flex items-center justify-center text-maxxed-blue text-2xl font-bold">
              {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {user.name || 'No name'}
              </h1>
              <p className="text-gray-500 flex items-center gap-1.5 text-sm mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
              <p className="text-gray-400 flex items-center gap-1.5 text-xs mt-1">
                <Calendar className="w-3 h-3" />
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <UserRoleSelect userId={user.id} currentRole={user.role} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Enrollments', value: user.enrollments.length, icon: GraduationCap, color: 'text-purple-600 bg-purple-50' },
          { label: 'Lessons Done', value: completedLessons, sub: `${startedLessons} started`, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
          { label: 'Quizzes Taken', value: quizzesTaken, sub: `${quizzesPassed} passed`, icon: FileQuestion, color: 'text-blue-600 bg-blue-50' },
          { label: 'Last Active', value: relative(user.progress[0]?.updatedAt), icon: TrendingUp, color: 'text-orange-600 bg-orange-50', isText: true },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className={`font-bold text-gray-900 ${s.isText ? 'text-base' : 'text-2xl'} leading-tight`}>
                  {s.value}
                </p>
                {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enrollments + per-course progress */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-maxxed-blue" />
              Enrollments & Progress
            </h2>
          </div>
          {courseSummaries.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Not enrolled in any courses.</div>
          ) : (
            <div className="divide-y">
              {courseSummaries.map((c) => (
                <div key={c.courseId} className="px-6 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <Link href={`/courses/${c.slug}`} className="font-medium text-gray-900 hover:text-maxxed-blue truncate block">
                      {c.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.isBundle ? 'Bundle · ' : ''}
                      Enrolled {new Date(c.enrolledAt).toLocaleDateString()}
                      {c.source && ` · ${c.source}`}
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-gray-500">{c.completed} of {c.total} lessons</span>
                      <span className="font-semibold text-gray-900">{c.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.pct === 100 ? 'bg-green-500' : 'bg-maxxed-blue'}`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz attempts */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-maxxed-blue" />
              Quiz Attempts
            </h2>
          </div>
          {quizAttempts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No quiz attempts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Quiz</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-center">Result</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quizAttempts.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{a.quiz.title}</td>
                      <td className="px-4 py-3 text-gray-500">{a.quiz.course?.title || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{a.score}%</td>
                      <td className="px-4 py-3 text-center">
                        {a.completedAt ? (
                          a.passed ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">In progress</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{relative(a.startedAt)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{relative(a.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent lesson progress */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-maxxed-blue" />
              Recent Lesson Progress
            </h2>
          </div>
          {user.progress.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No lesson activity yet.</div>
          ) : (
            <div className="divide-y">
              {user.progress.slice(0, 20).map((p) => (
                <div key={p.id} className="px-6 py-3 flex items-center gap-4">
                  {p.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.lesson.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.lesson.module.course.title}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{relative(p.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GHL conversation thread — read-only viewer for confirming
          welcome / magic-link messages were actually delivered. Renders
          its own empty state when no GHL contact can be resolved, so we
          mount it unconditionally. */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900">GHL Conversation</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Live SMS + email thread from GoHighLevel. Auto-refreshes every 10 seconds.
            </p>
          </div>
          <div className="p-6">
            <ConversationViewer
              contactId={user.ghlContactId ?? undefined}
              email={user.email ?? undefined}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
