'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

interface DrawerContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

/** Read drawer state from anywhere inside `<AdminShell>`. */
export function useAdminDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    // Used outside the shell — render a no-op so the components don't crash
    // during server render or in stories.
    return {
      open: false,
      setOpen: () => {},
      toggle: () => {},
    } satisfies DrawerContextValue;
  }
  return ctx;
}

interface AdminShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  children: React.ReactNode;
}

/**
 * Client wrapper around the admin chrome. Holds the mobile-drawer open state
 * so `AdminHeader` (the hamburger) and `AdminSidebar` (the drawer surface)
 * can share it without prop drilling. Persistent sidebar at `lg+`, slide-in
 * drawer below.
 */
export function AdminShell({ user, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Lock body scroll while the drawer is open so backdrop touches don't
  // bleed into the page.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <DrawerContext.Provider value={{ open, setOpen, toggle }}>
      <div className="min-h-screen bg-gray-100">
        <AdminHeader user={user} />
        <div className="flex">
          <AdminSidebar user={user} />
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </DrawerContext.Provider>
  );
}
