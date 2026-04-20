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
  searchParams: Promise<{ courseId?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { courseId } = await searchParams;
  const session = await auth();

  if (!courseId) {
    notFound();
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId, published: true },
    select: { id: true, title: true, price: true, slug: true, thumbnail: true },
  });

  if (!course || !course.price || course.price <= 0) {
    notFound();
  }

  // Logged-in users who already own this course (directly or via bundle) go straight to it.
  // Anonymous users are allowed through — they'll purchase as guests.
  if (session?.user?.id) {
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
          promoEnabled={promoEnabled}
          enabledProviders={enabledProviders}
          isAuthenticated={!!session?.user?.id}
          prefillEmail={session?.user?.email ?? null}
          prefillName={session?.user?.name ?? null}
        />
      </main>
    </div>
  );
}
