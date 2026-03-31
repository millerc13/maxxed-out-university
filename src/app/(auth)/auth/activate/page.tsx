'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';

export default function ActivatePage() {
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
      const result = await signIn('magiclink', {
        token,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.ok && !result?.error) {
        setStatus('success');
        setMessage('Account activated! Taking you to your dashboard…');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setStatus('error');
        setMessage('This link has expired or already been used. Please contact support.');
      }
    }

    activate();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border-t-4 border-maxxed-blue">
        <Image
          src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
          alt="Maxxed Out University"
          width={160}
          height={63}
          className="h-10 w-auto mx-auto mb-8"
          unoptimized
        />

        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-maxxed-blue mx-auto mb-4" />
            <p className="text-gray-700 font-medium">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're in!</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link invalid</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-maxxed-blue text-white rounded-lg font-semibold text-sm hover:opacity-90"
            >
              Go to Login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
