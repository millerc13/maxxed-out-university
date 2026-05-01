import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listRecentGhlContacts } from '@/lib/ghl';
import { listFanbasisTransactions } from '@/lib/fanbasis-spend';

/**
 * GHL tags that mark a contact as a course-funnel applicant. These are
 * "real" course leads — anything outside this set is something else
 * (mastermind event registrant, old marketing tag, etc.) and is filtered
 * out by default. The filter is INCLUDE-style so unknown tags drop the
 * contact unless they carry at least one of these.
 */
const COURSE_LEAD_TAGS = new Set([
  // Generic /apply funnel (newer format)
  'applied',
  'source:apply',
  'incomplete-application',
  'completed-application',
  // Accelerator funnel
  'ultimate-business-accelerator',
  // Done-With-You funnel
  'dd application submitted',
  'dd app complete',
]);

function isCourseFunnelLead(tags: string[]): boolean {
  return tags.some((t) => COURSE_LEAD_TAGS.has(t.toLowerCase().trim()));
}

/**
 * Recent contacts list for /admin/messages.
 *
 * Returns a merged list of:
 *  · university Users that have a `ghlContactId` linked → buyers (sale /
 *    enrolled), with last-activity from their most-recent enrollment.
 *  · recent GHL contacts (last ~100) that aren't already in our local Users
 *    → leads (applied, didn't buy yet).
 *
 * Sorted newest-first. Each entry carries a `badge` so the UI can show
 * Lead / Sale / Enrolled.
 *
 * Admin-only.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ?includeAll=1 disables the course-funnel tag filter so admins can
  // see mastermind event registrants and other GHL contacts too.
  const includeAll = request.nextUrl.searchParams.get('includeAll') === '1';

  type Contact = {
    id: string;
    email: string | null;
    name: string | null;
    ghlContactId: string;
    lastActivity: string;
    badge: 'lead' | 'purchased';
    purchasedCourse: string | null;
    enrollmentCount: number;
    /** Total spent in cents across all of this contact's enrollments. */
    totalSpentCents: number;
  };

  // Local users with a linked ghlContactId — anyone with an enrollment
  // counts as "purchased" (regardless of source: stripe, fanbasis,
  // manual-offline bulk imports, admin grants — they all represent a
  // student who has access to course content). Use most-recent enrollment
  // date as the activity timestamp.
  const [users, fanbasisTxs] = await Promise.all([
    prisma.user.findMany({
      where: { ghlContactId: { not: null } },
      select: {
        id: true,
        email: true,
        name: true,
        ghlContactId: true,
        createdAt: true,
        _count: { select: { enrollments: true } },
        enrollments: {
          select: {
            enrolledAt: true,
            source: true,
            transactionId: true,
            course: { select: { title: true } },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    listFanbasisTransactions(),
  ]);

  // Per-email Fanbasis spend, summed straight from the live API list.
  // Email match works because we keep a User<->Fanbasis-buyer email
  // alignment via emailAliases (see auth.ts) — fixes drift from
  // typo'd manual imports.
  const fbByEmail = new Map<string, number>();
  for (const tx of fanbasisTxs) {
    if (!tx.email) continue;
    fbByEmail.set(tx.email, (fbByEmail.get(tx.email) ?? 0) + tx.grossCents);
  }

  const localContacts: Contact[] = users.map((u) => {
    const lastEnroll = u.enrollments[0];
    const lastActivity = (lastEnroll?.enrolledAt ?? u.createdAt).toISOString();
    const badge: Contact['badge'] = lastEnroll ? 'purchased' : 'lead';

    const emailKey = u.email?.toLowerCase().trim() ?? '';
    const totalSpentCents = emailKey ? (fbByEmail.get(emailKey) ?? 0) : 0;

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      ghlContactId: u.ghlContactId!,
      lastActivity,
      badge,
      purchasedCourse: lastEnroll?.course.title ?? null,
      enrollmentCount: u._count.enrollments,
      totalSpentCents,
    };
  });

  // GHL contacts that aren't already in our local user table — leads.
  // Best-effort: if GHL is unconfigured or rate-limited, we still return
  // the local list so the page isn't empty.
  const seenGhlIds = new Set(localContacts.map((c) => c.ghlContactId));
  const seenEmails = new Set(
    localContacts.map((c) => (c.email ?? '').toLowerCase()).filter(Boolean)
  );

  let ghlOnly: Contact[] = [];
  try {
    const ghlContacts = await listRecentGhlContacts(100);
    ghlOnly = ghlContacts
      .filter((c) => c?.id && !seenGhlIds.has(c.id))
      .filter((c) => !c?.email || !seenEmails.has(c.email.toLowerCase()))
      .filter((c) => includeAll || isCourseFunnelLead(c.tags ?? []))
      .map((c) => {
        const name =
          [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || null;
        const lastActivity =
          c.dateUpdated || c.dateAdded || new Date().toISOString();
        return {
          id: `ghl:${c.id}`,
          email: c.email ?? null,
          name,
          ghlContactId: c.id,
          lastActivity,
          badge: 'lead' as const,
          purchasedCourse: null,
          enrollmentCount: 0,
          totalSpentCents: 0,
        };
      });
  } catch (err) {
    console.error('[messages/contacts] GHL fetch failed; returning local only', err);
  }

  const merged = [...localContacts, ...ghlOnly].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  return NextResponse.json({
    contacts: merged,
    counts: {
      total: merged.length,
      local: localContacts.length,
      leads: merged.filter((c) => c.badge === 'lead').length,
      purchased: merged.filter((c) => c.badge === 'purchased').length,
    },
  });
}
