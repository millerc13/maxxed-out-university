import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { QuickLinksClient } from '@/components/admin/QuickLinksClient';

export const dynamic = 'force-dynamic';

/**
 * Quick Links — at-an-event tooling. Pre-built shareable URLs and QR
 * codes for every funnel, the university, and a permanent payment link
 * per published paid course (`/pay/<slug>` → checkout).
 *
 * Server here, interactive switcher + QR + copy/share in the client
 * component. Data is small (≈12 rows total) so we just inline-load it.
 */
export default async function QuickLinksPage() {
  await requireStaff();

  // Public origin used to construct shareable URLs. NEXTAUTH_URL is the
  // canonical "where this app lives" var already used elsewhere; fall
  // back to the prod hostname so dev links default to the prod URL
  // (admins handing out dev URLs at a real event would be a footgun).
  const universityOrigin = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');

  const courses = await prisma.course.findMany({
    where: {
      published: true,
      bundleId: null,
      price: { gt: 0 },
      // No applyMode filter — at an event Todd needs to send someone the
      // Fanbasis checkout for ANY course (including apply-flow ones like
      // Mentorship / BAM / Accelerator) without making them go through
      // the application form. /pay/<slug> → /checkout works for all
      // published paid courses regardless of apply mode.
    },
    select: { id: true, title: true, slug: true, price: true, thumbnail: true },
    orderBy: [{ price: 'desc' }, { title: 'asc' }],
  });

  return <QuickLinksClient universityOrigin={universityOrigin} courses={courses} />;
}
