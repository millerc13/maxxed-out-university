import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Play, Lock, CheckCircle, Clock, ChevronRight, FileQuestion, Trophy } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
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
        include: {
          _count: { select: { questions: true } },
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

  // Get user's quiz attempts
  const quizAttempts = session?.user?.id
    ? await prisma.quizAttempt.findMany({
        where: {
          userId: session.user.id,
          quizId: { in: course.quizzes.map((q) => q.id) },
        },
        orderBy: { startedAt: 'desc' },
      })
    : [];

  const quizAttemptsMap = new Map<string, typeof quizAttempts>();
  for (const attempt of quizAttempts) {
    const existing = quizAttemptsMap.get(attempt.quizId) || [];
    existing.push(attempt);
    quizAttemptsMap.set(attempt.quizId, existing);
  }

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
            {course.modules.map((module, moduleIndex) => {
              // Find quiz for this module (quiz order matches module index)
              const moduleQuiz = course.quizzes.find((q) => q.order === moduleIndex);
              const quizAttempts_module = moduleQuiz ? quizAttemptsMap.get(moduleQuiz.id) || [] : [];
              const bestAttempt_module = quizAttempts_module.find((a) => a.passed) || quizAttempts_module[0];
              const hasPassed_module = quizAttempts_module.some((a) => a.passed);

              // Check if all lessons in this module AND all prior modules are completed
              const allPriorModulesCompleted = course.modules
                .slice(0, moduleIndex)
                .every((m) => m.lessons.every((l) => progressMap.get(l.id)?.completed));
              const allModuleLessonsCompleted = module.lessons.every(
                (l) => progressMap.get(l.id)?.completed
              );
              const quizUnlocked = isEnrolled && allPriorModulesCompleted && allModuleLessonsCompleted;

              return (
                <div key={module.id} className="space-y-4">
                  <Card className="shadow-card overflow-hidden">
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

                      {/* Module Quiz Row */}
                      {moduleQuiz && (
                        <div className={`px-5 py-4 flex items-center gap-4 ${
                          quizUnlocked
                            ? 'bg-purple-50/50 hover:bg-purple-50'
                            : 'bg-gray-50 opacity-60'
                        }`}>
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              hasPassed_module ? 'bg-green-100' : quizUnlocked ? 'bg-purple-100' : 'bg-gray-200'
                            }`}>
                              {hasPassed_module ? (
                                <Trophy className="w-4 h-4 text-green-600" />
                              ) : quizUnlocked ? (
                                <FileQuestion className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${quizUnlocked ? 'text-purple-600' : 'text-gray-500'}`}>Quiz</span>
                              {quizUnlocked ? (
                                <Link
                                  href={`/courses/${course.slug}/quiz/${moduleQuiz.id}`}
                                  className="font-medium text-text-dark hover:text-purple-700 truncate"
                                >
                                  Module {moduleIndex + 1} Quiz
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-500 truncate">
                                  Module {moduleIndex + 1} Quiz
                                </span>
                              )}
                              {hasPassed_module && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                  Passed
                                </span>
                              )}
                              {!quizUnlocked && !hasPassed_module && (
                                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                                  Complete lessons first
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-muted mt-0.5">
                              {moduleQuiz._count.questions} questions • {moduleQuiz.passingScore}% to pass
                              {bestAttempt_module && !hasPassed_module && (
                                <span className="text-orange-600 ml-2">Last: {bestAttempt_module.score}%</span>
                              )}
                              {bestAttempt_module && hasPassed_module && (
                                <span className="text-green-600 ml-2">Score: {bestAttempt_module.score}%</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {quizUnlocked && (
                              <Link
                                href={`/courses/${course.slug}/quiz/${moduleQuiz.id}`}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Final Exam Section */}
          {(() => {
            const finalExam = course.quizzes.find((q) => q.order >= course.modules.length);
            if (!finalExam) return null;

            const attempts = quizAttemptsMap.get(finalExam.id) || [];
            const bestAttempt = attempts.find((a) => a.passed) || attempts[0];
            const hasPassed = attempts.some((a) => a.passed);

            // Final exam requires ALL lessons completed
            const allLessonsCompleted = course.modules.every((m) =>
              m.lessons.every((l) => progressMap.get(l.id)?.completed)
            );
            const finalExamUnlocked = isEnrolled && allLessonsCompleted;

            return (
              <div className="mt-8">
                <Card className={`shadow-card overflow-hidden border-2 ${
                  finalExamUnlocked ? 'border-maxxed-gold' : 'border-gray-200'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                          hasPassed ? 'bg-green-100' : finalExamUnlocked ? 'bg-maxxed-gold/20' : 'bg-gray-100'
                        }`}>
                          {hasPassed ? (
                            <Trophy className="w-7 h-7 text-green-600" />
                          ) : finalExamUnlocked ? (
                            <Trophy className="w-7 h-7 text-maxxed-gold" />
                          ) : (
                            <Lock className="w-7 h-7 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className={`font-bold text-lg ${finalExamUnlocked ? 'text-text-dark' : 'text-gray-500'}`}>
                            {finalExam.title}
                          </h3>
                          {finalExam.description && (
                            <p className="text-sm text-text-muted mt-0.5">{finalExam.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                            <span>{finalExam._count.questions} questions</span>
                            <span>{finalExam.passingScore}% to pass</span>
                            {finalExam.timeLimit && <span>{finalExam.timeLimit} min limit</span>}
                          </div>
                          {!finalExamUnlocked && !hasPassed && (
                            <div className="mt-2 text-sm text-gray-500">
                              Complete all {totalLessons} lessons to unlock the final exam
                            </div>
                          )}
                          {bestAttempt && (
                            <div className={`mt-2 text-sm font-medium ${
                              bestAttempt.passed ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {bestAttempt.passed ? (
                                <>Best Score: {bestAttempt.score}% - Certified!</>
                              ) : (
                                <>Last Score: {bestAttempt.score}% - {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {finalExamUnlocked ? (
                          <Link
                            href={`/courses/${course.slug}/quiz/${finalExam.id}`}
                            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold transition-colors ${
                              hasPassed
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-maxxed-gold text-white hover:bg-yellow-600'
                            }`}
                          >
                            {hasPassed ? 'View Certificate' : attempts.length > 0 ? 'Retake Exam' : 'Take Final Exam'}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-500 rounded-lg">
                            <Lock className="w-4 h-4" />
                            {isEnrolled ? 'Complete Lessons' : 'Locked'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </div>
      </main>
      <Footer />
    </>
  );
}
