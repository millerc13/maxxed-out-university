import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { Play, CheckCircle, ChevronLeft, ChevronRight, Lock, List, FileQuestion, Trophy } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

interface LessonPageProps {
  params: Promise<{ slug: string; lessonSlug: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, lessonSlug } = await params;
  const session = await auth();

  // Get the course with all modules, lessons, and quizzes
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
      quizzes: {
        where: { published: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Find the current lesson
  type LessonType = typeof course.modules[0]['lessons'][0];
  type ModuleType = typeof course.modules[0];

  let currentLesson: LessonType | null = null;
  let currentModule: ModuleType | null = null;
  let lessonIndex = 0;
  const allLessons: Array<{ lesson: LessonType; module: ModuleType; globalIndex: number }> = [];

  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      allLessons.push({ lesson, module, globalIndex: allLessons.length });
      if (lesson.slug === lessonSlug) {
        currentLesson = lesson;
        currentModule = module;
        lessonIndex = allLessons.length - 1;
      }
    }
  }

  if (!currentLesson || !currentModule) {
    notFound();
  }

  // Check access
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
  const hasAccess = isEnrolled || currentLesson.isFree;

  if (!hasAccess) {
    redirect(`/courses/${slug}`);
  }

  // Get user's progress for all lessons
  const progress = session?.user?.id
    ? await prisma.lessonProgress.findMany({
        where: {
          userId: session.user.id,
          lesson: { module: { courseId: course.id } },
        },
      })
    : [];

  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
  const currentProgress = progressMap.get(currentLesson.id);

  // Get quiz attempts for this course's quizzes
  const quizAttempts = session?.user?.id
    ? await prisma.quizAttempt.findMany({
        where: {
          userId: session.user.id,
          quizId: { in: course.quizzes.map((q) => q.id) },
        },
        orderBy: { completedAt: 'desc' },
      })
    : [];

  // Group quiz attempts by quizId
  const quizAttemptsMap = new Map<string, typeof quizAttempts>();
  for (const attempt of quizAttempts) {
    const existing = quizAttemptsMap.get(attempt.quizId) || [];
    existing.push(attempt);
    quizAttemptsMap.set(attempt.quizId, existing);
  }

  // Navigation
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {/* Video Player Area */}
          <div className="aspect-video bg-black relative">
            {currentLesson.videoUrl ? (
              <video
                className="w-full h-full"
                controls
                autoPlay={false}
                playsInline
                poster=""
              >
                <source src={currentLesson.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-white">
                <div>
                  <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                    <Play className="w-12 h-12 text-white ml-1" />
                  </div>
                  <p className="text-xl font-medium">{currentLesson.title}</p>
                  <p className="text-gray-400 mt-2">Video coming soon</p>
                </div>
              </div>
            )}

            {/* Completion Badge */}
            {currentProgress?.completed && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 z-10">
                <CheckCircle className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>

          {/* Lesson Navigation Bar */}
          <div className="bg-gray-800 text-white px-5 py-4">
            <div className="flex items-center justify-between">
              {/* Prev */}
              {prevLesson ? (
                <Link
                  href={`/courses/${slug}/lessons/${prevLesson.lesson.slug}`}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Previous</span>
                </Link>
              ) : (
                <div />
              )}

              {/* Current Lesson Info */}
              <div className="text-center">
                <p className="text-sm text-gray-400">{currentModule.title}</p>
                <p className="font-medium">{currentLesson.title}</p>
              </div>

              {/* Next */}
              {nextLesson ? (
                <Link
                  href={`/courses/${slug}/lessons/${nextLesson.lesson.slug}`}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <Link
                  href={`/courses/${slug}`}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <span className="hidden sm:inline">Back to Course</span>
                  <List className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-background">
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Lesson Content */}
              <div className="lg:col-span-2">
                <Card className="shadow-card">
                  <CardContent className="p-6">
                    <h1 className="text-2xl font-bold text-text-dark mb-4">
                      {currentLesson.title}
                    </h1>
                    {currentLesson.description && (
                      <p className="text-text-body mb-6">{currentLesson.description}</p>
                    )}
                    {currentLesson.content ? (
                      <MarkdownContent content={currentLesson.content} />
                    ) : (
                      <p className="text-text-muted italic">
                        No additional content for this lesson.
                      </p>
                    )}

                    {/* Mark Complete Button */}
                    {isEnrolled && !currentProgress?.completed && (
                      <div className="mt-8 pt-6 border-t">
                        <form action={`/api/progress/complete`} method="POST">
                          <input type="hidden" name="lessonId" value={currentLesson.id} />
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Mark as Complete
                          </button>
                        </form>
                      </div>
                    )}

                    {currentProgress?.completed && (
                      <div className="mt-8 pt-6 border-t">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">You&apos;ve completed this lesson!</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Course Outline */}
              <div className="lg:col-span-1">
                <Card className="shadow-card sticky top-24">
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-gray-50">
                      <Link
                        href={`/courses/${slug}`}
                        className="font-bold text-text-dark hover:text-maxxed-blue transition-colors"
                      >
                        {course.title}
                      </Link>
                      <p className="text-sm text-text-muted mt-1">
                        {allLessons.filter((l) => progressMap.get(l.lesson.id)?.completed).length} of{' '}
                        {allLessons.length} complete
                      </p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {course.modules.map((module, moduleIndex) => {
                        // Find quiz for this module (quiz order matches module index)
                        const moduleQuiz = course.quizzes.find((q) => q.order === moduleIndex);
                        const quizAttemptsList = moduleQuiz ? quizAttemptsMap.get(moduleQuiz.id) || [] : [];
                        const hasPassed = quizAttemptsList.some((a) => a.passed);

                        // Check if all lessons in this module AND all prior modules are completed
                        const allPriorModulesCompleted = course.modules
                          .slice(0, moduleIndex)
                          .every((m) => m.lessons.every((l) => progressMap.get(l.id)?.completed));
                        const allModuleLessonsCompleted = module.lessons.every(
                          (l) => progressMap.get(l.id)?.completed
                        );
                        const quizUnlocked = allPriorModulesCompleted && allModuleLessonsCompleted;

                        return (
                          <div key={module.id}>
                            <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-text-muted border-b">
                              {module.title}
                            </div>
                            {module.lessons.map((lesson) => {
                              const lProgress = progressMap.get(lesson.id);
                              const isCurrent = lesson.id === currentLesson.id;
                              const isLocked = !isEnrolled && !lesson.isFree;

                              return (
                                <Link
                                  key={lesson.id}
                                  href={isLocked ? '#' : `/courses/${slug}/lessons/${lesson.slug}`}
                                  className={`flex items-center gap-3 px-4 py-3 border-b text-sm transition-colors ${
                                    isCurrent
                                      ? 'bg-maxxed-blue/10 border-l-4 border-l-maxxed-blue'
                                      : isLocked
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {lProgress?.completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  ) : isLocked ? (
                                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <Play className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span
                                    className={`truncate ${
                                      isCurrent ? 'font-medium text-maxxed-blue' : 'text-text-body'
                                    }`}
                                  >
                                    {lesson.title}
                                  </span>
                                </Link>
                              );
                            })}
                            {/* Module Quiz */}
                            {moduleQuiz && isEnrolled && (
                              quizUnlocked ? (
                                <Link
                                  href={`/courses/${slug}/quiz/${moduleQuiz.id}`}
                                  className="flex items-center gap-3 px-4 py-3 border-b text-sm transition-colors bg-purple-50 hover:bg-purple-100"
                                >
                                  {hasPassed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <FileQuestion className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  )}
                                  <span className="truncate font-medium text-purple-700">
                                    Quiz: {moduleQuiz.title}
                                  </span>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-3 px-4 py-3 border-b text-sm bg-gray-100 opacity-60 cursor-not-allowed">
                                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate font-medium text-gray-500">
                                    Quiz: {moduleQuiz.title}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                      {/* Final Exam at the bottom */}
                      {(() => {
                        const finalExam = course.quizzes.find((q) => q.order >= course.modules.length);
                        if (!finalExam || !isEnrolled) return null;
                        const finalAttempts = quizAttemptsMap.get(finalExam.id) || [];
                        const finalPassed = finalAttempts.some((a) => a.passed);
                        // Final exam requires ALL lessons completed
                        const allLessonsCompleted = allLessons.every(
                          (l) => progressMap.get(l.lesson.id)?.completed
                        );
                        return allLessonsCompleted ? (
                          <Link
                            href={`/courses/${slug}/quiz/${finalExam.id}`}
                            className="flex items-center gap-3 px-4 py-3 border-b text-sm transition-colors bg-amber-50 hover:bg-amber-100"
                          >
                            {finalPassed ? (
                              <Trophy className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            )}
                            <span className="truncate font-medium text-amber-700">
                              {finalExam.title}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 border-b text-sm bg-gray-100 opacity-60 cursor-not-allowed">
                            <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate font-medium text-gray-500">
                              {finalExam.title}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
