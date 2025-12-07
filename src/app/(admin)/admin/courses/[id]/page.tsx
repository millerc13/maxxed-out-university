import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { CourseForm } from '@/components/admin/CourseForm';
import { ModuleManager } from '@/components/admin/ModuleManager';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ArrowLeft, Settings, Layers, Link2 } from 'lucide-react';

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
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Content
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
