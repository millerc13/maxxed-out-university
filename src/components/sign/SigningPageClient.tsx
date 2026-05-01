'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/apply/ui/Button';
import {
  SignatureCaptureModal,
  type CapturedSignature,
} from '@/components/sign/SignatureCaptureModal';

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
  const router = useRouter();
  const [captured, setCaptured] = useState<CapturedSignature | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<SignSuccess | null>(null);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const canSubmit = !!captured && agreed && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !captured) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sign/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typedName: captured.typedName,
          signaturePng: captured.pngDataUrl,
          signatureMode: captured.mode,
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
      router.refresh();
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
          Signed — thank you, {captured?.typedName.split(' ')[0]}.
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
    <>
      <section className="mt-8 card-solid p-6 sm:p-10 border border-border">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Sign this agreement</h2>
        <p className="text-sm text-gray-500 mb-6">
          Signing as <span className="font-medium text-gray-700">{recipientEmail}</span>
        </p>

        <div className="space-y-5">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Your signature
            </span>
            {captured ? (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <img
                  src={captured.pngDataUrl}
                  alt="Adopted signature preview"
                  className="h-16 sm:h-20 w-auto bg-white rounded-md border border-gray-100 px-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {captured.typedName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {captured.mode === 'drawn' ? 'Drawn signature' : 'Typed signature'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="text-sm font-semibold text-maxxed-blue hover:text-blue-700"
                  disabled={submitting}
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={submitting}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-maxxed-blue hover:bg-blue-50/40 transition-colors group"
              >
                <span className="block font-bold text-gray-900 group-hover:text-maxxed-blue">
                  Click here to sign
                </span>
                <span className="block text-sm text-gray-500 mt-0.5">
                  Type your name or draw your signature
                </span>
              </button>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Date
            </span>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-base text-gray-900">
              {todayLabel}
            </div>
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
              I have read and agree to the terms above. I understand that adopting
              this signature and clicking <strong>Sign Agreement</strong> constitutes
              my legal signature.
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
            type="button"
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {submitting ? 'Signing…' : 'Sign Agreement'}
          </Button>
        </div>
      </section>

      <SignatureCaptureModal
        open={modalOpen}
        initialName={captured?.typedName || recipientName}
        recipientEmail={recipientEmail}
        onCancel={() => setModalOpen(false)}
        onAdopt={(sig) => {
          setCaptured(sig);
          setModalOpen(false);
        }}
      />
    </>
  );
}
