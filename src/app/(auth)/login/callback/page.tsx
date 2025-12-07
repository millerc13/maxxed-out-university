'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const needsPassword = searchParams.get('needsPassword') === 'true';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const completeSignIn = async () => {
      if (!userId) {
        setStatus('error');
        return;
      }

      try {
        const result = await signIn('credentials', {
          email: 'magic-link-verified',
          password: userId,
          redirect: false,
        });

        if (result?.error) {
          if (needsPassword && email) {
            router.push(`/setup-password?email=${encodeURIComponent(email)}&userId=${userId}`);
            return;
          }
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 1500);
          return;
        }

        if (needsPassword && email) {
          router.push(`/setup-password?email=${encodeURIComponent(email)}&userId=${userId}`);
          return;
        }

        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      } catch (error) {
        console.error('Callback error:', error);
        if (needsPassword && email) {
          router.push(`/setup-password?email=${encodeURIComponent(email)}&userId=${userId}`);
          return;
        }
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    };

    completeSignIn();
  }, [userId, email, needsPassword, router]);

  if (status === 'error') {
    router.push('/login/error?error=server_error');
    return null;
  }

  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader className="text-center">
        {status === 'loading' ? (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-maxxed-blue animate-spin" />
            </div>
            <CardTitle className="text-2xl">Signing you in...</CardTitle>
            <CardDescription className="text-base mt-2">
              Please wait while we complete your sign in.
            </CardDescription>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome back!</CardTitle>
            <CardDescription className="text-base mt-2">
              Redirecting you to your dashboard...
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-text-muted">
          You&apos;ll be redirected automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-maxxed-blue animate-spin" />
          </div>
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <CallbackContent />
    </Suspense>
  );
}
