'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Save, Loader2, Check, ExternalLink, Sparkles } from 'lucide-react';

interface MetaStatus {
  metaPixelId: string | null;
  courseTitle: string | null;
  capiActive: boolean;
  capiOnCourse: boolean;
  capiFromSystem: boolean;
  systemCapiMasked: string | null;
  testMode: boolean;
}

/**
 * Meta Pixel + tracking status for a funnel. The Pixel lives on the linked
 * Course (Course.metaPixelId) — the same field as the course Marketing tab —
 * so they stay in sync. Reads/writes via the pixel-only endpoints so a
 * view-only role (pixel:manage) can manage tracking without touching other
 * content, and without the raw CAPI token ever reaching the browser.
 */
export function FunnelMetaTab({
  courseId,
  courseTitle,
  subdomain,
}: {
  courseId: string | null;
  courseTitle?: string | null;
  subdomain?: string | null;
}) {
  const [pixel, setPixel] = useState('');
  const [saved, setSaved] = useState('');
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    fetch(`/api/admin/courses/${courseId}/meta-pixel`)
      .then((r) => r.json())
      .then((s: MetaStatus) => {
        if (!active) return;
        setStatus(s);
        const p = s?.metaPixelId ?? '';
        setPixel(p);
        setSaved(p);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId]);

  const dirty = pixel.trim() !== saved.trim();
  const trackingActive = !!pixel.trim();
  const title = status?.courseTitle || courseTitle || 'this funnel';

  async function save() {
    if (!courseId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/meta-pixel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaPixelId: pixel.trim() || null }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error || `Save failed (${res.status})`);
      }
      const c = await res.json();
      const p = (c?.metaPixelId ?? '') as string;
      setSaved(p);
      setPixel(p);
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!courseId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-600">
          Link a course to this funnel on the <strong>Settings</strong> tab first. The Meta Pixel is
          stored on the course (shared with its course page), so there&apos;s nothing to set until a
          course is attached.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Primary: Pixel ID + auto-wire explainer (mirrors the course Marketing tab) */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${trackingActive ? 'bg-maxxed-blue/10' : 'bg-gray-100'}`}>
              <Activity className={`w-5 h-5 ${trackingActive ? 'text-maxxed-blue' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Meta Ads Tracking</h2>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                Drop in the Pixel ID and we&apos;ll auto-wire{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">PageView</code>,{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">Lead</code>,{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">InitiateCheckout</code>, and{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">Purchase</code> across every page touched
                by <strong>{title}</strong>. That&apos;s it — nothing else to configure.
              </p>
            </div>
          </div>

          <label htmlFor="funnelPixelId" className="text-[13px] font-bold uppercase tracking-[0.16em] text-gray-700">Pixel ID</label>
          <input
            id="funnelPixelId"
            value={pixel}
            onChange={(e) => setPixel(e.target.value.replace(/[^\d]/g, ''))}
            placeholder={loading ? 'Loading…' : 'e.g. 1223802093004334'}
            inputMode="numeric"
            maxLength={20}
            disabled={loading}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 h-12 text-base font-mono focus:outline-none focus:ring-2 focus:ring-maxxed-blue disabled:bg-gray-50"
          />
          <p className="mt-2 text-[12px] text-gray-500">
            15–16 digit number from{' '}
            <a href="https://business.facebook.com/events_manager2/list/dataset/" target="_blank" rel="noopener noreferrer" className="text-maxxed-blue hover:underline inline-flex items-center gap-0.5">
              Events Manager <ExternalLink className="w-3 h-3" />
            </a>. Same value as the Pixel/Dataset ID on the install snippet.
          </p>

          {/* Live status pills */}
          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
            <StatusPill
              active={trackingActive}
              activeLabel="Tracking active — events firing"
              inactiveLabel="Tracking off — paste a Pixel ID to enable"
            />
            {trackingActive && status?.capiActive && (
              <StatusPill
                active
                activeLabel={
                  status.capiFromSystem && status.systemCapiMasked
                    ? `CAPI on (system token · ${status.systemCapiMasked})`
                    : 'CAPI on (server-side mirror)'
                }
                inactiveLabel=""
              />
            )}
            {trackingActive && !status?.capiActive && (
              <StatusPill active={false} tone="warn" activeLabel="" inactiveLabel="Client-only (no CAPI token)" />
            )}
            {status?.testMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                Test mode — not affecting ad delivery
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* What auto-fires */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-maxxed-blue" />
            <h3 className="text-sm font-bold text-gray-900">What fires once the Pixel ID is saved</h3>
          </div>
          <div className="space-y-2.5">
            {EVENT_DOCS.map((e) => (
              <div key={e.event} className="flex items-start gap-3 text-[13px] text-gray-700">
                <code className="font-mono text-[11px] font-bold bg-maxxed-blue/10 text-maxxed-blue px-2 py-0.5 rounded mt-0.5 shrink-0">{e.event}</code>
                <div><strong className="text-gray-900">{e.label}</strong><span className="text-gray-500"> — {e.surface}</span></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {savedAt && !dirty ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium"><Check className="w-4 h-4" /> Saved &amp; live</span>
          ) : dirty ? (
            <span className="text-amber-700">Unsaved changes</span>
          ) : (
            <span className="text-gray-400">{pixel.trim() ? 'Up to date' : 'No pixel set'}</span>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-maxxed-blue text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-800 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Pixel
        </button>
      </div>

      <p className="text-[11px] text-gray-400">
        This is the same Pixel as <strong>{title}</strong>&apos;s course page — editing it here updates both.
        Changes go live on {subdomain ? `${subdomain}.maxxedout.com` : 'the funnel'} immediately.
      </p>
    </div>
  );
}

function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
  tone = 'good',
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  tone?: 'good' | 'warn';
}) {
  const styles = active
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : tone === 'warn'
    ? 'bg-amber-50 text-amber-700 border border-amber-200'
    : 'bg-gray-100 text-gray-500 border border-gray-200';
  const dot = active ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

const EVENT_DOCS: { event: string; label: string; surface: string }[] = [
  { event: 'PageView', label: 'Visitor lands on the funnel', surface: 'every funnel page' },
  { event: 'Lead', label: 'Application submitted', surface: 'apply form completion' },
  { event: 'InitiateCheckout', label: 'Checkout viewed', surface: 'checkout page render' },
  { event: 'Purchase', label: 'Payment completed', surface: 'success webhook (server-side, with value)' },
];
