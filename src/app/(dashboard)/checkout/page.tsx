import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { stripePublishableKey } from '@/lib/stripe';

async function getEnabledProviders() {
  const providers = await prisma.paymentProvider.findMany({
    where: { enabled: true },
    select: { provider: true },
  });
  return providers.map(p => p.provider);
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

  // Require authentication for internal checkout
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout?courseId=${courseId}`);
  }

  // Logged-in users who are already enrolled go straight to the course
  if (session?.user?.id) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    });
    if (enrollment) {
      redirect(`/courses/${course.slug}`);
    }
  }

  const enabledProviders = await getEnabledProviders();

  return (
    <div style={{ background: '#f4f6fa', minHeight: '100vh' }}>
      {/* Minimal checkout header */}
      <header className="bg-white border-t-4 border-maxxed-blue shadow-sm px-6 md:px-10 py-4 flex items-center justify-between">
        <Link href="/courses" className="flex items-center gap-2.5 text-2xl font-extrabold text-text-dark no-underline">
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
        <CheckoutClient
          course={{
            id: course.id,
            title: course.title,
            price: course.price,
            slug: course.slug,
            thumbnail: course.thumbnail,
          }}
          publishableKey={stripePublishableKey}
          prefillEmail={session?.user?.email ?? null}
          prefillName={session?.user?.name ?? null}
          isAuthenticated={!!session?.user?.id}
          enabledProviders={enabledProviders}
        />
      </main>
    </div>
  );
}
