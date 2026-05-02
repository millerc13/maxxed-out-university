'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Save,
  Check,
  ExternalLink,
  Activity,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CourseMarketingFormProps {
  course: {
    id: string;
    title: string;
    slug: string;
    metaPixelId?: string | null;
    metaCapiAccessToken?: string | null;
    metaTestEventCode?: string | null;
  };
  /**
   * Pre-masked tail of the system-wide `META_CAPI_ACCESS_TOKEN` env
   * value (e.g. `"EAAO…d6Pwz"`). When set, shown as the inherited
   * fallback in the CAPI field placeholder so the admin can see at a
   * glance that CAPI is wired even when this course has no override.
   */
  systemCapiTokenMasked?: string | null;
}

interface Draft {
  metaPixelId: string;
  metaCapiAccessToken: string;
  metaTestEventCode: string;
}

/**
 * Marketing tab — built so the ads guy only ever has to fill in one field
 * (the Pixel ID) for tracking to fully wire itself across every funnel,
 * apply, checkout, sign, and success surface for this course. CAPI token
 * + test-event code live under "Advanced" because they're set once by
 * the dev and then never touched.
 */
export function CourseMarketingForm({ course, systemCapiTokenMasked }: CourseMarketingFormProps) {
  const initial: Draft = {
    metaPixelId: course.metaPixelId ?? '',
    metaCapiAccessToken: course.metaCapiAccessToken ?? '',
    metaTestEventCode: course.metaTestEventCode ?? '',
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(
    !!(course.metaCapiAccessToken || course.metaTestEventCode),
  );

  const dirty =
    draft.metaPixelId.trim() !== saved.metaPixelId.trim() ||
    draft.metaCapiAccessToken.trim() !== saved.metaCapiAccessToken.trim() ||
    draft.metaTestEventCode.trim() !== saved.metaTestEventCode.trim();

  const trackingActive = !!saved.metaPixelId.trim();
  const capiOnCourse = !!saved.metaCapiAccessToken.trim();
  // CAPI is "active" when EITHER the per-course override OR the system
  // env-var fallback is configured. The form should reflect both paths.
  const capiActive = capiOnCourse || !!systemCapiTokenMasked;
  const capiFromSystem = !capiOnCourse && !!systemCapiTokenMasked;
  const testMode = !!saved.metaTestEventCode.trim();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaPixelId: draft.metaPixelId.trim() || null,
          metaCapiAccessToken: draft.metaCapiAccessToken.trim() || null,
          metaTestEventCode: draft.metaTestEventCode.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const next = await res.json();
      const persisted: Draft = {
        metaPixelId: next.metaPixelId ?? '',
        metaCapiAccessToken: next.metaCapiAccessToken ?? '',
        metaTestEventCode: next.metaTestEventCode ?? '',
      };
      setSaved(persisted);
      setDraft(persisted);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function maskedToken(value: string): string {
    if (!value) return '';
    if (value.length <= 12) return '•'.repeat(value.length);
    return `${value.slice(0, 6)}${'•'.repeat(Math.min(value.length - 12, 32))}${value.slice(-6)}`;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* ── PRIMARY: Pixel ID ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div
              className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                trackingActive ? 'bg-maxxed-blue/10' : 'bg-gray-100'
              }`}
            >
              <Activity
                className={`w-5 h-5 ${trackingActive ? 'text-maxxed-blue' : 'text-gray-400'}`}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Meta Ads Tracking</h2>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                Drop in the Pixel ID and we&apos;ll auto-wire <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">PageView</code>,{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">Lead</code>,{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">InitiateCheckout</code>, and{' '}
                <code className="font-mono text-[12px] bg-gray-100 px-1 rounded">Purchase</code> across
                every page touched by <strong>{course.title}</strong>. That&apos;s it — nothing else
                to configure.
              </p>
            </div>
          </div>

          <Label htmlFor="metaPixelId" className="text-[13px] font-bold uppercase tracking-[0.16em] text-gray-700">
            Pixel ID
          </Label>
          <Input
            id="metaPixelId"
            value={draft.metaPixelId}
            onChange={(e) =>
              setDraft((p) => ({ ...p, metaPixelId: e.target.value.replace(/[^\d]/g, '') }))
            }
            placeholder="e.g. 1223802093004334"
            className="mt-2 font-mono text-base h-12"
            inputMode="numeric"
            maxLength={20}
          />
          <p className="mt-2 text-[12px] text-gray-500">
            15–16 digit number from{' '}
            <a
              href="https://business.facebook.com/events_manager2/list/dataset/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-maxxed-blue hover:underline cursor-pointer inline-flex items-center gap-0.5"
            >
              Events Manager <ExternalLink className="w-3 h-3" />
            </a>
            . Same value as the Pixel/Dataset ID on the install snippet.
          </p>

          {/* Live status row */}
          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
            <StatusPill
              active={trackingActive}
              activeLabel="Tracking active — events firing"
              inactiveLabel="Tracking off — paste a Pixel ID to enable"
            />
            {trackingActive && (
              <StatusPill
                active={capiActive}
                activeLabel={
                  capiFromSystem
                    ? `CAPI on (system token · ${systemCapiTokenMasked})`
                    : 'CAPI on (server-side mirror)'
                }
                inactiveLabel="Client-only (no CAPI token)"
                tone={capiActive ? 'good' : 'warn'}
              />
            )}
            {testMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                Test mode — events not affecting ad delivery
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── EVENTS REFERENCE ────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-maxxed-blue" />
            <h3 className="text-sm font-bold text-gray-900">
              What auto-fires once the Pixel ID is saved
            </h3>
          </div>
          <div className="space-y-2.5">
            {EVENT_DOCS.map((e) => (
              <div key={e.event} className="flex items-start gap-3 text-[13px] text-gray-700">
                <code className="font-mono text-[11px] font-bold bg-maxxed-blue/10 text-maxxed-blue px-2 py-0.5 rounded mt-0.5 shrink-0">
                  {e.event}
                </code>
                <div>
                  <strong className="text-gray-900">{e.label}</strong>
                  <span className="text-gray-500"> — {e.surface}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-gray-500 leading-relaxed">
            Client &amp; server events deduplicated via shared <code className="font-mono">event_id</code>{' '}
            so iOS 14.5+ users counted server-side aren&apos;t double-counted when their browser
            also fires.
          </p>
        </CardContent>
      </Card>

      {/* ── ADVANCED (collapsed by default) ─────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left cursor-pointer hover:bg-gray-50 transition-colors rounded-xl"
            aria-expanded={advancedOpen}
          >
            <div className="flex items-center gap-3">
              {advancedOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <h3 className="text-sm font-bold text-gray-900">Advanced (dev only)</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Conversions API token + test-event code. Set once, then ignore.
                </p>
              </div>
            </div>
            {(capiOnCourse || testMode) ? (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                Course override
              </span>
            ) : capiFromSystem ? (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                Inherited from system
              </span>
            ) : null}
          </button>

          {advancedOpen && (
            <div className="px-5 sm:px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
              <div>
                <Label
                  htmlFor="metaCapiAccessToken"
                  className="text-[13px] font-bold text-gray-900"
                >
                  Conversions API Access Token
                </Label>
                {capiFromSystem ? (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5 flex items-start gap-2.5">
                    <div className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-blue-900">
                        Using system-wide token{' '}
                        <span className="font-mono text-[11px] text-blue-700">
                          {systemCapiTokenMasked}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-blue-700/80 leading-relaxed">
                        Set in Vercel env (<span className="font-mono">META_CAPI_ACCESS_TOKEN</span>).
                        Override only if this course needs a different Pixel&apos;s token.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-gray-500 leading-relaxed">
                    Generate from <strong>Events Manager → Settings → Conversions API → Generate
                    access token</strong>. Without it, only client-side Pixel events fire (iOS 14.5+
                    and ad-blockers won&apos;t be tracked). Stored encrypted, only sent to{' '}
                    <span className="font-mono text-[11px]">graph.facebook.com</span> server-side —
                    never to the browser.
                  </p>
                )}
                <div className="mt-2 relative">
                  <Input
                    id="metaCapiAccessToken"
                    type={showToken ? 'text' : 'password'}
                    value={draft.metaCapiAccessToken}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, metaCapiAccessToken: e.target.value.trim() }))
                    }
                    placeholder={
                      saved.metaCapiAccessToken
                        ? maskedToken(saved.metaCapiAccessToken)
                        : capiFromSystem
                          ? `Override system token ${systemCapiTokenMasked} (optional)`
                          : 'EAAO…'
                    }
                    className="font-mono text-xs pr-10"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="metaTestEventCode"
                  className="text-[13px] font-bold text-gray-900"
                >
                  Test Event Code
                </Label>
                <p className="mt-1 text-[12px] text-gray-500">
                  From <strong>Events Manager → Test Events</strong>. When set, every event is
                  tagged with this code and appears in the Test Events live view{' '}
                  <em>without</em> affecting ad delivery. <strong>Clear to go live.</strong>
                </p>
                <Input
                  id="metaTestEventCode"
                  value={draft.metaTestEventCode}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, metaTestEventCode: e.target.value.trim() }))
                  }
                  placeholder="e.g. TEST12345"
                  className="mt-2 font-mono text-sm max-w-xs"
                  maxLength={32}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SAVE BAR ────────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {savedAt && !dirty ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </>
          ) : dirty ? (
            <span className="text-amber-700">Unsaved changes</span>
          ) : (
            <span>Up to date</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-maxxed-blue text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-maxxed-blue/90 cursor-pointer transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
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
  const dotColor = active ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-gray-400';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

const EVENT_DOCS: { event: string; label: string; surface: string }[] = [
  {
    event: 'PageView',
    label: 'Visitor lands on any course-tied page',
    surface: 'funnel landing, /courses, /apply, /checkout, /sign, /checkout/success',
  },
  { event: 'Lead', label: 'Application submitted', surface: '/apply form completion' },
  { event: 'InitiateCheckout', label: 'Checkout viewed', surface: '/checkout page render' },
  {
    event: 'Purchase',
    label: 'Payment completed',
    surface: 'Stripe + Fanbasis success webhook (server-side, with value + currency)',
  },
];
