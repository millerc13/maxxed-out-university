'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  FileSignature,
  GraduationCap,
  FileQuestion,
  Upload,
  BarChart2,
  MonitorPlay,
  CreditCard,
  MessageCircle,
  Bell,
  Tag,
  X,
} from 'lucide-react';
import { useAdminDrawer } from './AdminShell';

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
  { href: '/admin/documents', label: 'Documents', icon: FileSignature },
  { href: '/admin/import', label: 'CSV Import', icon: Upload },
  { href: '/admin/webhooks', label: 'Webhook Logs', icon: FileText },
];

/**
 * Returns the href that should be active for the current pathname using a
 * longest-prefix match — so /admin/funnels/promo-codes activates only
 * "Promo Codes" and not also its parent "Funnels".
 */
function useActiveHref(): string | null {
  const pathname = usePathname();
  return navItems.reduce<string | null>((best, item) => {
    const matches =
      pathname === item.href ||
      (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);
}

interface NavListProps {
  onNavigate?: () => void;
  activeHref: string | null;
}

function NavList({ onNavigate, activeHref }: NavListProps) {
  return (
    <nav className="p-4 space-y-1">
      {navItems.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

export function AdminSidebar() {
  const activeHref = useActiveHref();
  const { open, setOpen } = useAdminDrawer();

  return (
    <>
      {/* Persistent desktop sidebar */}
      <aside className="w-64 bg-gray-900 min-h-[calc(100vh-64px)] hidden lg:block">
        <NavList activeHref={activeHref} />
      </aside>

      {/* Mobile drawer + backdrop. Rendered always so the slide animation
          works on both open and close transitions; the `pointer-events`
          toggle keeps it inert when closed. */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gray-900 shadow-2xl transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800">
          <span className="text-white font-bold text-sm uppercase tracking-[0.18em]">
            Admin
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-3.5rem)]">
          <NavList activeHref={activeHref} onNavigate={() => setOpen(false)} />
        </div>
      </aside>
    </>
  );
}
