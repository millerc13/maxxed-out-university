import { listFanbasisTransactions } from '@/lib/fanbasis-spend';
import { prisma } from '@/lib/prisma';
import { listGhlTransactions } from './ghl';
import { isTestTransaction, offerFor } from './offers';

/**
 * The blended revenue stream. Money lands on three rails:
 *
 *  1. Fanbasis — the primary rail for every high-ticket offer (Blueprint,
 *     Mentorship, Cohort, webinar VIP). Fanbasis's `net_amount` is
 *     authoritative for what actually hit Todd's account.
 *  2. GHL payments — GHL's own Stripe checkout used by GHL-built funnels
 *     (Mastermind LIVE tickets on live.maxxedout.com etc.). Never appears
 *     in Fanbasis.
 *  3. University Stripe — this app's own Stripe checkout (mostly off in
 *     prod, but historical enrollments exist). Tracked via Enrollment
 *     rows with source='stripe'.
 *
 * The three sets are disjoint by construction (different processors /
 * different checkout surfaces), so summing them never double-counts.
 */

export type UnifiedTransaction = {
  /** ISO date string. */
  date: string;
  grossCents: number;
  /** Fanbasis: API net. Other rails: gross (their fees aren't itemized). */
  netCents: number;
  rail: 'fanbasis' | 'ghl' | 'stripe';
  /** Product / funnel label as the rail reported it. */
  label: string;
  buyerName: string;
  buyerEmail: string;
  offerId: string;
  offerLabel: string;
  /** Known for the GHL rail; other rails resolve by email on demand. */
  ghlContactId?: string;
};

export async function listUnifiedTransactions(): Promise<UnifiedTransaction[]> {
  const [fanbasis, ghl, stripeEnrollments] = await Promise.all([
    listFanbasisTransactions(),
    listGhlTransactions(),
    prisma.enrollment.findMany({
      where: { source: 'stripe' },
      select: {
        enrolledAt: true,
        originalPrice: true,
        user: { select: { name: true, email: true } },
        course: { select: { title: true, price: true } },
      },
    }),
  ]);

  const out: UnifiedTransaction[] = [];

  for (const t of fanbasis) {
    if (isTestTransaction(t.productTitle, t.email)) continue;
    const offer = offerFor(t.productTitle);
    out.push({
      date: t.date,
      grossCents: t.grossCents,
      netCents: t.netCents,
      rail: 'fanbasis',
      label: t.productTitle,
      buyerName: t.name,
      buyerEmail: t.email,
      offerId: offer.id,
      offerLabel: offer.label,
    });
  }

  for (const t of ghl) {
    if (!t.liveMode || t.status !== 'succeeded') continue;
    if (isTestTransaction(t.sourceName, t.contactEmail)) continue;
    const offer = offerFor(t.sourceName);
    const cents = Math.round(t.amount * 100);
    out.push({
      date: t.createdAt,
      grossCents: cents,
      netCents: cents,
      rail: 'ghl',
      label: t.sourceName,
      buyerName: t.contactName,
      buyerEmail: t.contactEmail,
      offerId: offer.id,
      offerLabel: offer.label,
      ghlContactId: t.contactId || undefined,
    });
  }

  for (const e of stripeEnrollments) {
    const cents = e.originalPrice ?? e.course.price ?? 0;
    if (cents <= 0) continue;
    const email = (e.user.email ?? '').toLowerCase();
    if (isTestTransaction(e.course.title, email)) continue;
    const offer = offerFor(e.course.title);
    out.push({
      date: e.enrolledAt.toISOString(),
      grossCents: cents,
      netCents: cents,
      rail: 'stripe',
      label: e.course.title,
      buyerName: e.user.name ?? '',
      buyerEmail: email,
      offerId: offer.id,
      offerLabel: offer.label,
    });
  }

  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

export function sumCents(txs: UnifiedTransaction[], field: 'grossCents' | 'netCents' = 'grossCents'): number {
  return txs.reduce((acc, t) => acc + t[field], 0);
}

export function since(txs: UnifiedTransaction[], date: Date): UnifiedTransaction[] {
  const iso = date.toISOString();
  return txs.filter((t) => t.date >= iso);
}

export function formatUsd(cents: number, opts: { compact?: boolean } = {}): string {
  const dollars = cents / 100;
  if (opts.compact && Math.abs(dollars) >= 10_000) {
    return `$${(dollars / 1000).toFixed(dollars >= 100_000 ? 0 : 1)}k`;
  }
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars >= 1000 ? 0 : 2,
  });
}
