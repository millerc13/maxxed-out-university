'use client';

import { useState } from 'react';
import {
  Settings,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface Funnel {
  id: string;
  name: string;
  subdomain: string | null;
  apiKey: string;
}

interface Props {
  funnels: Funnel[];
  lastLeadAt: string | null;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function FunnelIntegrationSettings({ funnels: initialFunnels, lastLeadAt }: Props) {
  const [funnels, setFunnels] = useState<Funnel[]>(initialFunnels);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Any active funnel's key authenticates the funnel→LMS call; the LMS
  // attributes the lead by `source` subdomain separately. So there is
  // ONE canonical value to put in Vercel — we surface the first one.
  const canonical = funnels[0] ?? null;

  const healthy =
    lastLeadAt != null &&
    Date.now() - new Date(lastLeadAt).getTime() < 24 * 60 * 60 * 1000;

  async function copyKey(id: string, key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
    } catch {
      setError('Clipboard blocked — reveal the key and copy manually.');
    }
  }

  async function rotate(id: string, name: string) {
    if (
      !confirm(
        `Rotate the API key for "${name}"?\n\nThe old key stops working immediately. If this is the key set as FUNNEL_API_KEY in Vercel, leads will stop firing until you update Vercel with the new key and redeploy.`
      )
    )
      return;
    setRotatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funnels/${id}/rotate-key`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Rotate failed');
      setFunnels((prev) =>
        prev.map((f) => (f.id === id ? { ...f, apiKey: json.apiKey } : f))
      );
      setRevealed((r) => ({ ...r, [id]: true }));
    } catch (e: any) {
      setError(e.message || 'Rotate failed');
    } finally {
      setRotatingId(null);
    }
  }

  function mask(key: string) {
    return `${key.slice(0, 6)}${'•'.repeat(Math.max(key.length - 6, 0))}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-maxxed-blue" />
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Funnel integration — the shared secret that lets the funnel app
          notify this site when a lead applies.
        </p>
      </div>

      {/* Health */}
      <div
        className={`rounded-xl border shadow-sm p-4 flex items-start gap-3 ${
          healthy
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-amber-300 bg-amber-50/70'
        }`}
      >
        {healthy ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-bold text-sm text-gray-900">
            {healthy
              ? 'Funnel integration healthy'
              : 'No lead alerts received recently'}
          </p>
          <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">
            {lastLeadAt
              ? `Last lead alert delivered ${relativeTime(lastLeadAt)}.`
              : 'No lead alert has ever been delivered.'}{' '}
            {!healthy && (
              <>
                If leads are coming in but nothing fires here, the most
                likely cause is <span className="font-mono">FUNNEL_API_KEY</span>{' '}
                missing or wrong in the funnel&apos;s Vercel Production env
                (see steps below).
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* What to set in Vercel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-maxxed-blue" />
            The one key to set in Vercel
          </h2>
          <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
            You don&apos;t generate this — every funnel gets a key
            automatically when it&apos;s created. The funnel app needs{' '}
            <span className="font-mono">exactly one</span> of them as its{' '}
            <span className="font-mono">FUNNEL_API_KEY</span>. Any active
            funnel&apos;s key below works; the lead is still attributed to
            the right funnel by its subdomain.
          </p>
        </div>

        {canonical ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                FUNNEL_API_KEY value (from &ldquo;{canonical.name}&rdquo;)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-800 break-all">
                  {revealed[canonical.id] ? canonical.apiKey : mask(canonical.apiKey)}
                </code>
                <button
                  type="button"
                  onClick={() =>
                    setRevealed((r) => ({ ...r, [canonical.id]: !r[canonical.id] }))
                  }
                  className="p-2.5 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  title={revealed[canonical.id] ? 'Hide' : 'Reveal'}
                >
                  {revealed[canonical.id] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyKey(canonical.id, canonical.apiKey)}
                  className="p-2.5 text-gray-400 hover:text-maxxed-blue border border-gray-200 rounded-lg hover:bg-maxxed-blue/5"
                  title="Copy"
                >
                  {copiedId === canonical.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <ol className="text-[13px] text-gray-700 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Copy the key above.</li>
              <li>
                Vercel → project{' '}
                <span className="font-mono">university-maxxedout-funnel</span> →
                Settings → Environment Variables.
              </li>
              <li>
                Add <span className="font-mono">FUNNEL_API_KEY</span> = the
                copied value, scope <span className="font-semibold">Production</span>{' '}
                (also Preview if you test on the dev funnel).
              </li>
              <li>
                Redeploy production (Deployments → latest → Redeploy). Env
                vars only take effect on a fresh deploy.
              </li>
            </ol>
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              CLI tip: use{' '}
              <span className="font-mono">printf &apos;%s&apos; &apos;KEY&apos; | vercel env add FUNNEL_API_KEY production</span>{' '}
              — never <span className="font-mono">echo</span> (its trailing
              newline corrupts the key).
            </p>
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-500">
            No active funnels found — create one in{' '}
            <a href="/admin/funnels" className="text-maxxed-blue underline">
              Funnels
            </a>{' '}
            and its key is generated automatically.
          </div>
        )}
      </div>

      {/* All funnel keys */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">All funnel keys</h2>
          <p className="text-[12px] text-gray-500 mt-1">
            Each funnel&apos;s auto-generated key. Rotate only if a key
            leaked — it breaks the old key immediately.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {funnels.map((f) => (
            <div
              key={f.id}
              className="px-5 py-3.5 flex items-center gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {f.name}
                </p>
                <p className="text-[11px] font-mono text-gray-400">
                  {f.subdomain ?? '—'}
                </p>
              </div>
              <code className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-[12px] font-mono text-gray-700">
                {revealed[f.id] ? f.apiKey : mask(f.apiKey)}
              </code>
              <button
                type="button"
                onClick={() => setRevealed((r) => ({ ...r, [f.id]: !r[f.id] }))}
                className="p-2 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
                title={revealed[f.id] ? 'Hide' : 'Reveal'}
              >
                {revealed[f.id] ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => copyKey(f.id, f.apiKey)}
                className="p-2 text-gray-400 hover:text-maxxed-blue border border-gray-200 rounded-md hover:bg-maxxed-blue/5"
                title="Copy"
              >
                {copiedId === f.id ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => rotate(f.id, f.name)}
                disabled={rotatingId === f.id}
                className="p-2 text-gray-400 hover:text-orange-500 border border-gray-200 rounded-md hover:bg-orange-50 disabled:opacity-40"
                title="Rotate key"
              >
                {rotatingId === f.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <a
        href="/admin/notifications"
        className="inline-flex items-center gap-1.5 text-sm text-maxxed-blue hover:underline"
      >
        <ExternalLink className="w-4 h-4" />
        Notification recipients &amp; Slack channels
      </a>
    </div>
  );
}
