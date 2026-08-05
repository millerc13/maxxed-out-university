'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, LayoutGrid } from 'lucide-react';

type Widget = {
  id: string;
  title: string;
  description: string;
  suggestedHeight: number;
  url: string;
};

export function EmbedWidgetsClient({ widgets }: { widgets: Widget[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const iframeSnippet = (w: Widget) =>
    `<iframe src="${w.url}" style="width:100%;height:${w.suggestedHeight}px;border:0;border-radius:12px;" loading="lazy"></iframe>`;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Embed Widgets</h1>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Live dashboard widgets for GoHighLevel. In GHL: Dashboard → Add Widget →{' '}
        <b>Custom Widget → iFrame</b>, then paste a URL below. Links carry their own
        access key — treat them like passwords. Data refreshes every 5 minutes.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {widgets.map((w) => (
          <div key={w.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{w.title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{w.description}</p>
              </div>
              <a
                href={w.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground"
                title="Open widget"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2 py-1.5 text-[11px]">
                {w.url}
              </code>
              <button
                onClick={() => copy(`url-${w.id}`, w.url)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {copied === `url-${w.id}` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                URL
              </button>
              <button
                onClick={() => copy(`iframe-${w.id}`, iframeSnippet(w))}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {copied === `iframe-${w.id}` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                iframe
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
