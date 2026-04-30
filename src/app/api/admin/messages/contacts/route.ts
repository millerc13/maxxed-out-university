import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listRecentGhlContacts } from '@/lib/ghl';
import { getSuccessfulFanbasisTransactions } from '@/lib/fanbasis-spend';

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
    getSuccessfulFanbasisTransactions(),
  ]);

  // Build two indexes for matching successful Fanbasis transactions
  // back to a local user: by payment_id (== Enrollment.transactionId,
  // exact match) and by buyer email (fallback for cases where the user
  // has a paymentId-less manual record but the Fanbasis email matches
  // their university email).
  const fbByPaymentId = new Map<string, number>();
  const fbByEmail = new Map<string, number[]>();
  for (const tx of fanbasisTxs) {
    fbByPaymentId.set(tx.paymentId, tx.cents);
    if (tx.email) {
      const arr = fbByEmail.get(tx.email) ?? [];
      arr.push(tx.cents);
      fbByEmail.set(tx.email, arr);
    }
  }

  const localContacts: Contact[] = users.map((u) => {
    const lastEnroll = u.enrollments[0];
    const lastActivity = (lastEnroll?.enrolledAt ?? u.createdAt).toISOString();
    const badge: Contact['badge'] = lastEnroll ? 'purchased' : 'lead';

    // Sum real Fanbasis spend. Prefer matching by transactionId
    // (1:1 with Fanbasis payment_id, robust to email mismatches);
    // fall back to email-based matching for any txs that haven't
    // been claimed by a transactionId. Each tx is counted at most
    // once per user.
    const matchedPaymentIds = new Set<string>();
    let totalSpentCents = 0;
    for (const e of u.enrollments) {
      const txnId = e.transactionId?.trim();
      if (!txnId) continue;
      const cents = fbByPaymentId.get(txnId);
      if (cents == null) continue;
      totalSpentCents += cents;
      matchedPaymentIds.add(txnId);
    }
    const emailKey = u.email?.toLowerCase().trim() ?? '';
    if (emailKey && fbByEmail.has(emailKey)) {
      // Pull every tx for this email that wasn't already claimed via
      // transactionId match. (Re-derive from the source list so we
      // can check paymentId per tx.)
      for (const tx of fanbasisTxs) {
        if (tx.email !== emailKey) continue;
        if (matchedPaymentIds.has(tx.paymentId)) continue;
        totalSpentCents += tx.cents;
        matchedPaymentIds.add(tx.paymentId);
      }
    }

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
