import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as any).role;
  if (role !== 'ADMIN') return null;
  return session;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { csv } = body;

    if (!csv) {
      return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and at least one data row' }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const data = rows.slice(1);

    const stats = { quizzes: 0, questions: 0 };
    const quizCache: Record<string, string> = {};

    for (const row of data) {
      const item: Record<string, string> = {};
      headers.forEach((h, i) => {
        item[h] = row[i] || '';
      });

      const quizTitle = item.quiz_title;
      const questionText = item.question_text;

      if (!quizTitle || !questionText) continue;

      // Get or create quiz
      let quizId = quizCache[quizTitle];
      if (!quizId) {
        let quiz = await prisma.quiz.findFirst({ where: { title: quizTitle } });
        if (!quiz) {
          quiz = await prisma.quiz.create({
            data: {
              title: quizTitle,
              description: item.quiz_description || null,
              passingScore: item.passing_score ? parseInt(item.passing_score) : 70,
              published: false,
            },
          });
          stats.quizzes++;
        }
        quizId = quiz.id;
        quizCache[quizTitle] = quizId;
      }

      // Create question
      const questionType = ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(
        item.question_type?.toUpperCase()
      )
        ? (item.question_type.toUpperCase() as 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE')
        : 'MULTIPLE_CHOICE';

      const lastQuestion = await prisma.question.findFirst({
        where: { quizId },
        orderBy: { order: 'desc' },
      });

      // Build answers
      const answers: { text: string; isCorrect: boolean; order: number }[] = [];

      if (questionType === 'TRUE_FALSE') {
        const correctIsTrueText = item.correct_answer?.toLowerCase();
        answers.push(
          { text: 'True', isCorrect: correctIsTrueText === 'true', order: 0 },
          { text: 'False', isCorrect: correctIsTrueText === 'false', order: 1 }
        );
      } else {
        // Add correct answer first
        if (item.correct_answer) {
          answers.push({ text: item.correct_answer, isCorrect: true, order: 0 });
        }
        // Add wrong answers
        if (item.wrong_answer_1) {
          answers.push({ text: item.wrong_answer_1, isCorrect: false, order: 1 });
        }
        if (item.wrong_answer_2) {
          answers.push({ text: item.wrong_answer_2, isCorrect: false, order: 2 });
        }
        if (item.wrong_answer_3) {
          answers.push({ text: item.wrong_answer_3, isCorrect: false, order: 3 });
        }
      }

      await prisma.question.create({
        data: {
          quizId,
          text: questionText,
          type: questionType,
          explanation: item.explanation || null,
          order: (lastQuestion?.order ?? -1) + 1,
          answers: {
            create: answers,
          },
        },
      });
      stats.questions++;
    }

    return NextResponse.json({
      success: true,
      message: `Created ${stats.quizzes} quizzes, ${stats.questions} questions`,
      stats,
    });
  } catch (error) {
    console.error('Import quizzes error:', error);
    return NextResponse.json(
      { error: 'Failed to import', details: String(error) },
      { status: 500 }
    );
  }
}
