import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId, published: true },
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

  return NextResponse.json(quiz);
}
