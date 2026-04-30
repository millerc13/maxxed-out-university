import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { EnrollUserButton } from '@/components/admin/EnrollUserButton';
import { DeleteEnrollmentButton } from '@/components/admin/DeleteEnrollmentButton';

export default async function AdminEnrollmentsPage() {
  // Top-level enrollments only — bundle children are auto-created
  // when someone buys a bundle (one purchase → 30+ Enrollment rows),
  // so showing them here is noise. Keeping `bundleId: null` keeps
  // standalone courses + bundle parents, which is what an admin
  // actually thinks of as "what did this customer buy".
  const [enrollments, courses, users] = await Promise.all([
    prisma.enrollment.findMany({
      where: { course: { bundleId: null } },
      include: {
        user: { select: { id: true, email: true, name: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
    prisma.course.findMany({
      where: { published: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { email: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="text-gray-600 mt-1">
            Manage course enrollments for users
          </p>
        </div>
        <EnrollUserButton courses={courses} users={users} />
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <GraduationCap className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{enrollments.length}</p>
            <p className="text-sm text-gray-500">
              Total Enrollments{' '}
              <span className="text-xs text-gray-400">
                · top-level purchases only, bundle children excluded
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mobile card stack */}
      <div className="md:hidden space-y-3">
        {enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="mb-2">
              <p className="font-medium text-gray-900 truncate">
                {enrollment.user.name || enrollment.user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{enrollment.user.email}</p>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {enrollment.course.title}
            </p>
            <p className="text-xs text-gray-400">
              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </p>
            <div className="flex justify-end pt-3 border-t border-gray-100 mt-3">
              <DeleteEnrollmentButton
                enrollmentId={enrollment.id}
                userName={enrollment.user.name || enrollment.user.email}
                courseName={enrollment.course.title}
              />
            </div>
          </div>
        ))}
        {enrollments.length === 0 && (
          <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            No enrollments yet
          </div>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Course
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Enrolled
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {enrollment.user.name || enrollment.user.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {enrollment.user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{enrollment.course.title}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DeleteEnrollmentButton
                        enrollmentId={enrollment.id}
                        userName={enrollment.user.name || enrollment.user.email}
                        courseName={enrollment.course.title}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {enrollments.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No enrollments yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
