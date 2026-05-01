import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Mail, Calendar, Shield, GraduationCap, CheckCircle2, FileQuestion,
  TrendingUp, BookOpen, XCircle, FileSignature, Download, ExternalLink, Send,
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

  // Signed documents tied to this user. We match on userId AND
  // recipientEmail so a contract sent before the User row was linked
  // (e.g. via off-list compose) still surfaces here.
  const documents = await prisma.documentSignature.findMany({
    where: {
      OR: [
        { userId: user.id },
        { recipientEmail: user.email },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      origin: true,
      courseTitle: true,
      paymentTotalCents: true,
      createdAt: true,
      sentAt: true,
      signedAt: true,
      cancelledAt: true,
      contractTemplate: { select: { name: true } },
    },
  });

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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Link
                href={
                  '/admin/documents?' +
                  new URLSearchParams({
                    prefillUserId: user.id,
                    prefillEmail: user.email,
                    prefillName: user.name ?? '',
                  }).toString()
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-maxxed-blue text-white text-xs sm:text-sm font-bold shadow-sm hover:bg-maxxed-blue-dark transition-colors"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                Send Contract
              </Link>
              <span className="inline-flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <UserRoleSelect userId={user.id} currentRole={user.role} />
              </span>
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

      {/* Signed contracts / e-sign documents tied to this user. Includes
          docs sent by userId AND any sent off-list to the same email so
          the audit trail follows the person, not the link. */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-maxxed-blue" />
              Signed Documents
            </h2>
            <span className="text-xs text-gray-400">{documents.length} total</span>
          </div>
          {documents.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No contracts sent to this student yet.
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((d) => {
                const statusBadge = (() => {
                  switch (d.status) {
                    case 'completed':
                      return { label: 'Signed', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
                    case 'sent':
                      return { label: 'Sent', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
                    case 'viewed':
                      return { label: 'Viewed', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' };
                    case 'cancelled':
                      return { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' };
                    case 'declined':
                      return { label: 'Declined', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' };
                    default:
                      return { label: d.status, cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' };
                  }
                })();
                const when = d.signedAt ?? d.sentAt ?? d.createdAt;
                const whenLabel = (() => {
                  if (d.status === 'completed' && d.signedAt) return `Signed ${relative(d.signedAt)}`;
                  if (d.status === 'cancelled' && d.cancelledAt) return `Cancelled ${relative(d.cancelledAt)}`;
                  if (d.sentAt) return `Sent ${relative(d.sentAt)}`;
                  return relative(when);
                })();
                return (
                  <div
                    key={d.id}
                    className="px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {d.courseTitle}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {d.contractTemplate?.name ?? 'Template'}
                        {d.paymentTotalCents != null && (
                          <>
                            {' · '}
                            <span className="font-medium text-gray-700">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                              }).format(d.paymentTotalCents / 100)}
                            </span>
                          </>
                        )}
                        {d.origin === 'manual_admin' && ' · admin send'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <span className="text-xs text-gray-500 hidden sm:inline">{whenLabel}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${statusBadge.cls}`}
                      >
                        {statusBadge.label}
                      </span>
                      {d.status === 'completed' && (
                        <a
                          href={`/api/admin/documents/${d.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-maxxed-blue p-1 rounded-md hover:bg-gray-50"
                          aria-label="Download signed PDF"
                          title="Download signed PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-6 py-3 border-t bg-gray-50/60 text-right">
            <Link
              href="/admin/documents"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-maxxed-blue"
            >
              View all documents <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
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
