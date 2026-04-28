'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Layers, FileQuestion, Settings, Link2, Edit, Plus, Eye, RefreshCw, Handshake, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CourseForm } from '@/components/admin/CourseForm';
import { ModuleManager } from '@/components/admin/ModuleManager';
import Link from 'next/link';
import Image from 'next/image';

interface CourseEditorProps {
  course: any;
}

export function CourseEditor({ course }: CourseEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'settings' | 'preview' | 'content' | 'quizzes' | 'products'>('settings');
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload

  return (
    <div className="space-y-0">
      {/* ── Header + Tabs (matching funnel editor style) ── */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 px-4 sm:px-6 pt-5 pb-0 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
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
        <div className="flex gap-0 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          {([
            { key: 'settings' as const, label: 'Settings', icon: Settings },
            { key: 'preview' as const, label: 'Preview', icon: Eye },
            { key: 'content' as const, label: 'Content', icon: Layers },
            { key: 'quizzes' as const, label: 'Quizzes', icon: FileQuestion },
            { key: 'products' as const, label: 'GHL Products', icon: Link2 },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
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

      {/* ── TAB: Preview ── */}
      {/* For courses with an externalUrl, the on-platform slug page just
          redirects off-site, so iframing it would be useless. Instead, show
          the catalog card preview (the only on-platform UI students see for
          partner programs).
          For normal courses, iframe the real page in customer-preview mode. */}
      {activeTab === 'preview' && course.externalUrl && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            This course redirects to{' '}
            <a
              href={course.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-maxxed-blue hover:underline"
            >
              {course.externalUrl}
            </a>
            {' '}when clicked, so the only on-platform view is the catalog card below.
          </p>
          <div className="max-w-md">
            <ExternalCardPreview course={course} />
          </div>
        </div>
      )}

      {activeTab === 'preview' && !course.externalUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Live page at <span className="font-mono">/courses/{course.slug}</span>. Save changes on the Settings tab and click reload to refresh.
            </p>
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <iframe
              key={previewKey}
              src={`/courses/${course.slug}?previewAs=customer`}
              title={`Preview: ${course.title}`}
              className="w-full block"
              style={{ height: 'calc(100vh - 220px)' }}
            />
          </div>
        </div>
      )}

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

// Catalog card preview for external/partner courses. 1:1 copy of the
// FeaturedCard styling from src/app/(dashboard)/courses/page.tsx (the
// "Partnership Programs" tier) — same Tailwind classes, same Apply Only
// badge and Apply Now CTA — so the admin sees exactly what visitors see
// on the courses page.
function ExternalCardPreview({ course }: { course: any }) {
  return (
    <div className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="relative aspect-video overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0d1545] to-[#0a1a70] flex items-center justify-center">
            <Handshake className="w-10 h-10 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4">
          <span className="bg-[#0000CC] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
            <Handshake className="w-3.5 h-3.5" /> Apply Only
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
          {course.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2 mt-1.5 flex-1">
          {course.shortDesc || course.description?.split('\n')[0]}
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">Application required</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0000CC]/10 text-[#0000CC] text-xs font-bold rounded-lg">
            Apply Now <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
