'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Facebook, Instagram, Youtube, Menu, X, User, LogOut, ChevronDown, BookOpen, LayoutDashboard, Settings } from 'lucide-react';

const socialLinks = [
  { href: 'https://www.facebook.com/todd.pultz', icon: Facebook, label: 'Facebook', hoverClass: 'hover:bg-[#1877f2]' },
  { href: 'https://www.instagram.com/toddpultzofficial/', icon: Instagram, label: 'Instagram', hoverClass: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888]' },
  { href: 'https://www.youtube.com/@toddpultzofficial', icon: Youtube, label: 'YouTube', hoverClass: 'hover:bg-[#ff0000]' },
];

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, authRequired: true },
  { href: '/courses', label: 'Courses', icon: BookOpen, authRequired: false },
];

// TikTok icon component (not in Lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-t-4 border-maxxed-blue shadow-header sticky top-0 z-50">
      <div className="flex justify-between items-center px-5 md:px-10 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold text-text-dark no-underline">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
          <span className="hidden sm:inline">TODD PULTZ</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1 z-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-text-dark" />
          ) : (
            <Menu className="w-6 h-6 text-text-dark" />
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {/* Social Links */}
          <div className="flex items-center gap-2 pr-5 mr-1 border-r border-gray-200">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-text-dark transition-all duration-300 hover:-translate-y-0.5 hover:text-white ${social.hoverClass}`}
                aria-label={social.label}
              >
                <social.icon className="w-[18px] h-[18px]" />
              </a>
            ))}
            <a
              href="https://www.tiktok.com/@toddpultzofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-text-dark transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:text-white"
              aria-label="TikTok"
            >
              <TikTokIcon className="w-[18px] h-[18px]" />
            </a>
          </div>

          {/* Nav Links */}
          {navLinks
            .filter((link) => !link.authRequired || isAuthenticated)
            .map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-1.5 text-text-body text-sm font-medium no-underline transition-colors duration-300 hover:text-maxxed-blue"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}

          {/* Auth Section */}
          {isLoading ? (
            <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
          ) : isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 text-text-body text-sm font-medium hover:text-maxxed-blue transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-maxxed-blue text-white flex items-center justify-center text-sm font-bold">
                  {userInitial}
                </div>
                <span className="hidden lg:inline">{userName}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-body hover:bg-gray-50 hover:text-maxxed-blue"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    My Dashboard
                  </Link>
                  <Link
                    href="/courses"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-body hover:bg-gray-50 hover:text-maxxed-blue"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <BookOpen className="w-4 h-4" />
                    Browse Courses
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text-body hover:bg-gray-50 hover:text-maxxed-blue"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ callbackUrl: '/login' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-body hover:bg-gray-50 hover:text-red-600 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-text-body text-sm font-medium no-underline transition-colors duration-300 hover:text-maxxed-blue"
            >
              Login
            </Link>
          )}
        </nav>

        {/* Mobile Navigation */}
        <nav
          className={`md:hidden absolute top-full left-0 right-0 bg-white flex-col shadow-lg transition-all duration-300 overflow-hidden ${
            mobileMenuOpen ? 'max-h-96 flex' : 'max-h-0'
          }`}
        >
          {navLinks
            .filter((link) => !link.authRequired || isAuthenticated)
            .map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-5 py-4 border-b border-gray-100 text-text-body text-sm font-medium no-underline transition-colors duration-300 hover:text-maxxed-blue flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-5 py-4 border-b border-gray-100 text-text-body text-sm font-medium no-underline transition-colors duration-300 hover:text-maxxed-blue flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="px-5 py-4 text-text-body text-sm font-medium transition-colors duration-300 hover:text-red-600 flex items-center gap-2 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-5 py-4 text-text-body text-sm font-medium no-underline transition-colors duration-300 hover:text-maxxed-blue flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="w-4 h-4" />
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
