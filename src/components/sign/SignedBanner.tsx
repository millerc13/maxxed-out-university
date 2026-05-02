'use client';

import { useState } from 'react';
import { Check, Download, Loader2, AlertCircle } from 'lucide-react';

/**
 * Post-sign success banner with a Download PDF button. Renders both
 * at the top and bottom of the signed contract page.
 *
 * Download uses a Blob fetch instead of a direct <a download href> so
 * we can detect server errors (e.g. transient chromium ETXTBSY) BEFORE
 * the browser saves a corrupt JSON-as-PDF file. On failure we surface
 * the error inline + offer a Try again instead of handing the user a
 * file they can't open. Same Blob-URL trick keeps it PWA-friendly on
 * iOS standalone (no jumping out of the app).
 */
export function SignedBanner({
  signedName,
  signedDateStr,
  downloadUrl,
}: {
  signedName: string;
  signedDateStr: string;
  downloadUrl: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(downloadUrl, { credentials: 'include' });
      if (!res.ok) {
        // Try to surface the route's JSON error message rather than a generic one.
        let detail = `${res.status} ${res.statusText}`;
        try {
          const json = await res.json();
          if (json?.error) detail = String(json.error);
        } catch {
          /* response wasn't JSON — keep the status text */
        }
        throw new Error(detail);
      }
      const blob = await res.blob();
      // Sanity check: real PDFs start with %PDF. If the body is something
      // else (HTML error page, JSON), bail before downloading.
      const head = await blob.slice(0, 5).text();
      if (!head.startsWith('%PDF')) {
        throw new Error("That's not a valid PDF — server error. Please try again in a moment.");
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'signed-agreement.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
            <Check className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">
              Signed by {signedName}
            </p>
            <p className="text-xs text-green-700">on {signedDateStr}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-maxxed-blue px-4 h-11 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-offset-2"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download PDF
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="break-words">{error}</p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-1 font-bold underline hover:no-underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
