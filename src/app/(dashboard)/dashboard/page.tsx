import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getEnrolledBundleIds } from '@/lib/enrollment';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, Trophy, Play, GraduationCap, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { CoursesSection } from '@/components/course/CoursesSection';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if admin is viewing as customer
  const cookieStore = await cookies();
  const isAdmin = session.user.role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';

  const showAllCourses = isAdmin && !isCustomerView;
  const enrolledBundleIds = !isCustomerView && session.user.id
    ? await getEnrolledBundleIds(session.user.id)
    : new Set<string>();

  // Fetch user's enrollments with course details and progress
  const enrollments = isCustomerView ? [] : await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        include: {
          modules: {
            include: {
              // Order-by is required here — without it Postgres returns
              // lessons in an arbitrary order, and the "next uncompleted
              // lesson" CTA ends up pointing to a random lesson instead of
              // the first (e.g. 1.3 instead of 1.1 for a brand new user).
              lessons: { orderBy: { order: 'asc' } },
            },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  const enrolledCourseIds = new Set(enrollments.map(e => e.course.id));

  // Fetch ALL published courses for admin view, or to show unenrolled courses
  const allCourses = await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: {
          lessons: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  // Fetch user's lesson progress
  const progress = isCustomerView ? [] : await prisma.lessonProgress.findMany({
    where: { userId: session.user.id },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Enrolled courses to show: admin sees all, regular users see their enrollments
  // Hide bundle child courses when user is enrolled in the parent bundle
  const coursesToShow = (showAllCourses
    ? allCourses.filter(c => c.modules.reduce((acc, m) => acc + m.lessons.length, 0) > 0)
    : enrollments.map(e => e.course)
  ).filter(c => !c.bundleId || !enrolledBundleIds.has(c.bundleId));
  const totalCourses = coursesToShow.length;

  // Calculate stats
  // Note: watchedSeconds is NOT real playback tracking — it's set to lesson.videoDuration
  // when a user clicks "Mark as Complete" (see api/progress/complete/route.ts). So this
  // metric is really "total duration of lessons the user has marked complete".
  const totalWatchedSeconds = progress.reduce((acc, p) => acc + p.watchedSeconds, 0);
  const totalHours = Math.floor(totalWatchedSeconds / 3600);
  const totalMinutes = Math.floor((totalWatchedSeconds % 3600) / 60);
  const certificates = await prisma.certificate.count({ where: { userId: session.user.id } });

  // Lessons completed / total across the user's enrolled (visible) courses
  const visibleCourseIds = new Set(coursesToShow.map(c => c.id));
  const totalLessonsInScope = enrollments
    .filter(e => visibleCourseIds.has(e.course.id))
    .reduce((acc, e) => acc + e.course.modules.reduce((macc, m) => macc + m.lessons.length, 0), 0);
  const lessonsCompletedCount = progress.filter(p => p.completed).length;

  // Quizzes passed (unique quizzes with at least one passing attempt) across enrolled courses
  const enrolledCourseIdList = enrollments.map(e => e.course.id);
  const [totalQuizzesInScope, quizzesPassedCount] = isCustomerView || enrolledCourseIdList.length === 0
    ? [0, 0]
    : await Promise.all([
        prisma.quiz.count({
          where: { courseId: { in: enrolledCourseIdList }, published: true },
        }),
        prisma.quizAttempt.groupBy({
          by: ['quizId'],
          where: {
            userId: session.user.id,
            passed: true,
            quiz: { courseId: { in: enrolledCourseIdList }, published: true },
          },
        }).then(rows => rows.length),
      ]);

  // Recently watched lessons feed (last 3 in-progress)
  const recentProgress = progress
    .filter((p) => !p.completed && p.watchedSeconds > 0)
    .slice(0, 3);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
          {/* Welcome Banner */}
          <div className="relative bg-gradient-to-r from-[#0d1545] via-[#0a1a70] to-[#0000CC] text-white rounded-2xl overflow-hidden mb-10 px-8 py-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(0,0,255,0.25) 0%, transparent 65%)' }} />
            <div className="absolute bottom-0 right-0 w-64 h-64 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative">
              <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-3">Maxxed Out University</p>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                Welcome back{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-blue-200 text-sm">Your business education continues here.</p>
            </div>
          </div>

          {/* Stats Cards */}
          {(() => {
            const lessonsPct = totalLessonsInScope > 0 ? Math.round((lessonsCompletedCount / totalLessonsInScope) * 100) : 0;
            const quizzesPct = totalQuizzesInScope > 0 ? Math.round((quizzesPassedCount / totalQuizzesInScope) * 100) : 0;

            const stats: Array<{
              label: string;
              value: React.ReactNode;
              sublabel: string;
              icon: typeof BookOpen;
              accent: string;
              accentBg: string;
              accentText: string;
              progress?: number;
            }> = [
              {
                label: 'Enrolled Courses',
                value: totalCourses,
                sublabel: totalCourses === 0 ? 'Start learning today' : totalCourses === 1 ? 'Keep it up' : 'Great progress',
                icon: BookOpen,
                accent: 'bg-maxxed-blue',
                accentBg: 'bg-blue-50',
                accentText: 'text-maxxed-blue',
              },
              {
                label: 'Lessons Completed',
                value: <><span>{lessonsCompletedCount}</span><span className="text-xl font-bold text-text-muted"> / {totalLessonsInScope}</span></>,
                sublabel: totalLessonsInScope === 0 ? 'No lessons yet' : `${lessonsPct}% complete`,
                icon: GraduationCap,
                accent: 'bg-purple-500',
                accentBg: 'bg-purple-50',
                accentText: 'text-purple-600',
                progress: lessonsPct,
              },
              {
                label: 'Quizzes Passed',
                value: <><span>{quizzesPassedCount}</span><span className="text-xl font-bold text-text-muted"> / {totalQuizzesInScope}</span></>,
                sublabel: totalQuizzesInScope === 0 ? 'No quizzes yet' : `${quizzesPct}% passed`,
                icon: FileQuestion,
                accent: 'bg-orange-500',
                accentBg: 'bg-orange-50',
                accentText: 'text-orange-600',
                progress: quizzesPct,
              },
              {
                label: 'Study Time',
                value: totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`,
                sublabel: totalWatchedSeconds === 0 ? 'Complete lessons to log time' : 'From completed lessons',
                icon: Clock,
                accent: 'bg-maxxed-gold',
                accentBg: 'bg-yellow-50',
                accentText: 'text-maxxed-gold',
              },
              {
                label: 'Certificates',
                value: certificates,
                sublabel: certificates === 0 ? 'Complete a course to earn' : certificates === 1 ? 'Well earned' : 'Wall of fame',
                icon: Trophy,
                accent: 'bg-green-500',
                accentBg: 'bg-green-50',
                accentText: 'text-green-600',
              },
            ];

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-10">
                {stats.map((s) => (
                  <Card key={s.label} className="shadow-card border-0 overflow-hidden">
                    <div className="flex items-stretch h-full">
                      <div className={`w-1.5 ${s.accent} flex-shrink-0`} />
                      <div className="flex-1 p-4 sm:p-5 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider leading-tight">
                            {s.label}
                          </span>
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${s.accentBg} flex items-center justify-center flex-shrink-0`}>
                            <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.accentText}`} />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-text-dark leading-none tabular-nums">
                          {s.value}
                        </div>
                        {s.progress !== undefined && (
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                            <div
                              className={`h-full ${s.accent} rounded-full transition-all`}
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                        )}
                        <p className="text-[11px] sm:text-xs text-text-muted mt-auto pt-2 leading-tight">
                          {s.sublabel}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })()}


          {/* Continue Learning Section */}
          {recentProgress.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-text-dark mb-6">
                Continue Learning
              </h2>
              <div className="space-y-4">
                {recentProgress.map((p) => (
                  <Card key={p.id} className="shadow-card">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-maxxed-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 text-maxxed-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-dark truncate">{p.lesson.title}</p>
                        <p className="text-sm text-text-muted truncate">
                          {p.lesson.module.course.title} &bull; {p.lesson.module.title}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-maxxed-blue">
                          {Math.round((p.watchedSeconds / (p.lesson.videoDuration || 1)) * 100)}% watched
                        </p>
                        <Link
                          href={`/courses/${p.lesson.module.course.slug}/lessons/${p.lesson.slug}`}
                          className="text-sm text-text-muted hover:text-maxxed-blue"
                        >
                          Resume &rarr;
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Same catalog as / and /courses — bundle children hidden if owned,
            "Enrolled" badge on direct enrollments. Single source of truth. */}
        <CoursesSection />
      </main>
      <Footer />
    </>
  );
}
