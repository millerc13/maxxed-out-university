import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { CourseForm } from '@/components/admin/CourseForm';
import { ModuleManager } from '@/components/admin/ModuleManager';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ArrowLeft, Settings, Layers, Link2, FileQuestion, Edit, Plus } from 'lucide-react';

interface CourseEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
      products: true,
      quizzes: {
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-600">
            /{course.slug} &bull;{' '}
            {course.published ? (
              <span className="text-green-600">Published</span>
            ) : (
              <span className="text-gray-500">Draft</span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <FileQuestion className="w-4 h-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            GHL Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <ModuleManager course={course} />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Course Quizzes</h3>
                <Link
                  href={`/admin/quizzes/new?courseId=${course.id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark"
                >
                  <Plus className="w-4 h-4" />
                  Add Quiz
                </Link>
              </div>
              {course.quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No quizzes for this course yet</p>
                  <Link
                    href={`/admin/quizzes/new?courseId=${course.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create Quiz
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {course.quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                          <span
                            className={`px-2 py-0.5 text-xs rounded font-medium ${
                              quiz.published
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {quiz.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {quiz._count.questions} questions &bull; {quiz._count.attempts} attempts &bull; {quiz.passingScore}% to pass
                          {quiz.timeLimit && ` • ${quiz.timeLimit} min`}
                        </p>
                      </div>
                      <Link
                        href={`/admin/quizzes/${quiz.id}`}
                        className="p-2 text-gray-500 hover:text-maxxed-blue hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <CourseForm course={course} />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                GoHighLevel Product Mappings
              </h3>
              {course.products.length === 0 ? (
                <p className="text-gray-500">
                  No GHL products linked to this course yet. Add product mappings
                  from the{' '}
                  <Link href="/admin/products" className="text-maxxed-blue hover:underline">
                    GHL Products
                  </Link>{' '}
                  page.
                </p>
              ) : (
                <div className="space-y-2">
                  {course.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {product.ghlProductName || product.ghlProductId}
                        </p>
                        <p className="text-sm text-gray-500">
                          ID: {product.ghlProductId}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          product.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
