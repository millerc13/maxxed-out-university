'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function ActivateInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Activating your account…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid link — no token found.');
      return;
    }

    async function activate() {
      console.log('[activate] Starting magic link sign-in', { token: token?.slice(0, 8) + '...' });
      const result = await signIn('magiclink', {
        token,
        redirect: false,
        callbackUrl: '/dashboard',
      });
      console.log('[activate] signIn result', { ok: result?.ok, error: result?.error, status: result?.status });

      if (result?.ok && !result?.error) {
        setStatus('success');

        // Check if user needs to set password or already has one
        const session = await getSession();
        console.log('[activate] Session after sign-in', {
          userId: session?.user?.id,
          email: session?.user?.email,
          role: session?.user?.role,
          mustChangePassword: session?.user?.mustChangePassword,
        });

        if (session?.user?.mustChangePassword) {
          setMessage('Account activated! Setting up your password…');
          console.log('[activate] Redirecting to /setup-password (mustChangePassword=true)');
          setTimeout(() => router.push('/setup-password'), 1500);
        } else {
          setMessage('Welcome back! Redirecting to your dashboard…');
          console.log('[activate] Redirecting to /dashboard (mustChangePassword=false)');
          setTimeout(() => router.push('/dashboard'), 1500);
        }
      } else {
        console.error('[activate] Magic link sign-in failed', { ok: result?.ok, error: result?.error, url: result?.url });
        setStatus('error');
        setMessage('This link has expired or already been used. Please contact support.');
      }
    }

    activate();
  }, [token, router]);

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md shadow-card border-t-4 border-t-maxxed-blue overflow-hidden">
        <CardHeader className="text-center pt-8">
          <Loader2 className="w-12 h-12 animate-spin text-maxxed-blue mx-auto mb-4" />
          <CardTitle className="text-2xl font-extrabold">Activating…</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md shadow-card border-t-4 border-t-maxxed-blue overflow-hidden">
        <CardHeader className="text-center pt-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-extrabold">You&apos;re in!</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-card border-t-4 border-t-maxxed-blue overflow-hidden">
      <CardHeader className="text-center pt-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <CardTitle className="text-2xl font-extrabold">Link invalid</CardTitle>
        <CardDescription className="text-base mt-2">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button
          onClick={() => router.push('/login')}
          className="bg-maxxed-blue hover:bg-maxxed-blue-dark"
        >
          Go to Login
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md shadow-card border-t-4 border-t-maxxed-blue overflow-hidden">
        <CardHeader className="text-center pt-8">
          <Loader2 className="w-12 h-12 animate-spin text-maxxed-blue mx-auto" />
          <CardTitle className="text-2xl font-extrabold">Loading…</CardTitle>
        </CardHeader>
      </Card>
    }>
      <ActivateInner />
    </Suspense>
  );
}
