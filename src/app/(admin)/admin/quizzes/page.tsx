import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Eye, FileQuestion, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function AdminQuizzesPage() {
  const quizzes = await prisma.quiz.findMany({
    include: {
      course: {
        select: { id: true, title: true, slug: true },
      },
      _count: {
        select: { questions: true, attempts: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-600 mt-1">
            Create and manage quizzes for your courses
          </p>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Quiz
        </Link>
      </div>

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No quizzes yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first quiz to test student knowledge
            </p>
            <Link
              href="/admin/quizzes/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Quiz
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    quiz.published ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <FileQuestion className={`w-5 h-5 ${quiz.published ? 'text-purple-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-gray-900">{quiz.title}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                          quiz.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {quiz.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    {quiz.course && (
                      <Link href={`/admin/courses/${quiz.course.id}`} className="text-sm text-maxxed-blue hover:underline mt-0.5 inline-block">
                        {quiz.course.title}
                      </Link>
                    )}
                    {quiz.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {quiz.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {quiz._count.questions} questions
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {quiz._count.attempts} attempts
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                        Pass: {quiz.passingScore}%
                      </span>
                      {quiz.timeLimit && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full font-medium">
                          {quiz.timeLimit} min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/quizzes/${quiz.id}`}
                      className="p-2 text-gray-500 hover:text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
