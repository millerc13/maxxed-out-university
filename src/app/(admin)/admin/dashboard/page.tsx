import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  UserPlus,
  Clock,
  DollarSign,
  Wallet,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { listFanbasisTransactions } from '@/lib/fanbasis-spend';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  // Fetch stats. `totalEnrollments` excludes bundle-child rows: when a
  // student buys a bundle we auto-create an Enrollment for every child
  // course, which inflates the raw count by 30-40x. Counting only
  // top-level courses (`bundleId: null`) gives us "real purchases".
  const [
    totalUsers,
    totalEnrollments,
    completedLessons,
    lessonsStarted,
    recentUsers,
    recentEnrollments,
    paidEnrollments,
    fanbasisTxs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.enrollment.count({ where: { course: { bundleId: null } } }),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.lessonProgress.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true, role: true },
    }),
    prisma.enrollment.findMany({
      take: 5,
      where: { course: { bundleId: null } },
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
        course: { select: { title: true } },
      },
    }),
    // Stripe revenue source — uses `originalPrice` snapshot or the
    // course's current list price as a fallback. Bundle children
    // excluded so a single purchase counts once.
    prisma.enrollment.findMany({
      where: {
        source: { in: ['stripe', 'fanbasis'] },
        course: { bundleId: null },
      },
      select: {
        source: true,
        originalPrice: true,
        course: { select: { price: true } },
      },
    }),
    // Fanbasis revenue — pulled live from their list API. Authoritative
    // (matches the Fanbasis dashboard exactly, includes ClarityPay
    // financing splits the webhook payloads can't see).
    listFanbasisTransactions(),
  ]);

  // Completion rate = of lessons students have started, what % did they
  // finish. (Same formula as /admin/analytics so the two pages agree.)
  const engagementRate = lessonsStarted > 0
    ? Math.round((completedLessons / lessonsStarted) * 100)
    : 0;

  // ── Revenue ────────────────────────────────────────────────────
  // Same calc as analytics page: Fanbasis numbers come straight from
  // their list API (gross + net + fees authoritative). Stripe gross
  // is treated as net since Stripe webhooks aren't logged for fees.
  const fanbasisGrossCents = fanbasisTxs.reduce((s, t) => s + t.grossCents, 0);
  const fanbasisNetCents = fanbasisTxs.reduce((s, t) => s + t.netCents, 0);
  const stripeEnrollments = paidEnrollments.filter((e) => e.source === 'stripe');
  const stripeRevenue = stripeEnrollments.reduce(
    (s, e) => s + (e.originalPrice ?? e.course.price ?? 0),
    0,
  );
  const totalRevenue = fanbasisGrossCents + stripeRevenue;
  const totalNetRevenue = fanbasisNetCents + stripeRevenue;
  const totalFeesCents = totalRevenue - totalNetRevenue;
  const totalPaidPurchases = fanbasisTxs.length + stripeEnrollments.length;

  const revenueCards = [
    {
      label: 'Gross Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      sub: `${totalPaidPurchases} paid purchases · Stripe + Fanbasis`,
    },
    {
      label: 'Net Revenue',
      value: formatCurrency(totalNetRevenue),
      icon: Wallet,
      color: 'bg-emerald-600',
      sub: 'Actually credited · per Fanbasis API',
    },
    {
      label: 'Fees',
      value: formatCurrency(totalFeesCents),
      icon: Receipt,
      color: 'bg-rose-500',
      sub:
        totalRevenue > 0
          ? `${((totalFeesCents / totalRevenue) * 100).toFixed(1)}% of gross · processor + ClarityPay`
          : 'Fanbasis processing fees',
    },
  ];

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/users',
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

      {/* Revenue cards — gross / net / fees */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {revenueCards.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color} shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-extrabold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
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
              className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-sm transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                <BookOpen className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                New Course
              </span>
            </Link>
            <Link
              href="/admin/users"
              className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-green-50 hover:shadow-sm transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-500 flex items-center justify-center transition-colors">
                <UserPlus className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Manage Users
              </span>
            </Link>
            <Link
              href="/admin/webhooks"
              className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-orange-50 hover:shadow-sm transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                <Clock className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Webhook Logs
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
