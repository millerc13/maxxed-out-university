import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout';
import Link from 'next/link';
import { CheckCircle, BookOpen, Mail, ArrowRight, PhoneCall, Calendar as CalendarIcon } from 'lucide-react';
import { MetaPixelLoader } from '@/components/MetaPixelLoader';

interface SuccessPageProps {
  searchParams: Promise<{
    courseSlug?: string;
    courseId?: string;
    payment_intent?: string;
    existing?: string;
    provider?: string;
    // Fanbasis redirect params
    email?: string;
    name?: string;
    product_name?: string;
    product_price?: string;
  }>;
}

// Courses where the buyer's next step is a 1:1 onboarding call, not
// self-serve course access. The success screen shows team-will-reach-out
// copy for these instead of the standard "check your email" / "go to course".
const HIGH_TICKET_SLUGS = new Set([
  'done-with-you-real-estate-business',
  '6-month-mentorship',
]);

function formatAmount(priceStr: string | undefined): string | null {
  if (!priceStr) return null;
  const num = Number(priceStr);
  if (!Number.isFinite(num)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const session = await auth();
  const params = await searchParams;
  const { courseSlug: courseSlugParam, courseId, existing, email, name, product_name, product_price } = params;
  const isAuthenticated = !!session?.user?.id;
  const isExistingUser = existing === '1';

  // Fanbasis's success redirect doesn't include courseSlug — resolve it from courseId.
  // Also pull metaPixelId so this surface fires Purchase to Meta.
  let courseSlug = courseSlugParam ?? null;
  let resolvedProductName = product_name ?? null;
  let metaPixelId: string | null = null;
  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true, title: true, metaPixelId: true },
    });
    if (course) {
      if (!courseSlug) courseSlug = course.slug;
      if (!resolvedProductName) resolvedProductName = course.title;
      metaPixelId = course.metaPixelId;
    }
  } else if (courseSlug) {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { title: true, metaPixelId: true },
    });
    if (course) {
      if (!resolvedProductName) resolvedProductName = course.title;
      metaPixelId = course.metaPixelId;
    }
  }

  const firstName = (name ?? '').trim().split(/\s+/)[0] || null;
  const productName = resolvedProductName;
  const amount = formatAmount(product_price);
  const isHighTicket = courseSlug ? HIGH_TICKET_SLUGS.has(courseSlug) : false;
  const purchaseValue = product_price ? Number(product_price) : null;
  const purchaseEvent =
    metaPixelId && courseSlug && Number.isFinite(purchaseValue) && (purchaseValue ?? 0) > 0
      ? {
          event: 'Purchase' as const,
          params: {
            value: purchaseValue!,
            currency: 'USD',
            content_ids: [courseSlug],
            content_name: productName ?? courseSlug,
            content_type: 'product' as const,
            num_items: 1,
          },
          // Use the Stripe/Fanbasis transaction ID (in payment_intent
          // search param) as the dedup key so the matching server-side
          // CAPI Purchase fired from the webhook collapses with this hit.
          eventId: params.payment_intent || undefined,
        }
      : undefined;

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div
      className="w-full max-w-[560px] bg-white rounded-2xl shadow-xl overflow-hidden"
      style={{ borderTop: '4px solid #D4AF37' }}
    >
      {children}
    </div>
  );

  // Mounted once at the top of every variant render so PageView + Purchase
  // fire regardless of which success template (high-ticket vs self-serve)
  // ends up showing. No-op when metaPixelId is null.
  const pixel = <MetaPixelLoader pixelId={metaPixelId} additionalEvent={purchaseEvent} />;

  // ── High-ticket purchase (DWY / Mentorship) ───────────────────────────────
  // No "log in and start the course" — onboarding happens via a call.
  if (isHighTicket) {
    return (
      <>
        {pixel}
        <Header />
        <main className="min-h-[calc(100vh-96px)] flex items-start justify-center px-4 py-10 sm:py-16" style={{ background: '#f4f6fa' }}>
          <Card>
            <div className="p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-11 h-11 text-green-600" strokeWidth={2.5} />
              </div>

              <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: '#D4AF37' }}>
                Maxxed Out University
              </p>
              <h1 className="font-black text-2xl sm:text-3xl mb-3" style={{ color: '#0c1829' }}>
                {firstName ? `Thank you, ${firstName}!` : 'Thank you!'}
              </h1>

              {productName && (
                <div className="inline-flex items-baseline gap-2 mb-6 px-4 py-2 rounded-lg" style={{ background: 'rgba(0,0,255,0.04)' }}>
                  <span className="text-sm font-semibold text-gray-700">{productName}</span>
                  {amount && (
                    <span className="text-sm font-black" style={{ color: '#0000FF' }}>{amount}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 font-semibold mb-3" style={{ color: '#0000FF' }}>
                <PhoneCall className="w-5 h-5" />
                <span>Someone from our team will reach out soon</span>
              </div>

              <p className="text-gray-500 leading-relaxed mb-2 max-w-sm mx-auto">
                Your payment is confirmed and a member of Todd&apos;s team will reach out within
                one business day to schedule your onboarding call and get you set up.
              </p>
              {email && (
                <p className="text-gray-400 text-sm mb-8">
                  Confirmation sent to{' '}
                  <span className="font-semibold text-gray-600">{email}</span>
                </p>
              )}
              {!email && <div className="mb-6" />}

              <div className="flex items-center justify-center gap-2 text-[12px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-2">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>What to expect</span>
              </div>
              <ul className="text-left text-sm text-gray-600 space-y-1.5 max-w-sm mx-auto mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#0000FF' }} />
                  <span>Receipt + welcome email within minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#0000FF' }} />
                  <span>Personal outreach from our team within one business day</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#0000FF' }} />
                  <span>Onboarding call scheduled to map out your first 30 days</span>
                </li>
              </ul>

              <p className="text-[11px] text-gray-400">
                Questions in the meantime? Reply to your confirmation email and we&apos;ll get back fast.
              </p>
            </div>
          </Card>
        </main>
      </>
    );
  }

  // ── Standard self-serve purchase (Blueprint, individual courses) ──────────
  if (!isAuthenticated) {
    return (
      <>
        {pixel}
        <Header />
        <main className="min-h-[calc(100vh-96px)] flex items-start justify-center px-4 py-10 sm:py-16" style={{ background: '#f4f6fa' }}>
          <Card>
            <div className="p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-11 h-11 text-green-600" strokeWidth={2.5} />
              </div>

              <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: '#D4AF37' }}>
                Maxxed Out University
              </p>
              <h1 className="font-black text-2xl sm:text-3xl mb-3" style={{ color: '#0c1829' }}>
                {firstName ? `Thanks, ${firstName}!` : 'Payment received!'}
              </h1>

              {productName && (
                <div className="inline-flex items-baseline gap-2 mb-6 px-4 py-2 rounded-lg" style={{ background: 'rgba(0,0,255,0.04)' }}>
                  <span className="text-sm font-semibold text-gray-700">{productName}</span>
                  {amount && (
                    <span className="text-sm font-black" style={{ color: '#0000FF' }}>{amount}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 font-semibold mb-3" style={{ color: '#0000FF' }}>
                <Mail className="w-5 h-5" />
                <span>Check your email</span>
              </div>

              <p className="text-gray-500 leading-relaxed mb-2 max-w-sm mx-auto">
                {isExistingUser ? (
                  <>We&apos;ve added this course to your existing account. Sign in with your password — we also sent you a login link at your inbox.</>
                ) : (
                  <>We sent a link to set up your Maxxed Out University account. Click the button in the email to set a password and unlock your course.</>
                )}
              </p>
              {email && (
                <p className="text-gray-400 text-sm mb-8">
                  Sent to <span className="font-semibold text-gray-600">{email}</span>
                </p>
              )}
              {!email && <div className="mb-6" />}

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-white font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-opacity hover:opacity-90"
                style={{ background: '#0000FF' }}
              >
                Go to sign in
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-[11px] text-gray-400 mt-6">
                Didn&apos;t get the email? Check spam, or{' '}
                <Link href="/forgot-password" className="underline hover:text-gray-600">request a new link</Link>.
              </p>
            </div>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      {pixel}
      <Header />
      <main className="min-h-[calc(100vh-96px)] flex items-start justify-center px-4 py-10 sm:py-16" style={{ background: '#f4f6fa' }}>
        <Card>
          <div className="p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-11 h-11 text-green-600" strokeWidth={2.5} />
            </div>

            <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: '#D4AF37' }}>
              Maxxed Out University
            </p>
            <h1 className="font-black text-2xl sm:text-3xl mb-3" style={{ color: '#0c1829' }}>
              You&apos;re enrolled!
            </h1>

            {productName && (
              <div className="inline-flex items-baseline gap-2 mb-6 px-4 py-2 rounded-lg" style={{ background: 'rgba(0,0,255,0.04)' }}>
                <span className="text-sm font-semibold text-gray-700">{productName}</span>
                {amount && (
                  <span className="text-sm font-black" style={{ color: '#0000FF' }}>{amount}</span>
                )}
              </div>
            )}

            <p className="text-gray-500 leading-relaxed mb-8 max-w-sm mx-auto">
              Your payment was successful. You now have full access to the course. It may take a moment for access to activate.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {courseSlug && (
                <Link
                  href={`/courses/${courseSlug}`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-opacity hover:opacity-90"
                  style={{ background: '#0000FF' }}
                >
                  <BookOpen className="w-4 h-4" />
                  Go to Course
                </Link>
              )}
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-8 py-4 border border-gray-200 text-gray-700 font-black text-[12px] tracking-[0.15em] uppercase rounded-xl hover:bg-gray-50 transition-colors"
              >
                My Courses
              </Link>
              <a
                href={
                  process.env.NEXT_PUBLIC_CALENDLY_URL ||
                  'https://calendly.com/rebecca-nardi/maxxed-out-todd-pultz-mentorship-healthcare'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-gray-200 text-gray-700 font-black text-[12px] tracking-[0.15em] uppercase rounded-xl hover:bg-gray-50 transition-colors"
              >
                <CalendarIcon className="w-4 h-4" />
                Book a Call
              </a>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}
