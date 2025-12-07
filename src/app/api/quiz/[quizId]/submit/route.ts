import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Submit quiz answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await params;
  const body = await request.json();
  const { answers } = body as { answers: Record<string, string[]> };

  // Get quiz with correct answers
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId, published: true },
    include: {
      questions: {
        include: {
          answers: true,
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Check enrollment if quiz is attached to a course
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
  }

  // Calculate score
  let correctCount = 0;
  const correctAnswers: Record<string, string[]> = {};

  for (const question of quiz.questions) {
    const correctIds = question.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id)
      .sort();

    correctAnswers[question.id] = correctIds;

    const userAnswerIds = (answers[question.id] || []).sort();

    // Check if arrays are equal
    if (
      correctIds.length === userAnswerIds.length &&
      correctIds.every((id, idx) => id === userAnswerIds[idx])
    ) {
      correctCount++;
    }
  }

  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  // Save attempt
  await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: session.user.id,
      score,
      passed,
      answers: answers as any,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    score,
    passed,
    correctAnswers,
    correctCount,
    totalQuestions: quiz.questions.length,
  });
}
