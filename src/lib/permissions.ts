/**
 * Role → capability authorization model.
 *
 * The admin area used to be a single binary: ADMIN gets everything,
 * everyone else gets nothing. We now have staff roles (MARKETING, SALES,
 * SUPPORT) that need scoped access — chiefly, the ability to see and run
 * operations WITHOUT seeing revenue or being able to delete things.
 *
 * This file is the single source of truth for "who can do what". It is
 * pure data + pure functions (no Prisma, no next-auth imports) so it is
 * safe to import from middleware (edge runtime), server components, and
 * API routes alike.
 *
 *   Page/route access   → middleware + requireCapability (src/lib/admin.ts)
 *   UI element hiding    → can(role, capability) in the component
 *   API write/delete     → requireCapability (src/lib/api-auth.ts)
 *
 * NOTE: the legacy Sales Tracker stays hard-locked to a single email in
 * src/lib/sales-tracker-auth.ts ("Todd was explicit") — it is NOT granted
 * by any capability here. Don't wire it into this model.
 */

export type Role =
  | 'STUDENT'
  | 'INSTRUCTOR'
  | 'ADMIN'
  | 'MARKETING'
  | 'SALES'
  | 'SUPPORT';

export type Capability =
  /** Load the admin shell at all (any staff role). */
  | 'admin:access'
  /** See company-level revenue — dashboard $ cards, funnel Revenue tab,
   *  payment-provider config, financial totals. */
  | 'revenue:view'
  /** See per-deal / per-lead dollar amounts (closer-facing). Narrower
   *  than revenue:view; reserved for SALES. */
  | 'deals:view'
  /** View the platform Analytics page (student/course engagement, quiz
   *  results, real-customer data). Withheld from MARKETING. */
  | 'analytics:view'
  /** View the Leads list (captured applications). Withheld from MARKETING. */
  | 'leads:view'
  /** Create / edit content — courses, lessons, quizzes, funnels, docs,
   *  homepage, promo codes. Does NOT imply delete. */
  | 'content:manage'
  /** Create / edit users, enrollments, CSV import. */
  | 'users:manage'
  /** Platform configuration — payment providers, settings, webhooks,
   *  notification routing. */
  | 'settings:manage'
  /** Delete or bulk-delete ANY entity. Deliberately its own capability so
   *  a role can edit content without being able to destroy it. */
  | 'destructive:delete';

export const ALL_CAPABILITIES: Capability[] = [
  'admin:access',
  'revenue:view',
  'deals:view',
  'analytics:view',
  'leads:view',
  'content:manage',
  'users:manage',
  'settings:manage',
  'destructive:delete',
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  // Full god mode.
  ADMIN: ALL_CAPABILITIES,

  // Ad/creative ops (Waylon). Sees funnels/courses + analytics and can edit
  // content — but NO revenue, NO settings, NO user management, and NO
  // deletes (he literally can't reach a destructive endpoint).
  MARKETING: ['admin:access', 'content:manage', 'analytics:view'],

  // Closers/setters. Leads + per-deal dollar amounts (their commissions)
  // + analytics, but never company-wide revenue, settings, or deletes.
  SALES: ['admin:access', 'deals:view', 'analytics:view', 'leads:view'],

  // Customer support. Read-mostly operational access; no money, no deletes.
  SUPPORT: ['admin:access', 'analytics:view', 'leads:view'],

  // Course authors. Manage content + see analytics; nothing financial or
  // destructive.
  INSTRUCTOR: ['admin:access', 'content:manage', 'analytics:view'],

  // Students have no admin capabilities.
  STUDENT: [],
};

/** Roles allowed to load the admin shell at all. */
export const STAFF_ROLES: Role[] = (Object.keys(ROLE_CAPABILITIES) as Role[]).filter(
  (r) => ROLE_CAPABILITIES[r].includes('admin:access')
);

/**
 * Does `role` have `capability`? Unknown/undefined roles get nothing.
 * Accepts a loose string so callers don't have to cast session.user.role.
 */
export function can(role: string | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  const caps = ROLE_CAPABILITIES[role as Role];
  return !!caps && caps.includes(capability);
}

/** Can this role load the admin area at all? */
export function isStaff(role: string | null | undefined): boolean {
  return can(role, 'admin:access');
}

/**
 * Capability required to access a given admin sub-path. Used by middleware
 * to centralize page-level gating. Longest prefix wins; anything under
 * /admin not listed here only needs `admin:access`.
 *
 * Order matters: list most-specific prefixes first.
 */
const ADMIN_PATH_CAPABILITY: { prefix: string; capability: Capability }[] = [
  // Revenue / money / pricing
  { prefix: '/admin/payments', capability: 'revenue:view' },
  { prefix: '/admin/sales', capability: 'revenue:view' }, // also email-locked
  // Promo codes change pricing and the page only talks to ADMIN-only APIs.
  { prefix: '/admin/funnels/promo-codes', capability: 'settings:manage' },
  // Analytics — student/customer engagement data; hidden from MARKETING.
  { prefix: '/admin/analytics', capability: 'analytics:view' },
  // Leads — captured applications; hidden from MARKETING.
  { prefix: '/admin/leads', capability: 'leads:view' },
  // Platform configuration
  { prefix: '/admin/settings', capability: 'settings:manage' },
  { prefix: '/admin/webhooks', capability: 'settings:manage' },
  { prefix: '/admin/notifications', capability: 'settings:manage' },
  { prefix: '/admin/documents', capability: 'settings:manage' },
  // People / data management
  { prefix: '/admin/users', capability: 'users:manage' },
  { prefix: '/admin/enrollments', capability: 'users:manage' },
  { prefix: '/admin/import', capability: 'users:manage' },
  { prefix: '/admin/messages', capability: 'users:manage' },
];

/**
 * Which capability does this admin pathname require? Returns 'admin:access'
 * for any admin path with no stricter rule. Returns null for non-admin paths.
 */
export function capabilityForAdminPath(pathname: string): Capability | null {
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return null;
  const match = ADMIN_PATH_CAPABILITY.find(
    (e) => pathname === e.prefix || pathname.startsWith(e.prefix + '/')
  );
  return match ? match.capability : 'admin:access';
}
