import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Play, Lock, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function CoursesPage() {
  const session = await auth();

  // Get all published courses
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });

  // Get user's enrollments if logged in
  const enrollments = session?.user
    ? await prisma.enrollment.findMany({
        where: { userId: session.user.id },
        select: { courseId: true },
      })
    : [];

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

  // Get user's progress if logged in
  const progress = session?.user
    ? await prisma.lessonProgress.findMany({
        where: { userId: session.user.id, completed: true },
        select: { lessonId: true },
      })
    : [];

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  // Calculate stats for each course
  const coursesWithStats = courses.map((course) => {
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
      0
    );
    const isEnrolled = enrolledCourseIds.has(course.id);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    // A course is "coming soon" if it has no modules/lessons
    const isComingSoon = totalLessons === 0;

    return {
      ...course,
      totalLessons,
      completedLessons,
      isEnrolled,
      progressPercent,
      isComingSoon,
    };
  });

  // Separate active courses from coming soon courses
  const activeCourses = coursesWithStats.filter((c) => !c.isComingSoon);
  const comingSoonCourses = coursesWithStats.filter((c) => c.isComingSoon);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-text-dark mb-2">All Courses</h1>
            <p className="text-text-body">
              Explore our complete library of real estate investing courses.
            </p>
          </div>

          {/* Active Courses */}
          {activeCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {activeCourses.map((course) => (
                <Card
                  key={course.id}
                  className="shadow-card overflow-hidden hover:shadow-lg transition-shadow"
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
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    {course.isEnrolled && course.progressPercent === 100 && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Complete
                      </div>
                    )}
                    {course.isEnrolled && course.progressPercent > 0 && course.progressPercent < 100 && (
                      <div className="absolute top-3 right-3 bg-maxxed-blue text-white px-2 py-1 rounded text-xs font-bold">
                        {course.progressPercent}% Complete
                      </div>
                    )}
                    {course.featured && !course.isEnrolled && (
                      <div className="absolute top-3 left-3 bg-maxxed-gold text-white px-2 py-1 rounded text-xs font-bold">
                        Featured
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-lg text-text-dark mb-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-text-muted mb-4 line-clamp-2">
                      {course.shortDesc || course.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-text-muted mb-4">
                      <span>{course.totalLessons} lessons</span>
                      <span>{course.modules.length} modules</span>
                    </div>

                    {course.isEnrolled ? (
                      <>
                        {/* Progress Bar for enrolled courses */}
                        <div className="mb-4">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-maxxed-blue rounded-full transition-all"
                              style={{ width: `${course.progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          {course.progressPercent === 0 ? 'Start Learning' : 'Continue Learning'}
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={`/courses/${course.slug}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-maxxed-blue text-maxxed-blue font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue hover:text-white transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        View Course
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Coming Soon Section */}
          {comingSoonCourses.length > 0 && (
            <>
              <div className="mb-6 mt-8">
                <h2 className="text-2xl font-bold text-text-dark mb-2 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-amber-500" />
                  Coming Soon
                </h2>
                <p className="text-text-body">
                  These courses are currently in development. Stay tuned!
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {comingSoonCourses.map((course) => (
                  <Card
                    key={course.id}
                    className="shadow-card overflow-hidden cursor-not-allowed"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-[#1a3a4a] to-[#0d1f29]">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover grayscale opacity-70"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center grayscale opacity-70">
                          <BookOpen className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      {/* Coming Soon Tag */}
                      <div className="absolute top-2 right-2">
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4 opacity-60">
                      <h3 className="font-bold text-base text-text-dark mb-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-text-muted line-clamp-2 mb-3">
                        {course.description || 'Course details coming soon...'}
                      </p>
                      <span className="flex items-center justify-center gap-2 w-full py-2 border-2 border-gray-300 text-gray-400 font-bold text-xs uppercase tracking-wider rounded cursor-not-allowed">
                        Coming Soon
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {courses.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-dark mb-2">No courses available</h2>
                <p className="text-text-muted">
                  Check back soon for new content!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
