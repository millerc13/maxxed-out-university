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

// DELETE - Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questionId } = await params;

  try {
    await prisma.question.delete({ where: { id: questionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}

// PUT - Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questionId } = await params;

  try {
    const body = await request.json();
    const { text, type, explanation, points, answers } = body;

    // Update question
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(text && { text }),
        ...(type && { type }),
        ...(explanation !== undefined && { explanation }),
        ...(points !== undefined && { points }),
      },
    });

    // If answers provided, delete and recreate
    if (answers) {
      await prisma.answer.deleteMany({ where: { questionId } });
      await prisma.answer.createMany({
        data: answers.map((a: any, index: number) => ({
          questionId,
          text: a.text,
          isCorrect: a.isCorrect || false,
          order: index,
        })),
      });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Update question error:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}
