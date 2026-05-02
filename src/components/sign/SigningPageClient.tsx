'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

// Thin wrapper. Renders no visible UI of its own — the entire signing
// flow happens through:
//
//   (1) The "Click to sign" button that the server injected into
//       Section 18's empty client signature span. We listen for
//       clicks on [data-cta="sign"] and open the modal.
//
//   (2) The modal — type or draw the signature + agree to the terms
//       + tap Adopt. Adopting POSTs to /api/sign/[token] with the
//       captured PNG, success state inline, then router.refresh()
//       so the server re-renders Section 18 with the captured
//       signature image filled in via fillClientSignature.
//
// This way Section 18 IS the signing UI — no separate "Sign this
// agreement" card cluttering the bottom of the page.
export function SigningPageClient({
  token,
  recipientEmail,
  recipientName,
  courseTitle,
}: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delegated click listener for the server-injected "Click to sign"
  // button inside the contract. Survives DOM rewrites from
  // dangerouslySetInnerHTML — we listen on document, not on the
  // node itself.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cta = target.closest<HTMLElement>('[data-cta="sign"]');
      if (!cta) return;
      e.preventDefault();
      setErrorMsg(null);
      setModalOpen(true);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  async function handleAdopt(captured: CapturedSignature) {
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
      // Persisted successfully. Close the modal and re-fetch the page
      // — the server will re-render with status='completed' which
      // shows the green "Signed by …" banner + the filled Section 18.
      // sessionStorage flag tells ScrollToBottomAfterSign on the new
      // render to smooth-scroll to the bottom Download banner so the
      // user sees it without manually scrolling past the contract.
      try {
        sessionStorage.setItem('esign:justSigned', '1');
      } catch {
        /* private mode — scroll won't fire, no big deal */
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error('[sign] submit failed', err);
      setErrorMsg(
        'Network error — your signature did not go through. Check your connection and try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-3xl mx-auto"
        >
          {errorMsg}
        </div>
      )}
      <SignatureCaptureModal
        open={modalOpen}
        initialName={recipientName}
        recipientEmail={recipientEmail}
        requireAgreement
        submitting={submitting}
        onCancel={() => {
          if (submitting) return;
          setModalOpen(false);
        }}
        onAdopt={handleAdopt}
      />
      {/* courseTitle prop is reserved for future "Adopting signature for {courseTitle}" copy in the modal. */}
      <span className="hidden">{courseTitle}</span>
    </>
  );
}
