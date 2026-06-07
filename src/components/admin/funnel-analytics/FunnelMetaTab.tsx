'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, Save, Loader2, Check } from 'lucide-react';

/**
 * Meta Pixel editor for a funnel. The Pixel lives on the linked Course
 * (Course.metaPixelId) — the SAME field edited on the course's Marketing
 * tab — so the two stay in sync automatically. We read/write the course
 * directly here rather than keeping a separate per-funnel value.
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((c) => {
        if (!active) return;
        const p = (c?.metaPixelId ?? '') as string;
        setPixel(p);
        setSaved(p);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId]);

  const dirty = pixel.trim() !== saved.trim();

  async function save() {
    if (!courseId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
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
    <div className="space-y-6 max-w-2xl">
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${pixel.trim() ? 'bg-maxxed-blue/10' : 'bg-gray-100'}`}>
              <Megaphone className={`w-5 h-5 ${pixel.trim() ? 'text-maxxed-blue' : 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Meta Pixel</h2>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                Drives <strong>PageView</strong>, <strong>Lead</strong>, and <strong>Purchase</strong> on the live funnel
                {subdomain ? <> at <span className="font-mono text-[12px] bg-gray-100 px-1 rounded">{subdomain}.maxxedout.com</span></> : null}.
                This is the same Pixel as <strong>{courseTitle || 'the linked course'}</strong>&apos;s
                course page — editing it here updates both. Changes go live immediately, no redeploy.
              </p>
            </div>
          </div>

          <label className="block text-[13px] font-bold uppercase tracking-[0.16em] text-gray-700 mb-2">Pixel ID</label>
          <input
            value={pixel}
            onChange={(e) => setPixel(e.target.value.replace(/[^\d]/g, ''))}
            placeholder={loading ? 'Loading…' : 'e.g. 1223802093004334'}
            inputMode="numeric"
            maxLength={20}
            disabled={loading}
            className="w-full border border-gray-300 rounded-lg px-3 h-12 text-base font-mono focus:outline-none focus:ring-2 focus:ring-maxxed-blue disabled:bg-gray-50"
          />
          <p className="mt-2 text-xs text-gray-500">
            15–16 digit Pixel / Dataset ID from Meta Events Manager. Clear it to turn tracking off for this course.
          </p>

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="text-sm">
              {savedAt && !dirty ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium"><Check className="w-4 h-4" /> Saved &amp; live</span>
              ) : dirty ? (
                <span className="text-amber-700">Unsaved changes</span>
              ) : pixel.trim() ? (
                <span className="inline-flex items-center gap-1.5 text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Tracking active · {pixel}</span>
              ) : (
                <span className="text-gray-400">No pixel set</span>
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
        </CardContent>
      </Card>
    </div>
  );
}
