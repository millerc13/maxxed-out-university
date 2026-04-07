import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hasActiveBundleEnrollment } from '@/lib/enrollment';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Trophy, ArrowRight, Play, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if admin is viewing as customer
  const cookieStore = await cookies();
  const isAdmin = session.user.role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';

  // For admin (not in customer view): fetch ALL published courses
  // For bundle users: also fetch all published courses
  // For regular users or admin in customer view: fetch only enrolled courses
  const showAllCourses = isAdmin && !isCustomerView;
  const hasBundleAccess = !isCustomerView && session.user.id
    ? await hasActiveBundleEnrollment(session.user.id)
    : false;

  // Fetch user's enrollments with course details and progress
  const enrollments = isCustomerView ? [] : await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  // Fetch ALL published courses for admin or bundle users
  const allCourses = (showAllCourses || hasBundleAccess) ? await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: {
          lessons: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  }) : [];

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

  // Helper function to sort courses: High-value first, then by order
  const sortCourses = <T extends { title: string; price: number | null; order: number }>(courses: T[]): T[] => {
    return [...courses].sort((a, b) => {
      const priceA = a.price ?? 0;
      const priceB = b.price ?? 0;
      if (priceB !== priceA) return priceB - priceA;
      return a.order - b.order;
    });
  };

  // Calculate stats
  const useAllCourses = showAllCourses || hasBundleAccess;
  const totalCourses = useAllCourses ? allCourses.length : enrollments.length;
  const totalWatchedSeconds = progress.reduce((acc, p) => acc + p.watchedSeconds, 0);
  const totalHours = Math.floor(totalWatchedSeconds / 3600);
  const totalMinutes = Math.floor((totalWatchedSeconds % 3600) / 60);
  const certificates = await prisma.certificate.count({ where: { userId: session.user.id } });

  // Calculate progress for courses
  // For admin or bundle users: use all courses; for regular users: use enrollments
  const coursesToShow = useAllCourses
    ? allCourses.filter(c => c.modules.reduce((acc, m) => acc + m.lessons.length, 0) > 0)
    : enrollments.map(e => e.course);

  const sortedCoursesToShow = sortCourses(coursesToShow);

  const coursesWithProgress = sortedCoursesToShow.map((course) => {
    const totalLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0
    );
    const completedLessons = progress.filter(
      (p) =>
        p.completed &&
        p.lesson.module.courseId === course.id
    ).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find next lesson to continue
    const allLessons = course.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleName: m.title }))
    );
    const completedLessonIds = new Set(
      progress.filter((p) => p.completed).map((p) => p.lessonId)
    );
    const nextLesson = allLessons.find((l) => !completedLessonIds.has(l.id));

    return {
      id: course.id,
      courseId: course.id,
      course,
      totalLessons,
      completedLessons,
      progressPercent,
      nextLesson,
    };
  });

  // Get recently watched lessons (in progress)
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
              <p className="text-blue-200 text-sm">Your real estate investing education continues here.</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="shadow-card border-0 overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-1.5 bg-maxxed-blue flex-shrink-0" />
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Enrolled Courses</span>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-maxxed-blue" />
                    </div>
                  </div>
                  <div className="text-4xl font-extrabold text-text-dark">{totalCourses}</div>
                  <p className="text-xs text-text-muted mt-1">
                    {totalCourses === 0 ? 'Start learning today' : totalCourses === 1 ? 'Keep it up!' : 'Great progress!'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="shadow-card border-0 overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-1.5 bg-maxxed-gold flex-shrink-0" />
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Time Watched</span>
                    <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-maxxed-gold" />
                    </div>
                  </div>
                  <div className="text-4xl font-extrabold text-text-dark">
                    {totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {totalWatchedSeconds === 0 ? 'Start watching!' : 'Keep going!'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="shadow-card border-0 overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-1.5 bg-green-500 flex-shrink-0" />
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Certificates</span>
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                  <div className="text-4xl font-extrabold text-text-dark">{certificates}</div>
                  <p className="text-xs text-text-muted mt-1">Complete courses to earn</p>
                </div>
              </div>
            </Card>
          </div>

          {/* My Courses Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-dark">
                  My Courses
                  {coursesWithProgress.length > 0 && (
                    <span className="ml-2 text-sm font-semibold text-text-muted bg-gray-100 px-2 py-0.5 rounded-full align-middle">{coursesWithProgress.length}</span>
                  )}
                </h2>
                {(showAllCourses || hasBundleAccess) && (
                  <p className="text-sm text-text-muted">Courses you have access to</p>
                )}
              </div>
              <Link
                href="/courses"
                className="text-sm text-maxxed-blue hover:underline flex items-center gap-1"
              >
                Browse all courses
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {coursesWithProgress.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <CardTitle className="text-xl mb-2">No courses yet</CardTitle>
                  <CardDescription className="mb-6">
                    You haven&apos;t enrolled in any courses yet. Browse our catalog to get started.
                  </CardDescription>
                  <Link
                    href="/courses"
                    className="inline-block px-6 py-3 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
                  >
                    Browse Courses
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesWithProgress.map((enrollment) => (
                  <Card key={enrollment.id} className="shadow-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="relative aspect-video bg-gray-100">
                      {enrollment.course.thumbnail ? (
                        <Image
                          src={enrollment.course.thumbnail}
                          alt={enrollment.course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex flex-col items-center justify-center p-5 text-center">
                          <BookOpen className="w-8 h-8 text-white/30 mb-2" />
                          <p className="text-white text-xs font-bold leading-tight line-clamp-3">{enrollment.course.title}</p>
                        </div>
                      )}
                      {enrollment.progressPercent === 100 && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Complete
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-text-dark mb-2 line-clamp-1">
                        {enrollment.course.title}
                      </h3>
                      <p className="text-sm text-text-muted mb-4 line-clamp-2">
                        {enrollment.course.shortDesc || enrollment.course.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-text-muted mb-1">
                          <span>{enrollment.completedLessons} of {enrollment.totalLessons} lessons</span>
                          <span>{enrollment.progressPercent}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-maxxed-blue rounded-full transition-all"
                            style={{ width: `${enrollment.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <Link
                        href={
                          enrollment.nextLesson
                            ? `/courses/${enrollment.course.slug}/lessons/${enrollment.nextLesson.slug}`
                            : `/courses/${enrollment.course.slug}`
                        }
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        {enrollment.progressPercent === 0 ? 'Start Learning' : enrollment.progressPercent === 100 ? 'Review Course' : 'Continue'}
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

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
      </main>
      <Footer />
    </>
  );
}
