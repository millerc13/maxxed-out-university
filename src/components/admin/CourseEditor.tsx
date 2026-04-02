'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Layers, FileQuestion, Settings, Link2, Edit, Plus, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CourseForm } from '@/components/admin/CourseForm';
import { ModuleManager } from '@/components/admin/ModuleManager';
import Link from 'next/link';

interface CourseEditorProps {
  course: any;
}

export function CourseEditor({ course }: CourseEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'content' | 'quizzes' | 'settings' | 'products'>('content');

  return (
    <div className="space-y-0">
      {/* ── Header + Tabs (matching funnel editor style) ── */}
      <div className="-mx-6 -mt-6 mb-6 px-6 pt-5 pb-0 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/courses')}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                /{course.slug} &bull;{' '}
                {course.published ? (
                  <span className="text-green-600">Published</span>
                ) : (
                  <span className="text-gray-500">Draft</span>
                )}
                {course.comingSoon && (
                  <span className="text-purple-600 ml-2">• Coming Soon</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/courses/${course.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
            >
              <Eye className="w-4 h-4" /> View Course
            </Link>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${course.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {course.published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {([
            { key: 'content' as const, label: 'Content', icon: Layers },
            { key: 'quizzes' as const, label: 'Quizzes', icon: FileQuestion },
            { key: 'settings' as const, label: 'Settings', icon: Settings },
            { key: 'products' as const, label: 'GHL Products', icon: Link2 },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-maxxed-blue'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-maxxed-blue rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Content ── */}
      {activeTab === 'content' && (
        <ModuleManager course={course} />
      )}

      {/* ── TAB: Quizzes ── */}
      {activeTab === 'quizzes' && (
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
                {course.quizzes.map((quiz: any) => (
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
      )}

      {/* ── TAB: Settings ── */}
      {activeTab === 'settings' && (
        <CourseForm course={course} />
      )}

      {/* ── TAB: GHL Products ── */}
      {activeTab === 'products' && (
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
                {course.products.map((product: any) => (
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
      )}
    </div>
  );
}
