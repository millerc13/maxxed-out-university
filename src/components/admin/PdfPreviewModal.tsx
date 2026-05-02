'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, Download, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker — pinned CDN URL matching the pdfjs-dist version
// shipped with our installed react-pdf. Hosting on cdnjs avoids
// shipping a large worker bundle ourselves and avoids Turbopack
// import.meta.url quirks.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewModalProps {
  url: string;        // API endpoint that returns the PDF bytes
  filename?: string;  // suggested download filename
  title?: string;     // modal title (e.g. recipient + course)
  onClose: () => void;
}

/**
 * In-app PDF preview. Renders the PDF inline via pdf.js so the admin
 * never navigates away from the dashboard. Critical for PWA users on
 * iOS where `window.open(.pdf)` either jumps out of the standalone
 * app entirely or strands them on a stuck page with no back button.
 *
 * Download is a real Blob URL → `<a download>` click → triggers the
 * native save dialog without leaving the PWA shell.
 */
export function PdfPreviewModal({ url, filename = 'document.pdf', title, onClose }: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageWidth, setPageWidth] = useState<number>(680);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch as Blob → URL.createObjectURL so Download is offline-capable
  // and stays inside the PWA. Also gives us a stable URL react-pdf can
  // hold without re-fetching on every render.
  useEffect(() => {
    let mounted = true;
    let createdUrl: string | null = null;
    setError(null);
    setBlobUrl(null);
    fetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`PDF fetch failed (${res.status}): ${text.slice(0, 200)}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (!mounted) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      mounted = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  // Esc closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setPageIndex((p) => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setPageIndex((p) => Math.min(pageCount || 1, p + 1));
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, pageCount]);

  // Match the page width to the container so PDF pages always fit
  // horizontally on whatever device opened it. Re-measure on resize +
  // orientation change.
  useEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth ?? 680;
      // Cap at a comfortable reading width on huge screens.
      setPageWidth(Math.min(900, w - 24));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [blobUrl]);

  function handleDownload() {
    if (!blobUrl) return;
    // Programmatically click an <a download> with the blob URL — this
    // triggers the native save flow inside the PWA shell. No navigation
    // away, no stranded standalone window.
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col sm:p-4 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="PDF preview"
      onClick={onClose}
    >
      <div
        className="relative bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:max-w-3xl sm:max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 h-14 border-b border-gray-200 bg-white">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900 truncate">{title || 'Document'}</p>
            {pageCount > 0 && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                Page {pageIndex} of {pageCount}
              </p>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={!blobUrl}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-maxxed-blue hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 focus-visible:ring-offset-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={onClose}
            className="shrink-0 p-2 -mr-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center py-3">
          {error ? (
            <div className="m-auto max-w-sm bg-white rounded-xl ring-1 ring-red-200 px-4 py-5 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">Couldn&rsquo;t load PDF</p>
              <p className="text-[12px] text-gray-500 mt-1 break-all">{error}</p>
            </div>
          ) : !blobUrl ? (
            <div className="m-auto flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-[12px] font-semibold">Generating PDF…</p>
              <p className="text-[10px] text-gray-400">First load can take ~10s while Chromium warms up.</p>
            </div>
          ) : (
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages }) => {
                setPageCount(numPages);
                setPageIndex(1);
              }}
              onLoadError={(err) => setError(err.message)}
              loading={
                <div className="flex flex-col items-center gap-2 text-gray-500 py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-[12px] font-semibold">Rendering…</p>
                </div>
              }
            >
              <Page
                pageNumber={pageIndex}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="shadow-md rounded overflow-hidden bg-white"
              />
            </Document>
          )}
        </div>

        {/* Page nav footer */}
        {pageCount > 1 && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 h-14 border-t border-gray-200 bg-white">
            <button
              onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
              disabled={pageIndex <= 1}
              className="inline-flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-lg bg-gray-50 hover:bg-gray-100 ring-1 ring-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-[13px] font-semibold text-gray-700 tabular-nums">
              {pageIndex} / {pageCount}
            </p>
            <button
              onClick={() => setPageIndex((p) => Math.min(pageCount, p + 1))}
              disabled={pageIndex >= pageCount}
              className="inline-flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-lg bg-gray-50 hover:bg-gray-100 ring-1 ring-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
