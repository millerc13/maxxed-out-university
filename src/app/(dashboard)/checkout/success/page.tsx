import { auth } from '@/lib/auth';
import { Header } from '@/components/layout';
import Link from 'next/link';
import { CheckCircle, BookOpen, Mail } from 'lucide-react';

interface SuccessPageProps {
  searchParams: Promise<{ courseSlug?: string; payment_intent?: string; existing?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const session = await auth();
  const { courseSlug, existing } = await searchParams;
  const isAuthenticated = !!session?.user?.id;
  const isExistingUser = existing === '1';

  // Anonymous purchaser — show "check your email" copy. Webhook creates the user
  // and sends a magic link; there's no session yet.
  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-text-dark mb-2">Payment received!</h1>
            <div className="flex items-center justify-center gap-2 text-maxxed-blue font-semibold mb-4">
              <Mail className="w-5 h-5" />
              <span>Check your email</span>
            </div>
            <p className="text-text-muted mb-8">
              {isExistingUser ? (
                <>We&apos;ve added this course to your existing account. Sign in to start learning — the email will land in your inbox shortly.</>
              ) : (
                <>We sent you a link to set up your Maxxed Out University account. Click the link in the email to set a password and access your course.</>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-6 py-3 bg-maxxed-blue text-white font-bold rounded-lg hover:bg-maxxed-blue-dark transition-colors"
              >
                Go to sign in
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-text-dark mb-2">You&apos;re enrolled!</h1>
          <p className="text-text-muted mb-8">
            Your payment was successful. You now have full access to the course.
            {' '}It may take a moment for access to activate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {courseSlug && (
              <Link
                href={`/courses/${courseSlug}`}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-maxxed-blue text-white font-bold rounded-lg hover:bg-maxxed-blue-dark transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Go to Course
              </Link>
            )}
            <Link
              href="/courses"
              className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              My Courses
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
