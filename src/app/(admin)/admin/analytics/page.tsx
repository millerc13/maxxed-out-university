import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { listFanbasisTransactions } from '@/lib/fanbasis-spend';

// Always render fresh — enrollment and completion data changes constantly;
// a cached snapshot is worse than a 300ms DB query on every admin visit.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import {
  Users, TrendingUp, BookOpen,
  GraduationCap, BarChart2, FileQuestion, UserCheck,
} from 'lucide-react';

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function AnalyticsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Bundle children inflate every count by 30-40x: when a student buys
  // the Real Estate Empire Blueprint bundle we auto-enroll them in
  // every child course, so a single $X purchase shows up as 41 separate
  // enrollment rows. Filtering to `course.bundleId === null` keeps
  // top-level courses (standalone + bundle parents) and gives us the
  // "real purchase" count.
  const primaryEnrollmentWhere = { course: { bundleId: null } } as const;

  const [
    totalUsers,
    newUsersThisMonth,
    totalCourses,
    totalEnrollments,
    newEnrollmentsThisMonth,
    completedLessons,
    totalLessonsWithProgress,
    topCourses,
    dailyEnrollments,
    studentActivity,
    quizAttemptsRaw,
    studentUsers,
    fanbasisTxs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: thisMonthStart } } }),
    // Top-level courses only (bundle parents + standalone). Bundle
    // children are inventory padding — they appear once per buyer
    // automatically and aren't editable products on their own.
    prisma.course.count({ where: { bundleId: null } }),
    prisma.enrollment.count({ where: primaryEnrollmentWhere }),
    prisma.enrollment.count({
      where: { ...primaryEnrollmentWhere, enrolledAt: { gte: thisMonthStart } },
    }),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.lessonProgress.count(),
    // Top courses by enrollment, top-level only — keeps bundle parents
    // + standalone courses, drops the duplicated child-course rows.
    prisma.course.findMany({
      where: { published: true, bundleId: null },
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
    // Daily enrollments for last 30 days, primary-purchase only.
    prisma.enrollment.findMany({
      where: { ...primaryEnrollmentWhere, enrolledAt: { gte: thirtyDaysAgo } },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: 'asc' },
    }),
    // Per-student activity — enrollments, completions, last active.
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { enrollments: { where: primaryEnrollmentWhere } } },
        progress: { select: { completed: true, updatedAt: true } },
        enrollments: {
          where: primaryEnrollmentWhere,
          select: { course: { select: { title: true, slug: true } } },
          take: 3,
          orderBy: { enrolledAt: 'desc' },
        },
      },
      take: 50,
    }),
    // Per-attempt rows for the Student Quiz Results section. We pull
    // every attempt with the quiz + user joined; the page then filters
    // to "real customer" attempts only (matched against Fanbasis spend
    // below) so test users + deleted accounts don't pollute the table.
    prisma.quizAttempt.findMany({
      select: {
        id: true,
        score: true,
        passed: true,
        startedAt: true,
        completedAt: true,
        userId: true,
        quiz: {
          select: {
            title: true,
            passingScore: true,
            course: { select: { title: true, slug: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, email: true, name: true },
    }),
    // Every successful Fanbasis transaction with gross + net + fees,
    // pulled live from the Fanbasis list API. Authoritative — matches
    // the Fanbasis dashboard exactly (incl. ClarityPay financing
    // splits which webhook logs alone can't see).
    listFanbasisTransactions(),
  ]);

  // Revenue numbers live on the dashboard (`/admin`) — analytics
  // focuses on course + engagement metrics. We still need
  // listFanbasisTransactions to identify "real customers" for the
  // quiz filter below (≥$1k Fanbasis spend) but we don't compute
  // any totals from them here.
  void fanbasisTxs;

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

  // ── Real-customer filter ─────────────────────────────────────────────────
  // A "real customer" is a STUDENT whose email shows up in the live
  // Fanbasis transactions list with cumulative spend ≥ $1,000. This
  // naturally excludes:
  //   · orphaned quiz attempts (deleted users — userId still in
  //     QuizAttempt but no User row; no email to match)
  //   · admins (role gate)
  //   · CJ-style $2-$3 test charges (under threshold)
  //   · accounts that never paid (no Fanbasis match)
  const fanbasisSpendByEmail = new Map<string, number>();
  for (const t of fanbasisTxs) {
    if (!t.email) continue;
    fanbasisSpendByEmail.set(
      t.email,
      (fanbasisSpendByEmail.get(t.email) ?? 0) + t.grossCents
    );
  }
  const REAL_CUSTOMER_THRESHOLD_CENTS = 100_000; // $1,000
  const realCustomerUserIds = new Set<string>();
  const userById = new Map<string, (typeof studentUsers)[number]>();
  for (const u of studentUsers) {
    userById.set(u.id, u);
    const spend = fanbasisSpendByEmail.get(
      (u.email ?? '').toLowerCase().trim()
    );
    if (spend != null && spend >= REAL_CUSTOMER_THRESHOLD_CENTS) {
      realCustomerUserIds.add(u.id);
    }
  }

  // Group quiz attempts by userId for per-student tallies (used by the
  // Student Activity table). Unfiltered here — student-activity
  // already only iterates STUDENT-role users.
  const quizAttemptsByUser = new Map<string, typeof quizAttemptsRaw>();
  for (const a of quizAttemptsRaw) {
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

  // ── Quiz results — real customers only ──────────────────────────────────
  // Flat per-attempt rows: who took which quiz, when, and whether they
  // passed. Filtered to confirmed paying customers so test/orphan
  // attempts don't pollute the dashboard.
  const realQuizAttempts = quizAttemptsRaw
    .filter((a) => realCustomerUserIds.has(a.userId))
    .map((a) => {
      const u = userById.get(a.userId);
      return {
        id: a.id,
        studentName: u?.name || u?.email || a.userId,
        studentEmail: u?.email ?? null,
        quizTitle: a.quiz.title,
        courseTitle: a.quiz.course?.title ?? '—',
        score: a.score,
        passingScore: a.quiz.passingScore,
        passed: a.passed,
        when: a.completedAt ?? a.startedAt,
        completed: !!a.completedAt,
      };
    });
  const realAttemptsTotal = realQuizAttempts.length;
  const realAttemptsPassed = realQuizAttempts.filter((r) => r.passed).length;

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

      {/* Course + engagement KPIs (revenue lives on /admin dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: totalCourses.toLocaleString(), icon: BookOpen, color: 'bg-purple-500', sub: 'Top-level only' },
          { label: 'Total Students', value: totalUsers.toLocaleString(), icon: Users, color: 'bg-blue-500', sub: `+${newUsersThisMonth} this month` },
          { label: 'Total Enrollments', value: totalEnrollments.toLocaleString(), icon: GraduationCap, color: 'bg-green-500', sub: `+${newEnrollmentsThisMonth} this month` },
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

      {/* Top Courses */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-maxxed-blue" />
              Top Courses by Enrollment
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Top-level purchases only — bundle children aren&apos;t double-counted.
            </p>
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

      {/* Student Quiz Results — real customers only */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-maxxed-blue" />
                Student Quiz Results
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Paying customers only · test attempts and orphaned records hidden
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Attempts</p>
                <p className="text-xl font-bold text-gray-900">{realAttemptsTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Passed</p>
                <p className="text-xl font-bold text-green-600">{realAttemptsPassed.toLocaleString()}</p>
              </div>
            </div>
          </div>
          {realQuizAttempts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No customer quiz attempts yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Student</th>
                    <th className="px-4 py-3">Quiz</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-center">Result</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {realQuizAttempts.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{a.studentName}</p>
                        {a.studentEmail && a.studentEmail !== a.studentName && (
                          <p className="text-xs text-gray-500">{a.studentEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.quizTitle}</td>
                      <td className="px-4 py-3 text-gray-500">{a.courseTitle}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            a.score >= a.passingScore
                              ? 'text-green-600 font-semibold tabular-nums'
                              : 'text-orange-600 font-semibold tabular-nums'
                          }
                        >
                          {a.score}%
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {' '}/ {a.passingScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!a.completed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                            In progress
                          </span>
                        ) : a.passed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] bg-red-50 text-red-700 ring-1 ring-red-200">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{relative(a.when)}</td>
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
