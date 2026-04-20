import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout';
import Link from 'next/link';
import { CheckCircle, BookOpen, Mail, ArrowRight } from 'lucide-react';

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
  let courseSlug = courseSlugParam ?? null;
  let resolvedProductName = product_name ?? null;
  if (!courseSlug && courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true, title: true },
    });
    if (course) {
      courseSlug = course.slug;
      if (!resolvedProductName) resolvedProductName = course.title;
    }
  }

  const firstName = (name ?? '').trim().split(/\s+/)[0] || null;
  const productName = resolvedProductName;
  const amount = formatAmount(product_price);

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div
      className="w-full max-w-[560px] bg-white rounded-2xl shadow-xl overflow-hidden"
      style={{ borderTop: '4px solid #D4AF37' }}
    >
      {children}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <>
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
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}
