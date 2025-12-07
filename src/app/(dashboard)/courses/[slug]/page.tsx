import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Play, Lock, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const session = await auth();

  // Get the course with all modules and lessons
  const course = await prisma.course.findUnique({
    where: { slug, published: true },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Check if user is enrolled
  const enrollment = session?.user?.id
    ? await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: course.id,
          },
        },
      })
    : null;

  const isEnrolled = !!enrollment;

  // Get user's progress
  const progress = session?.user?.id
    ? await prisma.lessonProgress.findMany({
        where: {
          userId: session.user.id,
          lesson: { module: { courseId: course.id } },
        },
      })
    : [];

  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

  // Calculate stats
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = progress.filter((p) => p.completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const totalDuration = course.modules.reduce(
    (acc, m) => acc + m.lessons.reduce((lacc, l) => lacc + (l.videoDuration || 0), 0),
    0
  );
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  // Find next lesson to continue
  let nextLesson = null;
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const lessonProgress = progressMap.get(lesson.id);
      if (!lessonProgress?.completed) {
        nextLesson = { ...lesson, moduleTitle: module.title };
        break;
      }
    }
    if (nextLesson) break;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Course Hero */}
        <div className="bg-gradient-to-r from-maxxed-blue to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
                <p className="text-lg text-blue-100 mb-6">
                  {course.description}
                </p>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span>{totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`} total</span>
                  </div>
                  {isEnrolled && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>{progressPercent}% complete</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Card */}
              <div className="lg:col-span-1">
                <Card className="shadow-xl">
                  <div className="relative h-40 bg-gray-100">
                    {course.thumbnail ? (
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    {isEnrolled ? (
                      <>
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-text-muted mb-2">
                            <span>{completedLessons} of {totalLessons} complete</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-maxxed-blue rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        {nextLesson && (
                          <Link
                            href={`/courses/${course.slug}/lessons/${nextLesson.slug}`}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
                          >
                            <Play className="w-5 h-5" />
                            {progressPercent === 0 ? 'Start Course' : 'Continue Learning'}
                          </Link>
                        )}
                        {!nextLesson && (
                          <div className="text-center py-3 bg-green-100 text-green-800 font-bold rounded">
                            <CheckCircle className="w-5 h-5 inline mr-2" />
                            Course Complete!
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center">
                        <Lock className="w-12 h-12 text-text-muted mx-auto mb-3" />
                        <p className="text-text-muted mb-4">
                          Purchase this course to get full access
                        </p>
                        <button className="w-full py-3 bg-maxxed-gold text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-yellow-600 transition-colors">
                          Get Access
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
          <h2 className="text-2xl font-bold text-text-dark mb-6">Course Content</h2>

          <div className="space-y-4">
            {course.modules.map((module, moduleIndex) => (
              <Card key={module.id} className="shadow-card overflow-hidden">
                <div className="bg-gray-50 px-5 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-text-dark">
                      Module {moduleIndex + 1}: {module.title}
                    </h3>
                    <span className="text-sm text-text-muted">
                      {module.lessons.length} lessons
                    </span>
                  </div>
                  {module.description && (
                    <p className="text-sm text-text-muted mt-1">{module.description}</p>
                  )}
                </div>
                <div className="divide-y">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const lessonProgress = progressMap.get(lesson.id);
                    const isCompleted = lessonProgress?.completed;
                    const isAccessible = isEnrolled || lesson.isFree;
                    const durationMin = Math.ceil((lesson.videoDuration || 0) / 60);

                    return (
                      <div
                        key={lesson.id}
                        className={`px-5 py-4 flex items-center gap-4 ${
                          isAccessible ? 'hover:bg-gray-50' : 'opacity-60'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                          ) : isAccessible ? (
                            <div className="w-8 h-8 rounded-full bg-maxxed-blue/10 flex items-center justify-center">
                              <Play className="w-4 h-4 text-maxxed-blue" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-muted">
                              {moduleIndex + 1}.{lessonIndex + 1}
                            </span>
                            {isAccessible ? (
                              <Link
                                href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                                className="font-medium text-text-dark hover:text-maxxed-blue truncate"
                              >
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className="font-medium text-text-dark truncate">
                                {lesson.title}
                              </span>
                            )}
                            {lesson.isFree && !isEnrolled && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                Free Preview
                              </span>
                            )}
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-text-muted truncate mt-0.5">
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        {/* Duration & Action */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-sm text-text-muted">{durationMin} min</span>
                          {isAccessible && (
                            <Link
                              href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                              className="text-maxxed-blue hover:text-maxxed-blue-dark"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
