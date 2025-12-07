'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const errorMessages: Record<string, { title: string; description: string }> = {
  missing_token: {
    title: 'Missing Token',
    description: 'The sign-in link is incomplete. Please request a new one.',
  },
  invalid_token: {
    title: 'Invalid Link',
    description: 'This sign-in link is invalid. It may have been copied incorrectly.',
  },
  token_used: {
    title: 'Link Already Used',
    description: 'This sign-in link has already been used. Please request a new one.',
  },
  token_expired: {
    title: 'Link Expired',
    description: 'This sign-in link has expired. Please request a new one.',
  },
  server_error: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
  },
  default: {
    title: 'Sign In Error',
    description: 'There was a problem signing you in. Please try again.',
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') || 'default';
  const error = errorMessages[errorCode] || errorMessages.default;

  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <CardTitle className="text-2xl">{error.title}</CardTitle>
        <CardDescription className="text-base mt-2">
          {error.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full bg-maxxed-blue hover:bg-maxxed-blue-dark">
          <Link href="/login">Try Again</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Go Home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <ErrorContent />
    </Suspense>
  );
}
