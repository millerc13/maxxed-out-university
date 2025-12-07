import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { QuizQuestionBuilder } from '@/components/admin/QuizQuestionBuilder';

interface QuizEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizEditPage({ params }: QuizEditPageProps) {
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: { answers: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!quiz) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/quizzes"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-gray-600">
              {quiz.questions.length} questions &bull;{' '}
              {quiz.published ? (
                <span className="text-green-600">Published</span>
              ) : (
                <span className="text-gray-500">Draft</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quiz Settings Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span>
              <strong>Passing Score:</strong> {quiz.passingScore}%
            </span>
            <span>
              <strong>Time Limit:</strong> {quiz.timeLimit ? `${quiz.timeLimit} min` : 'None'}
            </span>
          </div>
          <Link
            href={`/admin/quizzes/${quiz.id}/settings`}
            className="flex items-center gap-1 text-sm text-maxxed-blue hover:underline"
          >
            <Settings className="w-4 h-4" />
            Edit Settings
          </Link>
        </CardContent>
      </Card>

      {/* Question Builder */}
      <QuizQuestionBuilder quiz={quiz} />
    </div>
  );
}
