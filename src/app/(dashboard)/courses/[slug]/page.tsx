import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Play, Lock, CheckCircle, Clock, ChevronRight, FileQuestion, Trophy, Wrench, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { AdminEnrollButton } from '@/components/course/AdminEnrollButton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { isEffectivelyEnrolled } from '@/lib/enrollment';
import { getModuleAccess } from '@/lib/gating';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    previewAs?: string;
    // Admin-only field overrides used by /admin/courses/[id]'s Preview tab
    // to render unsaved draft edits without persisting them. Ignored when
    // the viewer isn't an authenticated admin.
    _title?: string;
    _description?: string;
    _shortDesc?: string;
    _thumbnail?: string;
    _price?: string;
    _comingSoon?: string;
  }>;
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const { previewAs } = search;
  const session = await auth();
  // `?previewAs=customer` lets the admin preview tab iframe this page
  // and see exactly what a non-admin, non-enrolled visitor sees — no
  // AdminEnrollButton, no auto-unlocked quizzes/lessons, no own progress.
  const isCustomerPreview =
    previewAs === 'customer' && (session?.user as any)?.role === 'ADMIN';

  // Get the course with all modules, lessons, and quizzes
  const courseRaw = await prisma.course.findUnique({
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

  if (!courseRaw) {
    notFound();
  }

  // Apply admin-only field overrides on top of the loaded course so the
  // Preview tab on /admin/courses/[id] can show unsaved drafts. Restricted
  // to isCustomerPreview (which already requires an admin session) so
  // there's no risk of regular visitors spoofing course content via URL.
  const course = isCustomerPreview
    ? {
        ...courseRaw,
        title: search._title ?? courseRaw.title,
        description: search._description ?? courseRaw.description,
        shortDesc: search._shortDesc ?? courseRaw.shortDesc,
        thumbnail: search._thumbnail ?? courseRaw.thumbnail,
        price:
          search._price !== undefined && search._price !== ''
            ? Number(search._price) || null
            : courseRaw.price,
        comingSoon:
          search._comingSoon !== undefined
            ? search._comingSoon === 'true'
            : courseRaw.comingSoon,
      }
    : courseRaw;

  // External partner programs don't have an on-platform detail view —
  // redirect straight to the partner's site (skipped in admin preview so
  // the admin can still see the *would-be* layout while editing fields).
  if (!isCustomerPreview && (course as any).externalUrl) {
    redirect((course as any).externalUrl);
  }

  // Check if user is enrolled (direct or via bundle)
  const isEnrolled =
    !isCustomerPreview && session?.user?.id
      ? await isEffectivelyEnrolled(session.user.id, course.id)
      : false;

  // Check if user is admin (forced false in customer preview)
  const isAdmin =
    !isCustomerPreview && (session?.user as any)?.role === 'ADMIN';

  // Get user's progress (skip in customer preview — visitor has none)
  const progress =
    !isCustomerPreview && session?.user?.id
      ? await prisma.lessonProgress.findMany({
          where: {
            userId: session.user.id,
            lesson: { module: { courseId: course.id } },
          },
        })
      : [];

  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

  // Get user's quiz attempts (skip in customer preview)
  const quizAttempts =
    !isCustomerPreview && session?.user?.id
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

  // Get tools for this course
  const courseTools = await prisma.tool.findMany({
    where: { courseId: course.id, published: true },
    orderBy: { order: 'asc' },
  });

  // Get this user's certificate for this course (if awarded)
  const userCertificate =
    !isCustomerPreview && session?.user?.id
      ? await prisma.certificate.findUnique({
          where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
          select: { certificateId: true },
        })
      : null;

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

  // High-ticket programs (DWY / Mentorship) are 1:1 coaching, not self-serve
  // course content. The on-platform course page shows a "team will reach out"
  // message in place of the modules list.
  const HIGH_TICKET_SLUGS = new Set(['done-with-you-real-estate-business', '6-month-mentorship']);
  const isHighTicketCoaching = HIGH_TICKET_SLUGS.has(course.slug);

  // Bundle gating — module is locked until prior-module quiz is passed.
  // No-op for non-bundle courses and for admins.
  const moduleAccess = getModuleAccess(course, quizAttempts, isAdmin);

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
        <div className="relative bg-gradient-to-r from-[#0d1545] via-[#0a1a70] to-[#0000CC] text-white overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(0,0,255,0.2) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative max-w-7xl mx-auto px-5 md:px-10 py-14">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-3">Maxxed Out University</p>
                <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">{course.title}</h1>
                <p className="text-lg text-blue-100 mb-6 leading-relaxed">
                  {course.description?.includes('#') ? (course as any).shortDesc : course.description}
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-5 text-sm mb-8">
                  {isHighTicketCoaching ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-maxxed-gold" />
                        <span>1:1 with Todd&apos;s team</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Blueprint library included</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-300" />
                        <span>{totalLessons} lessons</span>
                      </div>
                      {totalDuration > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-300" />
                          <span>{totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`} of content</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-maxxed-gold" />
                        <span>Certificate included</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Lifetime access</span>
                      </div>
                      {isEnrolled && (
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="font-semibold">{progressPercent}% complete</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* What's Inside — only shown to unenrolled users */}
                {!isEnrolled && course.modules.length > 0 && (
                  <div>
                    <p className="text-blue-200/80 text-xs font-bold uppercase tracking-widest mb-3">What&apos;s Inside</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {course.modules.slice(0, 8).map((module) => (
                        <div key={module.id} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-maxxed-gold mt-0.5 flex-shrink-0" />
                          <span className="text-blue-100 leading-snug">{module.title}</span>
                        </div>
                      ))}
                      {course.modules.length > 8 && (
                        <div className="flex items-start gap-2 text-sm col-span-full">
                          <ChevronRight className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-300">+{course.modules.length - 8} more modules</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Course Card */}
              <div className="lg:col-span-1">
                <Card className="shadow-xl overflow-hidden">
                  <div className="relative aspect-video bg-[#0a1628]">
                    {course.thumbnail ? (
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        quality={85}
                        className="object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex flex-col items-center justify-center p-6 text-center">
                        <BookOpen className="w-10 h-10 text-white/25 mb-3" />
                        <p className="text-white text-sm font-bold leading-snug line-clamp-4">{course.title}</p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    {isEnrolled && isHighTicketCoaching ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-bold text-text-dark">You&apos;re enrolled</span>
                        </div>
                        <p className="text-sm text-text-muted mb-4 leading-relaxed">
                          Todd&apos;s team will contact you to schedule your onboarding call.
                          Browse the Blueprint library while you wait.
                        </p>
                        <Link
                          href="/courses/real-estate-empire-blueprint"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-maxxed-blue text-white font-bold text-sm uppercase tracking-wider rounded hover:bg-maxxed-blue-dark transition-colors"
                        >
                          <BookOpen className="w-5 h-5" />
                          Open Blueprint
                        </Link>
                      </div>
                    ) : isEnrolled ? (
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
                      <div className="space-y-4">
                        {/* CTA */}
                        {course.price && course.price > 0 ? (
                          <Link
                            href={`/checkout?courseId=${course.id}`}
                            className="flex items-center justify-center w-full py-4 bg-[#0000CC] text-white font-extrabold text-sm uppercase tracking-widest rounded-lg hover:bg-[#0000aa] transition-colors shadow-md"
                          >
                            Get Access Now
                          </Link>
                        ) : (
                          <button className="w-full py-4 bg-[#0000CC] text-white font-extrabold text-sm uppercase tracking-widest rounded-lg hover:bg-[#0000aa] transition-colors shadow-md cursor-default opacity-70">
                            Contact to Enroll
                          </button>
                        )}

                        {isAdmin && (
                          <AdminEnrollButton courseId={course.id} courseName={course.title} />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Course Description (for markdown-formatted descriptions) */}
        {course.description && course.description.includes('#') && (
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 border-b">
            <Card className="shadow-card">
              <CardContent className="p-6 md:p-8">
                <MarkdownContent content={course.description} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* High-ticket programs (DWY / Mentorship): no on-platform content —
            buyer's experience is 1:1 calls with Todd's team. Show a clear
            "we'll reach out" message in place of the modules list. */}
        {isHighTicketCoaching && (
          <div className="max-w-3xl mx-auto px-5 md:px-10 py-12">
            <Card className="shadow-card overflow-hidden border-2 border-maxxed-blue/20">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-maxxed-blue/10 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-maxxed-blue" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-text-dark mb-3">
                  Todd and his team will be in contact soon
                </h2>
                <p className="text-text-body text-lg leading-relaxed mb-6 max-w-xl mx-auto">
                  This program is delivered 1:1 over the phone — there&apos;s no on-platform course content.
                  A member of Todd&apos;s team will reach out within one business day to schedule your
                  onboarding call and walk you through your custom plan.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 max-w-xl mx-auto mb-8 text-left">
                  <p className="text-xs font-bold uppercase tracking-widest text-yellow-700 mb-1">
                    While you wait
                  </p>
                  <p className="text-sm text-text-body leading-relaxed">
                    Your purchase includes full access to the <strong>Real Estate Empire Blueprint</strong> course
                    library — all of the Wholesaling, Fix &amp; Flip, BRRRR, Property Management, Deal Analysis,
                    and Scaling courses. Browse them anytime from your dashboard.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/courses/real-estate-empire-blueprint"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-maxxed-blue text-white font-bold text-sm rounded-lg hover:bg-maxxed-blue-dark transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Open Blueprint Library
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-200 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Course Content — standard self-serve course curriculum */}
        {!isHighTicketCoaching && (
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
              // Admin can access all quizzes regardless of progress
              const quizUnlocked = isAdmin || (isEnrolled && allPriorModulesCompleted && allModuleLessonsCompleted);

              // Bundle gating: module is locked until prior module's quiz is passed
              const moduleLocked = !moduleAccess(moduleIndex);

              return (
                <div key={module.id} className="space-y-4">
                  <Card className={`shadow-card overflow-hidden ${moduleLocked ? 'opacity-80' : ''}`}>
                    <div className={`px-5 py-4 border-b ${moduleLocked ? 'bg-gray-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-text-dark flex items-center gap-2">
                          {moduleLocked && <Lock className="w-4 h-4 text-gray-500" />}
                          Module {moduleIndex + 1}: {module.title}
                        </h3>
                        <span className="text-sm text-text-muted flex-shrink-0">
                          {module.lessons.length} lessons
                        </span>
                      </div>
                      {moduleLocked && (
                        <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1.5">
                          <Lock className="w-3 h-3" />
                          Pass the Module {moduleIndex} quiz to unlock
                        </p>
                      )}
                      {module.description && !moduleLocked && (
                        <p className="text-sm text-text-muted mt-1">{module.description}</p>
                      )}
                    </div>
                    <div className="divide-y">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const lessonProgress = progressMap.get(lesson.id);
                        const isCompleted = lessonProgress?.completed;
                        const isAccessible = (isAdmin || isEnrolled || lesson.isFree) && !moduleLocked;
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
                              {durationMin > 0 && (
                                <span className="text-sm text-text-muted">{durationMin} min</span>
                              )}
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

            // Final exam requires ALL lessons completed (admin can bypass)
            const allLessonsCompleted = course.modules.every((m) =>
              m.lessons.every((l) => progressMap.get(l.id)?.completed)
            );
            const finalExamUnlocked = isAdmin || (isEnrolled && allLessonsCompleted);

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
                            href={
                              hasPassed && userCertificate
                                ? `/certificates/${userCertificate.certificateId}`
                                : `/courses/${course.slug}/quiz/${finalExam.id}`
                            }
                            target={hasPassed && userCertificate ? '_blank' : undefined}
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

          {/* Course Tools */}
          {courseTools.length > 0 && (isEnrolled || isAdmin) && (
            <div className="max-w-7xl mx-auto px-5 md:px-10 pb-10">
              <h2 className="text-2xl font-bold text-text-dark mb-6 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#0000CC]" />
                Course Tools
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseTools.map((tool) => (
                  <Card key={tool.id} className="shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0000CC]/10 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-5 h-5 text-[#0000CC]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-dark">{tool.title}</h3>
                          {tool.description && (
                            <p className="text-sm text-text-muted line-clamp-2 mt-0.5">{tool.description}</p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/tools/${tool.slug}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0000CC] text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#0000aa] transition-colors"
                      >
                        Open Tool <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </main>
      <Footer />
    </>
  );
}
