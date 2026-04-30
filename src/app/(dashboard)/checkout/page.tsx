import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FunnelCheckout } from '@/components/checkout/FunnelCheckout';
import { stripePublishableKey } from '@/lib/stripe';
import { isEffectivelyEnrolled } from '@/lib/enrollment';

async function getEnabledProviders() {
  const providers = await prisma.paymentProvider.findMany({
    where: { enabled: true },
    select: { provider: true },
  });
  return providers.map(p => p.provider);
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

interface CheckoutPageProps {
  searchParams: Promise<{
    courseId?: string;
    email?: string;
    name?: string;
    phone?: string;
    // Admin-only override params used by /admin/courses/[id]'s live preview
    // iframe so the editor's draft renders without requiring a save.
    _checkoutBullets?: string;
    _previewAdmin?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const {
    courseId,
    email: emailParam,
    name: nameParam,
    phone: phoneParam,
    _checkoutBullets: bulletsOverride,
    _previewAdmin: previewAdminFlag,
  } = await searchParams;
  const session = await auth();

  if (!courseId) {
    notFound();
  }

  // Admin preview — when an admin is signed in and passes _previewAdmin=1,
  // we drop the published-only filter so the live preview iframe in the
  // course editor works for unpublished/draft courses too.
  const isAdminPreview =
    !!previewAdminFlag && (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const course = await prisma.course.findUnique({
    where: isAdminPreview ? { id: courseId } : { id: courseId, published: true },
    select: { id: true, title: true, price: true, slug: true, thumbnail: true, checkoutBullets: true },
  });

  if (!course || !course.price || course.price <= 0) {
    notFound();
  }

  // Apply admin bullet override if present.
  let effectiveBullets = Array.isArray(course.checkoutBullets)
    ? (course.checkoutBullets as string[]).filter((s) => typeof s === 'string')
    : [];
  if (isAdminPreview && bulletsOverride) {
    try {
      const parsed = JSON.parse(bulletsOverride);
      if (Array.isArray(parsed)) {
        effectiveBullets = parsed.filter((s: unknown) => typeof s === 'string');
      }
    } catch {
      /* ignore malformed override */
    }
  }

  // Logged-in users who already own this course (directly or via bundle) go straight to it.
  // Anonymous users are allowed through — they'll purchase as guests.
  // Skip this redirect during admin preview so admins can preview a checkout
  // for courses they've enrolled themselves in.
  if (session?.user?.id && !isAdminPreview) {
    const enrolled = await isEffectivelyEnrolled(session.user.id, course.id);
    if (enrolled) {
      redirect(`/courses/${course.slug}`);
    }
  }

  const [enabledProviders, promoEnabled] = await Promise.all([
    getEnabledProviders(),
    hasActivePromoForCourse(course.id),
  ]);

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
        <Link href={`/courses/${course.slug}`} className="text-text-muted text-sm font-medium hover:text-text-dark transition-colors">
          ← Back to course
        </Link>
      </header>

      <main className="flex items-start justify-center py-6 px-4 min-h-[calc(100vh-120px)]">
        <FunnelCheckout
          publishableKey={stripePublishableKey}
          courseId={course.id}
          courseTitle={course.title}
          coursePrice={course.price}
          courseSlug={course.slug}
          courseThumbnail={course.thumbnail}
          checkoutBullets={effectiveBullets}
          promoEnabled={promoEnabled}
          enabledProviders={enabledProviders}
          // In admin preview mode, render as if the visitor is anonymous so
          // the full buyer flow (contact step + payment step) shows up.
          // Otherwise the admin's own logged-in session would skip straight
          // to payment and hide the name/email/phone fields.
          isAuthenticated={isAdminPreview ? false : !!session?.user?.id}
          prefillEmail={session?.user?.email ?? emailParam ?? null}
          prefillName={session?.user?.name ?? nameParam ?? null}
          prefillPhone={phoneParam ?? null}
        />
      </main>
    </div>
  );
}
