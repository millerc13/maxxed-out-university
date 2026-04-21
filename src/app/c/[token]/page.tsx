import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

/**
 * Short-link expander. Looks up the token, increments the click counter,
 * then 302-redirects to /checkout?courseId=…&email=…&name=…&phone=…
 *
 * Token-not-found and expired links both 404.
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CheckoutLinkRedirect({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 3) notFound();

  const link = await prisma.checkoutLink.findUnique({
    where: { token },
    select: {
      id: true,
      courseId: true,
      email: true,
      name: true,
      phone: true,
      promoCode: true,
      expiresAt: true,
      clickedAt: true,
    },
  });

  if (!link) {
    console.warn('[c/token] Token not found', { token });
    notFound();
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    console.warn('[c/token] Token expired', { token, expiresAt: link.expiresAt });
    notFound();
  }

  // Track the click — first-click timestamp + running counter.
  await prisma.checkoutLink
    .update({
      where: { id: link.id },
      data: {
        clickCount: { increment: 1 },
        clickedAt: link.clickedAt ?? new Date(),
      },
    })
    .catch((err) =>
      console.error('[c/token] Failed to update click counters', { token, error: err instanceof Error ? err.message : err })
    );

  // Build the destination URL
  const params2 = new URLSearchParams({ courseId: link.courseId });
  if (link.email) params2.set('email', link.email);
  if (link.name) params2.set('name', link.name);
  if (link.phone) params2.set('phone', link.phone);
  // promoCode isn't read by the checkout page yet but pass it through so we
  // don't drop it on the floor — the FunnelCheckout has a promo input too.
  if (link.promoCode) params2.set('promoCode', link.promoCode);

  redirect(`/checkout?${params2.toString()}`);
}
