import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Search, Shield, GraduationCap, UserCog } from 'lucide-react';
import Link from 'next/link';
import { UserRoleSelect } from '@/components/admin/UserRoleSelect';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { enrollments: true },
      },
      enrollments: {
        include: { course: { select: { title: true } } },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((u) => u.role === 'ADMIN').length}
              </p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((u) => u._count.enrollments > 0).length}
              </p>
              <p className="text-sm text-gray-500">Enrolled Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Enrollments
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Joined
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <UserRoleSelect userId={user.id} currentRole={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-medium">{user._count.enrollments}</span>
                        <span className="text-gray-500 text-sm"> courses</span>
                        {user.enrollments.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {user.enrollments.map((e) => e.course.title).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-maxxed-blue hover:underline text-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No users found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
