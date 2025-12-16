import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Trophy, ArrowRight, Play, CheckCircle, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, getPriceTier } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if admin is viewing as customer
  const cookieStore = await cookies();
  const isAdmin = (session.user as any).role === 'ADMIN';
  const isCustomerView = isAdmin && cookieStore.get('admin_customer_view')?.value === 'true';

  // Fetch user's enrollments with course details and progress
  // If admin is in customer view, return empty array to simulate no enrollments
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

  // Fetch user's lesson progress
  // If admin is in customer view, return empty array
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

  // Fetch available courses (not enrolled)
  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const availableCourses = await prisma.course.findMany({
    where: {
      published: true,
      id: { notIn: Array.from(enrolledCourseIds) },
    },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
    orderBy: [{ price: 'asc' }, { order: 'asc' }],
  });

  // Filter out courses with no lessons (coming soon)
  const availableWithLessons = availableCourses
    .map((course) => ({
      ...course,
      totalLessons: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    }))
    .filter((course) => course.totalLessons > 0);

  // Calculate stats
  const totalCourses = enrollments.length;
  const totalWatchedSeconds = progress.reduce((acc, p) => acc + p.watchedSeconds, 0);
  const totalHours = Math.floor(totalWatchedSeconds / 3600);
  const totalMinutes = Math.floor((totalWatchedSeconds % 3600) / 60);
  const certificates = await prisma.certificate.count({ where: { userId: session.user.id } });

  // Calculate progress for each enrolled course
  const coursesWithProgress = enrollments.map((enrollment) => {
    const totalLessons = enrollment.course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0
    );
    const completedLessons = progress.filter(
      (p) =>
        p.completed &&
        p.lesson.module.courseId === enrollment.courseId
    ).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find next lesson to continue
    const allLessons = enrollment.course.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleName: m.title }))
    );
    const completedLessonIds = new Set(
      progress.filter((p) => p.completed).map((p) => p.lessonId)
    );
    const nextLesson = allLessons.find((l) => !completedLessonIds.has(l.id));

    return {
      ...enrollment,
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

  // Get featured available courses (top 3 by tier for recommendation)
  const recommendedCourses = availableWithLessons.slice(0, 6);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
          {/* Welcome Section */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-text-dark mb-2">
              Welcome back{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-text-body">
              Continue your learning journey where you left off.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Enrolled Courses
                </CardTitle>
                <BookOpen className="w-5 h-5 text-maxxed-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-dark">{totalCourses}</div>
                <p className="text-xs text-text-muted mt-1">
                  {totalCourses === 0 ? 'Start learning today' : totalCourses === 1 ? 'Keep it up!' : 'Great progress!'}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Time Watched
                </CardTitle>
                <Clock className="w-5 h-5 text-maxxed-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-dark">
                  {totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {totalWatchedSeconds === 0 ? 'Start watching!' : 'Keep going!'}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Certificates
                </CardTitle>
                <Trophy className="w-5 h-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-dark">{certificates}</div>
                <p className="text-xs text-text-muted mt-1">
                  Complete courses to earn
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Courses Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-dark">My Courses</h2>
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
                  <Card key={enrollment.id} className="shadow-card overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-video bg-gray-100">
                      {enrollment.course.thumbnail ? (
                        <Image
                          src={enrollment.course.thumbnail}
                          alt={enrollment.course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-gray-300" />
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
                        {enrollment.progressPercent === 0 ? 'Start Course' : enrollment.progressPercent === 100 ? 'Review Course' : 'Continue'}
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

          {/* Available Courses Section */}
          {recommendedCourses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-dark">Expand Your Knowledge</h2>
                    <p className="text-sm text-text-muted">Courses available for purchase</p>
                  </div>
                </div>
                <Link
                  href="/courses"
                  className="text-sm text-maxxed-blue hover:underline flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedCourses.map((course) => {
                  const tier = getPriceTier(course.price);
                  return (
                    <Card
                      key={course.id}
                      className="shadow-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                    >
                      <div className="relative aspect-video bg-gray-100">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-maxxed-blue/20 to-maxxed-gold/20">
                            <BookOpen className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        {course.featured && (
                          <div className="absolute top-3 left-3 bg-maxxed-gold text-white px-2 py-1 rounded text-xs font-bold">
                            Featured
                          </div>
                        )}
                        {/* Price Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`${tier.bgColor} ${tier.color} px-2 py-1 rounded text-xs font-bold`}>
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-bold text-text-dark mb-2 line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-sm text-text-muted mb-4 line-clamp-2">
                          {course.shortDesc || course.description}
                        </p>

                        <div className="flex items-center justify-between text-sm text-text-muted mb-4">
                          <span>{course.totalLessons} lessons</span>
                          <span className={`${tier.color} font-medium`}>{tier.label}</span>
                        </div>

                        <Link
                          href={`/courses/${course.slug}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-maxxed-blue text-maxxed-blue font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue hover:text-white transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                          {course.price ? 'Get Access' : 'Enroll Free'}
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
