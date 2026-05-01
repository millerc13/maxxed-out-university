import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { ApplyWizardOnPlatform } from '@/components/apply/ApplyWizardOnPlatform';
import { auth } from '@/lib/auth';
import { isEffectivelyEnrolled } from '@/lib/enrollment';

interface ApplyPageProps {
  params: Promise<{ slug: string }>;
}

// Slugs that always get the apply flow (preserves existing
// Mentorship/DWY behavior even if Todd hasn't flipped the new
// course-level toggle yet). New courses with checkoutAfterApply ON
// also reach this route.
const HIGH_TICKET_SLUGS = new Set([
  'done-with-you-real-estate-business',
  '6-month-mentorship',
  'business-mentorship',
]);

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug, published: true },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      price: true,
      applyMode: true,
      checkoutAfterApply: true,
      externalUrl: true,
    },
  });

  if (!course) notFound();

  // External-URL courses (e.g. Healthcare Billing) have their own
  // landing page off-platform — sending them through /apply would be
  // confusing. Redirect to the external destination instead.
  if (course.externalUrl) {
    redirect(course.externalUrl);
  }

  // Don't surface the apply route for arbitrary courses — restrict to
  // courses where the admin explicitly enabled the apply flow:
  //   · applyMode toggle ON (the user-facing "show Apply Now button"
  //     toggle in the admin course form), OR
  //   · checkoutAfterApply ON, OR
  //   · grandfathered legacy slug from the high-ticket allowlist.
  // Without applyMode here the course-detail page renders an Apply Now
  // button (driven by applyMode) that loops back to itself.
  if (!course.applyMode && !course.checkoutAfterApply && !HIGH_TICKET_SLUGS.has(course.slug)) {
    redirect(`/courses/${course.slug}`);
  }

  // Block re-applying. Logged-in users who already enrolled OR who
  // have an Application row for this course get sent to the course
  // detail page with the "applied" success state — no point in
  // re-submitting the form. Unauthenticated visitors fall through
  // and see the form (closer can dedupe on email at review time).
  const session = await auth();
  if (session?.user?.id) {
    const alreadyEnrolled = await isEffectivelyEnrolled(session.user.id, course.id);
    if (alreadyEnrolled) {
      redirect(`/courses/${course.slug}`);
    }
    const existingApplication = await prisma.application.findUnique({
      where: { email_courseId: { email: session.user.email!, courseId: course.id } },
      select: { id: true },
    });
    if (existingApplication) {
      redirect(`/courses/${course.slug}?applied=1`);
    }
  }

  // Stripe public key + enabled providers + promo flag for the
  // optional checkout step. Mirrors the data shape /checkout uses.
  const enabledProviders = (
    await prisma.paymentProvider.findMany({
      where: { enabled: true },
      select: { provider: true },
    })
  ).map((p) => p.provider);

  const promoEnabled =
    (await prisma.promoCode.count({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        AND: {
          OR: [{ applyToAll: true }, { courses: { some: { id: course.id } } }],
        },
      },
    })) > 0;

  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f5f7] py-10 px-5 md:px-10">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-[3px] text-maxxed-blue mb-2">
              Apply for
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-dark">
              {course.title}
            </h1>
            <p className="text-text-body mt-2 max-w-xl mx-auto">
              A few quick questions so Todd&rsquo;s team can pre-qualify you for this program.
            </p>
          </div>
          <ApplyWizardOnPlatform
            course={{
              id: course.id,
              title: course.title,
              slug: course.slug,
              price: course.price,
              checkoutAfterApply: course.checkoutAfterApply,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
