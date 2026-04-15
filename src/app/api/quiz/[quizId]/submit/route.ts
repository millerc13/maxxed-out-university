import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateCertificateId } from '@/lib/certificate';
import { sendCertificateEmail, sendModuleQuizPassedEmail } from '@/lib/resend';

export const runtime = 'nodejs';

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

  // Check if this user has ALREADY passed this quiz before this attempt —
  // used below to avoid spamming the "you passed!" email on retakes.
  const hadPriorPass = passed
    ? (await prisma.quizAttempt.count({
        where: { userId: session.user.id, quizId, passed: true },
      })) > 0
    : false;

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

  // Award a certificate if this is the FINAL EXAM and the user passed.
  // Final exam = the quiz's order is >= the course's module count.
  let certificateAwarded: boolean | undefined;
  let certificateId: string | undefined;

  if (passed && quiz.courseId) {
    try {
      const courseWithModules = await prisma.course.findUnique({
        where: { id: quiz.courseId },
        select: {
          title: true,
          slug: true,
          thumbnail: true,
          modules: {
            orderBy: { order: 'asc' },
            select: {
              title: true,
              lessons: { orderBy: { order: 'asc' }, select: { slug: true }, take: 1 },
            },
          },
        },
      });
      const totalModules = courseWithModules?.modules.length ?? 0;
      const isFinalExam = !!courseWithModules && quiz.order >= totalModules;

      // Module quiz: send an encouragement email (only on first-time pass).
      if (!isFinalExam && !hadPriorPass && courseWithModules) {
        const moduleIndex = quiz.order;
        const thisModule = courseWithModules.modules[moduleIndex];
        const nextModule = courseWithModules.modules[moduleIndex + 1];
        const nextFirstLesson = nextModule?.lessons[0]?.slug;
        const nextLessonUrl = nextFirstLesson
          ? `${process.env.NEXTAUTH_URL || 'https://university.maxxedout.com'}/courses/${courseWithModules.slug}/lessons/${nextFirstLesson}`
          : null;

        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true, name: true },
        });
        if (user?.email && thisModule) {
          try {
            await sendModuleQuizPassedEmail({
              to: user.email,
              name: user.name || '',
              courseName: courseWithModules.title,
              moduleName: thisModule.title,
              moduleNumber: moduleIndex + 1,
              totalModules,
              score,
              nextLessonUrl,
            });
          } catch (emailErr) {
            console.error('[quiz-submit] Module-passed email failed', { error: emailErr instanceof Error ? emailErr.message : emailErr });
          }
        }
      }

      if (isFinalExam && courseWithModules) {
        // Look up existing first so we only send email on first-time issuance.
        const existing = await prisma.certificate.findUnique({
          where: { userId_courseId: { userId: session.user.id, courseId: quiz.courseId } },
        });

        if (existing) {
          certificateAwarded = true;
          certificateId = existing.certificateId;
          console.log('[quiz-submit] Certificate already issued', { userId: session.user.id, courseId: quiz.courseId, certificateId });
        } else {
          const newId = generateCertificateId();
          const cert = await prisma.certificate.create({
            data: {
              userId: session.user.id,
              courseId: quiz.courseId,
              certificateId: newId,
              certificateUrl: `/certificates/${newId}`,
            },
          });
          certificateAwarded = true;
          certificateId = cert.certificateId;
          console.log('[quiz-submit] Certificate awarded', { userId: session.user.id, courseId: quiz.courseId, certificateId });

          // Send email — don't fail the quiz submit if email fails.
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true, name: true },
          });
          if (user?.email) {
            try {
              await sendCertificateEmail({
                to: user.email,
                name: user.name || '',
                courseName: courseWithModules.title,
                certificateId: cert.certificateId,
                courseThumbnail: courseWithModules.thumbnail,
              });
            } catch (emailErr) {
              console.error('[quiz-submit] Certificate email failed', { error: emailErr instanceof Error ? emailErr.message : emailErr });
            }
          }
        }
      }
    } catch (err) {
      console.error('[quiz-submit] Certificate award failed', { error: err instanceof Error ? err.message : err });
      // Swallow — the quiz attempt itself was already saved above.
    }
  }

  return NextResponse.json({
    score,
    passed,
    correctAnswers,
    correctCount,
    totalQuestions: quiz.questions.length,
    certificateAwarded,
    certificateId,
  });
}
