import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ContractDisplay } from '@/components/sign/ContractDisplay';
import { SigningPageClient } from '@/components/sign/SigningPageClient';
import { fillClientSignature } from '@/lib/esign-render';
import { signDownloadToken } from '@/lib/esign-tokens';

// Public, no-auth signing page. The signingToken in the URL is the
// only credential — it's a 32-byte random hex value that's revoked
// at sign time, so URL leak after signing is harmless.
//
// Mounts the contract HTML (snapshotted at send time, never mutated)
// and the signing form. On first GET we mark `firstViewedAt` and
// flip status from 'sent' → 'viewed' so the admin sees engagement.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SignPage({ params }: PageProps) {
  const { token } = await params;
  if (!token) notFound();

  // Try the active signing-token path first. Falls back to looking up
  // ANY doc (regardless of token state) further down for completed
  // recipients revisiting their sign URL after the token was revoked.
  const doc = await prisma.documentSignature.findUnique({
    where: { signingToken: token },
    select: {
      id: true,
      status: true,
      recipientEmail: true,
      recipientName: true,
      courseTitle: true,
      renderedHtml: true,
      signingTokenExpiresAt: true,
      firstViewedAt: true,
      auditEvents: true,
      signedName: true,
      signedAt: true,
      signedSignaturePng: true,
    },
  });

  if (!doc) {
    return <ExpiredOrSignedState reason="not-found" />;
  }
  if (doc.status === 'cancelled') {
    return <ExpiredOrSignedState reason="cancelled" />;
  }
  if (doc.status === 'declined') {
    return <ExpiredOrSignedState reason="declined" />;
  }

  // Already-signed: render the FILLED contract + a download CTA.
  // No more "you already signed" dead-end — the recipient sees their
  // own signed copy. Safe because they have the original signing-URL
  // (now revoked but still in their email) which is functionally a
  // shared secret tied to their email address.
  if (doc.status === 'completed' && doc.signedName && doc.signedAt) {
    const signedDateStr = doc.signedAt.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    const filledHtml = fillClientSignature(doc.renderedHtml, {
      name: doc.signedName,
      date: signedDateStr,
      signaturePng: doc.signedSignaturePng,
    });
    const downloadToken = signDownloadToken(doc.id, 60 * 60 * 24 * 365);
    return (
      <main className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <SignedBanner
            signedName={doc.signedName}
            signedDateStr={signedDateStr}
            downloadUrl={`/api/sign/${encodeURIComponent(downloadToken)}/pdf`}
          />
          <ContractDisplay
            renderedHtml={filledHtml}
            letterheadMeta={doc.courseTitle}
          />
          {/* Mirror the SignedBanner at the bottom so the recipient
              can hit Download right after scrolling to the end of
              the contract — no need to scroll back up to the top. */}
          <div className="mt-6">
            <SignedBanner
              signedName={doc.signedName}
              signedDateStr={signedDateStr}
              downloadUrl={`/api/sign/${encodeURIComponent(downloadToken)}/pdf`}
            />
          </div>
        </div>
      </main>
    );
  }

  if (doc.signingTokenExpiresAt && doc.signingTokenExpiresAt < new Date()) {
    return <ExpiredOrSignedState reason="expired" />;
  }
  if (doc.status !== 'sent' && doc.status !== 'viewed') {
    return <ExpiredOrSignedState reason="not-found" />;
  }

  // Track the first view. Single update so we don't double-write
  // viewed events if the recipient opens the page twice.
  if (!doc.firstViewedAt) {
    const hdrs = await headers();
    const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
    const ua = hdrs.get('user-agent') || null;
    const events = Array.isArray(doc.auditEvents) ? doc.auditEvents : [];
    await prisma.documentSignature.update({
      where: { id: doc.id },
      data: {
        firstViewedAt: new Date(),
        status: 'viewed',
        auditEvents: [
          ...events,
          { type: 'viewed', at: new Date().toISOString(), ip, ua },
        ],
      },
    });
  }

  // Replace the empty CLIENT signature span with an inline "Click to
  // sign" button so the recipient signs WITHIN Section 18, not below
  // the contract. Client-side, SigningPageClient mounts a delegated
  // click listener on [data-cta="sign"] to open the modal.
  const interactiveHtml = doc.renderedHtml.replace(
    /<span class="([^"]*\bsig-blank-signature\b[^"]*)"><\/span>/g,
    (_, cls) =>
      `<button type="button" class="${cls}" data-cta="sign" aria-label="Click to sign your name">Click to sign</button>`,
  );

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <ContractDisplay
          renderedHtml={interactiveHtml}
          letterheadMeta={doc.courseTitle}
        />
        <SigningPageClient
          token={token}
          recipientEmail={doc.recipientEmail}
          recipientName={doc.recipientName ?? ''}
          courseTitle={doc.courseTitle}
        />
      </div>
    </main>
  );
}

function SignedBanner({
  signedName,
  signedDateStr,
  downloadUrl,
}: {
  signedName: string;
  signedDateStr: string;
  downloadUrl: string;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
        <div>
          <p className="text-sm font-semibold text-green-900">
            Signed by {signedName}
          </p>
          <p className="text-xs text-green-700">on {signedDateStr}</p>
        </div>
      </div>
      <a
        href={downloadUrl}
        download
        className="inline-flex items-center justify-center rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        Download PDF
      </a>
    </div>
  );
}

function ExpiredOrSignedState({
  reason,
}: {
  reason: 'not-found' | 'already-signed' | 'cancelled' | 'declined' | 'expired';
}) {
  const copy: Record<typeof reason, { title: string; body: string }> = {
    'not-found': {
      title: 'This signing link is no longer valid.',
      body:
        "The link may have been revoked or it doesn't match an active document. " +
        'If you were expecting to sign something, reply to the email that sent you here ' +
        'or contact support@maxxedout.com.',
    },
    'already-signed': {
      title: 'This document has already been signed.',
      body:
        'A signed copy was sent to your email. If you need it again, contact ' +
        'support@maxxedout.com and we can resend it.',
    },
    cancelled: {
      title: 'This document was cancelled.',
      body:
        'The team cancelled this signing request. If you believe this is an error, ' +
        'reach out to support@maxxedout.com.',
    },
    declined: {
      title: 'This document was declined.',
      body:
        'You previously declined to sign this document. To restart, contact ' +
        'support@maxxedout.com.',
    },
    expired: {
      title: 'This signing link has expired.',
      body:
        'For security, signing links expire after a set period. ' +
        'Email support@maxxedout.com and we can issue a fresh link.',
    },
  };
  const { title, body } = copy[reason];
  return (
    <main className="min-h-screen bg-gray-50 grid place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 leading-relaxed">{body}</p>
      </div>
    </main>
  );
}
