'use client';

import { useState } from 'react';
import { Button } from '@/components/apply/ui/Button';
import { Input, Label } from '@/components/apply/ui/Input';

interface Props {
  token: string;
  recipientEmail: string;
  recipientName: string;
  courseTitle: string;
}

interface SignSuccess {
  ok: true;
  downloadUrl: string;
}

interface SignError {
  ok: false;
  error: string;
}

export function SigningPageClient({
  token,
  recipientEmail,
  recipientName,
  courseTitle,
}: Props) {
  const [typedName, setTypedName] = useState(recipientName);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<SignSuccess | null>(null);

  const trimmedName = typedName.trim();
  const canSubmit = trimmedName.length >= 2 && agreed && !submitting;
  const todayLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/sign/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typedName: trimmedName,
          screenW: typeof window !== 'undefined' ? window.innerWidth : null,
          screenH: typeof window !== 'undefined' ? window.innerHeight : null,
          tz:
            typeof Intl !== 'undefined'
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : null,
        }),
      });

      const data = (await res.json()) as SignSuccess | SignError;
      if (!res.ok || !('ok' in data) || !data.ok) {
        setErrorMsg(
          ('error' in data && data.error) ||
            'We could not record your signature. Please try again or email support@maxxedout.com.',
        );
        setSubmitting(false);
        return;
      }
      setSuccess(data);
    } catch (err) {
      console.error('[sign] submit failed', err);
      setErrorMsg(
        'Network error — your signature did not go through. Check your connection and try again.',
      );
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="mt-8 card-solid p-6 sm:p-10 border border-border text-center">
        <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-green-100 text-green-700 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Signed — thank you, {trimmedName.split(' ')[0]}.
        </h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          A signed copy of your {courseTitle} agreement has been emailed to{' '}
          <span className="font-medium text-gray-900">{recipientEmail}</span>. You can
          download it below for your records.
        </p>
        <Button asChild variant="primary" size="lg">
          <a href={success.downloadUrl} download>
            Download signed copy (PDF)
          </a>
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-8 card-solid p-6 sm:p-10 border border-border">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Sign this agreement</h2>
      <p className="text-sm text-gray-500 mb-6">
        Signing as <span className="font-medium text-gray-700">{recipientEmail}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="typedName">Type your full legal name</Label>
          <Input
            id="typedName"
            type="text"
            autoComplete="name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="First Last"
            required
            disabled={submitting}
          />
        </div>

        <div>
          <Label htmlFor="signedDate">Date</Label>
          <Input id="signedDate" type="text" value={todayLabel} readOnly disabled />
        </div>

        <label className="flex gap-3 items-start text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={submitting}
            className="mt-1 w-4 h-4 accent-maxxed-blue cursor-pointer"
          />
          <span>
            I have read and agree to the terms above. I understand that typing my name
            and clicking <strong>Sign Agreement</strong> constitutes my legal
            signature.
          </span>
        </label>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMsg}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Signing…' : 'Sign Agreement'}
        </Button>
      </form>
    </section>
  );
}
