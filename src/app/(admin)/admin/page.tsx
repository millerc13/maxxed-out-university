import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  UserPlus,
  PlayCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  // Fetch stats
  const [
    totalUsers,
    totalCourses,
    totalEnrollments,
    totalLessons,
    completedLessons,
    recentUsers,
    recentEnrollments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.lesson.count(),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true, role: true },
    }),
    prisma.enrollment.findMany({
      take: 5,
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  // Calculate engagement rate
  const totalPossibleCompletions = totalEnrollments * (totalLessons / (await prisma.course.count() || 1));
  const engagementRate = totalPossibleCompletions > 0
    ? Math.round((completedLessons / totalPossibleCompletions) * 100)
    : 0;

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/users',
    },
    {
      label: 'Courses',
      value: totalCourses,
      icon: BookOpen,
      color: 'bg-purple-500',
      href: '/admin/courses',
    },
    {
      label: 'Enrollments',
      value: totalEnrollments,
      icon: GraduationCap,
      color: 'bg-green-500',
      href: '/admin/enrollments',
    },
    {
      label: 'Completion Rate',
      value: `${engagementRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      href: '/admin/analytics',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your learning platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Recent Users</h2>
              <Link
                href="/admin/users"
                className="text-sm text-maxxed-blue hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="divide-y">
              {recentUsers.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No users yet
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name || user.email}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-red-100 text-red-700'
                            : user.role === 'INSTRUCTOR'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Recent Enrollments</h2>
              <Link
                href="/admin/enrollments"
                className="text-sm text-maxxed-blue hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="divide-y">
              {recentEnrollments.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No enrollments yet
                </div>
              ) : (
                recentEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {enrollment.user.name || enrollment.user.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {enrollment.course.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                        {enrollment.source || 'manual'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/admin/courses/new"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
            >
              <BookOpen className="w-8 h-8 text-maxxed-blue" />
              <span className="text-sm font-medium text-gray-700">
                New Course
              </span>
            </Link>
            <Link
              href="/admin/users"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
            >
              <UserPlus className="w-8 h-8 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Manage Users
              </span>
            </Link>
            <Link
              href="/admin/products"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
            >
              <PlayCircle className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                GHL Products
              </span>
            </Link>
            <Link
              href="/admin/webhooks"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
            >
              <Clock className="w-8 h-8 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">
                Webhook Logs
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
