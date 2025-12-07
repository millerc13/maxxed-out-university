import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as any).role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') return null;
  return session;
}

// POST - Create a new question with answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: quizId } = await params;

  try {
    const body = await request.json();
    const { text, type, explanation, points, answers } = body;

    if (!text) {
      return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    if (!answers || answers.length < 2) {
      return NextResponse.json({ error: 'At least 2 answers required' }, { status: 400 });
    }

    // Get the highest order number
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
    });

    const question = await prisma.question.create({
      data: {
        quizId,
        text,
        type: type || 'MULTIPLE_CHOICE',
        explanation,
        points: points || 1,
        order: (lastQuestion?.order ?? -1) + 1,
        answers: {
          create: answers.map((a: any, index: number) => ({
            text: a.text,
            isCorrect: a.isCorrect || false,
            order: index,
          })),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
