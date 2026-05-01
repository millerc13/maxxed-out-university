import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { PayPageClient } from '@/components/pay/PayPageClient';

/**
 * Permanent payment page — used by the /admin/quick-links QR codes that
 * Todd hands out at events. Stand-alone from /checkout: a stripped-down
 * Fanbasis-only flow that always captures buyer info up front (so we
 * always create a GHL contact, even when the buyer never went through a
 * funnel) and surfaces the promo code field prominently.
 *
 * Reuses course.checkoutBullets + course.thumbnail + course.price from
 * the same admin course-config that powers /checkout, so editing those
 * in /admin/courses/[id] updates this page automatically.
 *
 * Touches no existing checkout code paths — calls /api/checkout/fanbasis
 * directly with the same { courseId, guestEmail, guestName, guestPhone,
 * promoCode } contract that the existing FunnelCheckout uses.
 */
interface PayPageProps {
  params: Promise<{ slug: string }>;
}

async function hasActivePromoForCourse(courseId: string): Promise<boolean> {
  const now = new Date();
  const count = await prisma.promoCode.count({
    where: {
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [{ OR: [{ applyToAll: true }, { courses: { some: { id: courseId } } }] }],
    },
  });
  return count > 0;
}

export default async function PayPage({ params }: PayPageProps) {
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug, published: true },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      thumbnail: true,
      shortDesc: true,
      checkoutBullets: true,
    },
  });

  if (!course || !course.price || course.price <= 0) notFound();

  const checkoutBullets = Array.isArray(course.checkoutBullets)
    ? (course.checkoutBullets as string[]).filter((s) => typeof s === 'string')
    : [];

  const promoEnabled = await hasActivePromoForCourse(course.id);

  return (
    <div style={{ background: '#f4f6fa', minHeight: '100vh' }}>
      <header className="bg-white border-t-4 border-maxxed-blue shadow-sm px-6 md:px-10 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold text-text-dark no-underline">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={180}
            height={71}
            className="h-12 w-auto"
            unoptimized
          />
          <span className="hidden sm:inline">TODD PULTZ</span>
        </Link>
        <Link
          href={`/courses/${course.slug}`}
          className="text-text-muted text-sm font-medium hover:text-text-dark transition-colors"
        >
          ← Course details
        </Link>
      </header>

      <main className="flex items-start justify-center py-6 px-4 min-h-[calc(100vh-120px)]">
        <PayPageClient
          courseId={course.id}
          courseTitle={course.title}
          courseSlug={course.slug}
          coursePrice={course.price}
          courseThumbnail={course.thumbnail}
          shortDesc={course.shortDesc}
          checkoutBullets={checkoutBullets}
          promoEnabled={promoEnabled}
        />
      </main>
    </div>
  );
}
