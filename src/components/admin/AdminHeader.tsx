'use client';

import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  Link2,
  FileText,
  BarChart3,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const mobileNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/quizzes', label: 'Quizzes', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/enrollments', label: 'Enrollments', icon: GraduationCap },
  { href: '/admin/import', label: 'CSV Import', icon: Settings },
  { href: '/admin/products', label: 'GHL Products', icon: Link2 },
  { href: '/admin/webhooks', label: 'Webhook Logs', icon: FileText },
];

export function AdminHeader({ user }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const userName = user.name || user.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="bg-gray-900 text-white h-16 sticky top-0 z-50 border-b border-gray-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277b484ee4a3826c4e244a.png"
              alt="Maxxed Out"
              width={120}
              height={48}
              className="h-8 w-auto"
              unoptimized
            />
            <div>
              <span className="font-bold text-lg">Admin Panel</span>
              <span className="hidden sm:inline text-gray-400 text-sm ml-2">
                Maxxed Out University
              </span>
            </div>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* View Site Link */}
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Site
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-maxxed-blue text-white flex items-center justify-center text-sm font-bold">
                {userInitial}
              </div>
              <span className="hidden md:inline text-sm">{userName}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Site
                </Link>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav
        className={`lg:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800 transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? 'max-h-[500px]' : 'max-h-0'
        }`}
      >
        <div className="p-4 space-y-1">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-maxxed-blue text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
