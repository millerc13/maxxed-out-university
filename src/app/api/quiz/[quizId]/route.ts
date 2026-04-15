import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';

// GET - Fetch quiz with questions (answers without isCorrect)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await params;
  const userIsAdmin = isAdmin(session);

  // Admin can view unpublished quizzes too
  const quiz = await prisma.quiz.findUnique({
    where: userIsAdmin ? { id: quizId } : { id: quizId, published: true },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answers: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              text: true,
              order: true,
              // Don't include isCorrect - that's secret!
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Admin bypasses all access checks
  if (userIsAdmin) {
    return NextResponse.json(quiz);
  }

  // Check if user is enrolled in the course (if quiz is attached to one)
  if (quiz.courseId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId: quiz.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in course' }, { status: 403 });
    }

    // Check if user has completed prerequisite lessons
    // Quiz order corresponds to module index (0-9 = module quizzes, 10+ = final exam)
    const course = await prisma.course.findUnique({
      where: { id: quiz.courseId },
      include: {
        modules: {
          include: {
            lessons: { select: { id: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (course) {
      // Get all lesson IDs that must be completed before this quiz
      let requiredLessonIds: string[] = [];

      if (quiz.order >= course.modules.length) {
        // Final exam - requires ALL lessons completed
        requiredLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      } else {
        // Module quiz - requires all lessons up to and including this module
        for (let i = 0; i <= quiz.order; i++) {
          if (course.modules[i]) {
            requiredLessonIds.push(...course.modules[i].lessons.map((l) => l.id));
          }
        }
      }

      // Check if user has completed all required lessons
      const completedProgress = await prisma.lessonProgress.findMany({
        where: {
          userId: session.user.id,
          lessonId: { in: requiredLessonIds },
          completed: true,
        },
      });

      if (completedProgress.length < requiredLessonIds.length) {
        const remainingLessons = requiredLessonIds.length - completedProgress.length;
        return NextResponse.json(
          {
            error: 'Prerequisites not met',
            message: `Complete ${remainingLessons} more lesson${remainingLessons !== 1 ? 's' : ''} to unlock this quiz`,
          },
          { status: 403 }
        );
      }
    }
  }

  // Include the "next lesson" (first lesson of the module AFTER this quiz's module)
  // so the results screen can show a "Continue to next lesson" CTA after passing.
  let nextLesson: { slug: string; title: string; moduleTitle: string } | null = null;
  if (quiz.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: quiz.courseId },
      select: {
        modules: {
          orderBy: { order: 'asc' },
          select: {
            title: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: { slug: true, title: true },
            },
          },
        },
      },
    });
    if (course) {
      const nextModuleIndex = quiz.order + 1;
      const nextModule = course.modules[nextModuleIndex];
      if (nextModule && nextModule.lessons[0]) {
        nextLesson = {
          slug: nextModule.lessons[0].slug,
          title: nextModule.lessons[0].title,
          moduleTitle: nextModule.title,
        };
      }
    }
  }

  return NextResponse.json({ ...quiz, nextLesson });
}
