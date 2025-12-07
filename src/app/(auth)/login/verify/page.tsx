import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyPage() {
  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-maxxed-blue" />
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription className="text-base mt-2">
          A sign-in link has been sent to your email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-text-muted">
          Click the link in the email to complete your sign in. The link will expire in 15 minutes.
        </p>
        <p className="text-sm text-text-muted">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <Link href="/login" className="text-maxxed-blue hover:underline">
            try again
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
