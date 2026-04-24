import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';

// Always render fresh — enrollment and completion data changes constantly;
// a cached snapshot is worse than a 300ms DB query on every admin visit.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import {
  Users, DollarSign, TrendingUp, PlayCircle,
  GraduationCap, Eye, Clock, BarChart2, FileQuestion, UserCheck,
} from 'lucide-react';

// ── Cloudflare Stream analytics ──────────────────────────────────────────────
async function fetchStreamAnalytics() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;
  if (!accountId || !token) return [];

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/analytics/views?metrics[]=totalImpressions&metrics[]=totalTimeViewed&dimensions[]=videoId&from=${from}&to=${to}&limit=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    );
    const data = await res.json();
    if (!data.success) return [];
    return (data.result?.data ?? []) as Array<{
      dimensions: { videoId: string };
      metrics: [number, number]; // [impressions, timeViewed seconds]
    }>;
  } catch {
    return [];
  }
}

async function fetchStreamVideos() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;
  if (!accountId || !token) return [];

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?limit=50`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    );
    const data = await res.json();
    return (data.result ?? []) as Array<{ uid: string; meta: { name?: string }; duration: number }>;
  } catch {
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMinutes(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function AnalyticsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    newUsersThisMonth,
    totalEnrollments,
    newEnrollmentsThisMonth,
    stripeEnrollments,
    completedLessons,
    totalLessonsWithProgress,
    topCourses,
    dailyEnrollments,
    studentActivity,
    quizStats,
    totalQuizAttempts,
    allQuizAttempts,
    streamAnalytics,
    streamVideos,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: thisMonthStart } } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { enrolledAt: { gte: thisMonthStart } } }),
    // Revenue: sum prices of stripe-sourced enrollments
    prisma.enrollment.findMany({
      where: { source: 'stripe' },
      include: { course: { select: { price: true } } },
    }),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.lessonProgress.count(),
    // Top courses by enrollment count
    prisma.course.findMany({
      where: { published: true },
      select: {
        id: true, title: true,
        _count: { select: { enrollments: true } },
        modules: {
          select: {
            lessons: {
              select: {
                progress: { where: { completed: true }, select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { enrollments: { _count: 'desc' } },
      take: 6,
    }),
    // Daily enrollments for last 30 days
    prisma.enrollment.findMany({
      where: { enrolledAt: { gte: thirtyDaysAgo } },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: 'asc' },
    }),
    // Per-student activity — enrollments, completions, last active
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { enrollments: true } },
        progress: { select: { completed: true, updatedAt: true } },
        enrollments: {
          select: { course: { select: { title: true, slug: true } } },
          take: 3,
          orderBy: { enrolledAt: 'desc' },
        },
      },
      take: 50,
    }),
    // Per-quiz attempt stats
    prisma.quiz.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        passingScore: true,
        course: { select: { title: true, slug: true } },
        attempts: { select: { passed: true, score: true, completedAt: true } },
      },
    }),
    prisma.quizAttempt.count(),
    // All quiz attempts with userId — grouped in JS below
    prisma.quizAttempt.findMany({
      select: { userId: true, passed: true, completedAt: true, score: true },
    }),
    fetchStreamAnalytics(),
    fetchStreamVideos(),
  ]);

  // Revenue calc
  const totalRevenue = stripeEnrollments.reduce((sum, e) => sum + (e.course.price ?? 0), 0);
  const completionRate = totalLessonsWithProgress > 0
    ? Math.round((completedLessons / totalLessonsWithProgress) * 100)
    : 0;

  // Build 30-day enrollment chart data
  const days: { label: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = dailyEnrollments.filter(e => {
      const ed = new Date(e.enrolledAt);
      return ed.toDateString() === d.toDateString();
    }).length;
    days.push({ label, count });
  }
  const maxDayCount = Math.max(...days.map(d => d.count), 1);

  // Merge stream analytics with video names
  const videoMap = new Map(streamVideos.map(v => [v.uid, v]));
  const videoStats = streamAnalytics.map(a => ({
    id: a.dimensions.videoId,
    name: videoMap.get(a.dimensions.videoId)?.meta?.name ?? a.dimensions.videoId,
    views: a.metrics[0],
    watchTimeSeconds: a.metrics[1],
  })).sort((a, b) => b.views - a.views);

  const totalStreamViews = videoStats.reduce((s, v) => s + v.views, 0);
  const totalStreamWatchSeconds = videoStats.reduce((s, v) => s + v.watchTimeSeconds, 0);

  // ── Per-student activity summary ─────────────────────────────────────────────
  // Group quiz attempts by userId since the schema has no User->QuizAttempt back-relation.
  const quizAttemptsByUser = new Map<string, typeof allQuizAttempts>();
  for (const a of allQuizAttempts) {
    const list = quizAttemptsByUser.get(a.userId) ?? [];
    list.push(a);
    quizAttemptsByUser.set(a.userId, list);
  }

  const studentRows = studentActivity.map((u) => {
    const lessonsCompleted = u.progress.filter((p) => p.completed).length;
    const lessonsInProgress = u.progress.length - lessonsCompleted;
    const userAttempts = quizAttemptsByUser.get(u.id) ?? [];
    const quizzesTaken = userAttempts.length;
    const quizzesPassed = userAttempts.filter((a) => a.passed).length;
    const lastLessonTouch = u.progress.reduce<Date | null>(
      (max, p) => (!max || p.updatedAt > max ? p.updatedAt : max),
      null
    );
    const lastQuizTouch = userAttempts.reduce<Date | null>(
      (max, a) => (a.completedAt && (!max || a.completedAt > max) ? a.completedAt : max),
      null
    );
    const lastActive =
      lastLessonTouch && lastQuizTouch
        ? lastLessonTouch > lastQuizTouch ? lastLessonTouch : lastQuizTouch
        : lastLessonTouch || lastQuizTouch;
    return {
      id: u.id,
      label: u.name || u.email || u.id,
      email: u.email,
      enrollments: u._count.enrollments,
      lessonsCompleted,
      lessonsInProgress,
      quizzesTaken,
      quizzesPassed,
      lastActive,
      recentCourses: u.enrollments.map((e) => e.course.title),
    };
  });
  // Sort by activity: last-active desc, then by completions desc
  studentRows.sort((a, b) => {
    const at = a.lastActive?.getTime() ?? 0;
    const bt = b.lastActive?.getTime() ?? 0;
    if (at !== bt) return bt - at;
    return b.lessonsCompleted - a.lessonsCompleted;
  });

  const activeStudentCount = studentRows.filter((s) => s.lastActive).length;

  // ── Quiz performance ─────────────────────────────────────────────────────────
  const quizRows = quizStats
    .map((q) => {
      const completed = q.attempts.filter((a) => a.completedAt);
      const passed = completed.filter((a) => a.passed);
      const avgScore = completed.length > 0
        ? Math.round(completed.reduce((sum, a) => sum + a.score, 0) / completed.length)
        : null;
      return {
        id: q.id,
        title: q.title,
        courseTitle: q.course?.title || '—',
        passingScore: q.passingScore,
        totalAttempts: q.attempts.length,
        completedAttempts: completed.length,
        passedAttempts: passed.length,
        passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : null,
        avgScore,
      };
    })
    .sort((a, b) => b.totalAttempts - a.totalAttempts);

  const quizzesPassedOverall = quizRows.reduce((s, q) => s + q.passedAttempts, 0);

  function relative(date: Date | null): string {
    if (!date) return 'never';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Platform performance · last 30 days</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (Stripe)', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'bg-green-500', sub: `${stripeEnrollments.length} paid enrollments` },
          { label: 'Total Students', value: totalUsers.toLocaleString(), icon: Users, color: 'bg-blue-500', sub: `+${newUsersThisMonth} this month` },
          { label: 'Total Enrollments', value: totalEnrollments.toLocaleString(), icon: GraduationCap, color: 'bg-purple-500', sub: `+${newEnrollmentsThisMonth} this month` },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'bg-orange-500', sub: `${completedLessons.toLocaleString()} lessons done` },
        ].map(stat => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color} shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enrollments Chart */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-maxxed-blue" />
            Enrollments — Last 30 Days
          </h2>
          <div className="flex items-end gap-1 h-36">
            {days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-maxxed-blue rounded-t-sm transition-all hover:bg-blue-700"
                  style={{ height: `${(day.count / maxDayCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                />
                {/* Tooltip */}
                {day.count > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                    {day.count} — {day.label}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{days[0].label}</span>
            <span>{days[14].label}</span>
            <span>{days[29].label}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-maxxed-blue" />
                Top Courses by Enrollment
              </h2>
            </div>
            <div className="divide-y">
              {topCourses.map((course, i) => {
                const totalCompleted = course.modules.flatMap(m => m.lessons).flatMap(l => l.progress).length;
                return (
                  <div key={course.id} className="px-6 py-4 flex items-center gap-4">
                    <span className="text-lg font-extrabold text-gray-200 w-6 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{course.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{totalCompleted} lesson completions</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-gray-900">{course._count.enrollments}</span>
                      <p className="text-xs text-gray-400">students</p>
                    </div>
                  </div>
                );
              })}
              {topCourses.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No enrollments yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stream Video Analytics */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-maxxed-blue" />
                Video Analytics (Stream · 30 days)
              </h2>
              {videoStats.length > 0 && (
                <div className="flex gap-6 mt-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total Views</p>
                    <p className="text-xl font-bold text-gray-900">{totalStreamViews.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Watch Time</p>
                    <p className="text-xl font-bold text-gray-900">{formatMinutes(totalStreamWatchSeconds)}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="divide-y">
              {videoStats.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  {process.env.CLOUDFLARE_STREAM_TOKEN
                    ? 'No video data yet — views will appear here once students watch'
                    : 'Stream not configured'}
                </div>
              ) : (
                videoStats.slice(0, 6).map(video => (
                  <div key={video.id} className="px-6 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{video.name}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {video.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatMinutes(video.watchTimeSeconds)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-maxxed-blue" />
              Quiz Performance
            </h2>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Attempts</p>
                <p className="text-xl font-bold text-gray-900">{totalQuizAttempts.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Passes</p>
                <p className="text-xl font-bold text-green-600">{quizzesPassedOverall.toLocaleString()}</p>
              </div>
            </div>
          </div>
          {quizRows.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No published quizzes yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Quiz</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3 text-right">Attempts</th>
                    <th className="px-4 py-3 text-right">Passed</th>
                    <th className="px-4 py-3 text-right">Pass Rate</th>
                    <th className="px-4 py-3 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quizRows.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{q.title}</td>
                      <td className="px-4 py-3 text-gray-500">{q.courseTitle}</td>
                      <td className="px-4 py-3 text-right font-medium">{q.totalAttempts}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{q.passedAttempts}</td>
                      <td className="px-4 py-3 text-right">
                        {q.passRate === null
                          ? <span className="text-gray-400">—</span>
                          : <span className={q.passRate >= 70 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>{q.passRate}%</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {q.avgScore === null
                          ? <span className="text-gray-400">—</span>
                          : <span className={q.avgScore >= q.passingScore ? 'text-green-600' : 'text-orange-600'}>{q.avgScore}%</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Activity */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-maxxed-blue" />
                Student Activity
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {activeStudentCount} of {studentRows.length} students have started coursework
              </p>
            </div>
          </div>
          {studentRows.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No students yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Student</th>
                    <th className="px-4 py-3 text-right">Enrolled</th>
                    <th className="px-4 py-3 text-right">Lessons Done</th>
                    <th className="px-4 py-3 text-right">Quizzes Taken / Passed</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {studentRows.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{s.label}</p>
                        {s.email && s.email !== s.label && (
                          <p className="text-xs text-gray-500">{s.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium">{s.enrollments}</span>
                        {s.recentCourses.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px] ml-auto">
                            {s.recentCourses.join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{s.lessonsCompleted}</span>
                        {s.lessonsInProgress > 0 && (
                          <span className="text-xs text-gray-400"> · {s.lessonsInProgress} started</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.quizzesTaken === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className="font-medium">
                            {s.quizzesTaken} / <span className="text-green-600">{s.quizzesPassed}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{relative(s.lastActive)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/users/${s.id}`} className="text-maxxed-blue hover:underline text-xs">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
