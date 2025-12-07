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

// GET - List all quizzes
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quizzes = await prisma.quiz.findMany({
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(quizzes);
}

// POST - Create a new quiz
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, passingScore, timeLimit, published, moduleId, courseId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        passingScore: passingScore || 70,
        timeLimit: timeLimit || null,
        published: published || false,
        moduleId,
        courseId,
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error('Create quiz error:', error);
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
}
