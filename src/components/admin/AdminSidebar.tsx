'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  GraduationCap,
  FileQuestion,
  Upload,
  BarChart2,
  MonitorPlay,
  CreditCard,
  MessageCircle,
  Bell,
  Tag,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/funnels', label: 'Funnels', icon: MonitorPlay },
  { href: '/admin/funnels/promo-codes', label: 'Promo Codes', icon: Tag },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/quizzes', label: 'Quizzes', icon: FileQuestion },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/messages', label: 'Messages', icon: MessageCircle },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/enrollments', label: 'Enrollments', icon: GraduationCap },
  { href: '/admin/import', label: 'CSV Import', icon: Upload },
  { href: '/admin/webhooks', label: 'Webhook Logs', icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  // Find the single best (longest) match across all nav items so that
  // /admin/funnels/promo-codes only highlights "Promo Codes", not also
  // its parent "Funnels".
  const activeHref = navItems.reduce<string | null>((best, item) => {
    const matches =
      pathname === item.href ||
      (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);

  return (
    <aside className="w-64 bg-gray-900 min-h-[calc(100vh-64px)] hidden lg:block">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>
    </aside>
  );
}
