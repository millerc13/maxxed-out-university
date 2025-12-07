import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { DeleteCourseButton } from '@/components/admin/DeleteCourseButton';

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { order: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">
            Manage your courses, modules, and lessons
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Course
        </Link>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No courses yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first course to get started
            </p>
            <Link
              href="/admin/courses/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const totalLessons = course.modules.reduce(
              (acc, m) => acc + m.lessons.length,
              0
            );

            return (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Drag Handle */}
                    <div className="flex items-center px-3 bg-gray-50 border-r cursor-move">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-32 h-24 flex-shrink-0 bg-gray-100 relative hidden sm:block">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">
                              {course.title}
                            </h3>
                            {course.featured && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded font-medium">
                                Featured
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-xs rounded font-medium ${
                                course.published
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {course.published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {course.shortDesc || course.description || 'No description'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="p-2 text-gray-500 hover:text-maxxed-blue hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/courses/${course.slug}`}
                            target="_blank"
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                        <span>{course.modules.length} modules</span>
                        <span>{totalLessons} lessons</span>
                        <span>{course._count.enrollments} enrollments</span>
                        <span className="text-gray-400">
                          /{course.slug}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
