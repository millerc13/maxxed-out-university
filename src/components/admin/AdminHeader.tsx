'use client';

import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  Menu,
  ChevronDown,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAdminDrawer } from './AdminShell';

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const { toggle: toggleDrawer } = useAdminDrawer();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userName = user.name || user.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="bg-gray-900 text-white h-16 sticky top-0 z-30 border-b border-gray-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 hover:bg-gray-800 rounded-lg"
            onClick={toggleDrawer}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/admin" className="flex items-center gap-3 min-w-0">
            <Image
              src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277b484ee4a3826c4e244a.png"
              alt="Maxxed Out"
              width={120}
              height={48}
              className="h-7 sm:h-8 w-auto"
              unoptimized
            />
            <div className="min-w-0">
              <span className="font-bold text-base sm:text-lg">Admin</span>
              <span className="hidden md:inline text-gray-400 text-sm ml-2">
                Maxxed Out University
              </span>
            </div>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4">
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
              className="flex items-center gap-2 hover:bg-gray-800 rounded-lg px-2 sm:px-3 py-2 transition-colors"
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
    </header>
  );
}
