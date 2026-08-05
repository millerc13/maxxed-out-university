import type { ReactNode } from 'react';
import { AutoRefresh } from './AutoRefresh';

/**
 * Frame for every embed widget: compact header with title + live
 * timestamp, content below. Designed to sit inside a GHL custom-widget
 * iframe — no site chrome, no nav, fluid width.
 */
export function EmbedShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const updated = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-3 sm:p-4">
      <AutoRefresh minutes={5} />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-[#1F2937] sm:text-lg">{title}</h1>
          {subtitle ? <p className="text-xs text-[#6B7280]">{subtitle}</p> : null}
        </div>
        <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#6B7280] shadow-sm">
          Updated {updated} ET
        </div>
      </div>
      {children}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white p-3 shadow-sm sm:p-4 ${className}`}>
      {title ? (
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}

export function EmbedDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] p-6">
      <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-[#1F2937]">Invalid embed link</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          This widget needs a valid <code>?k=</code> key. Copy the full URL from
          Admin &rarr; Embed Widgets in Maxxed Out University.
        </p>
      </div>
    </div>
  );
}
