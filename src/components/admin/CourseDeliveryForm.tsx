'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Check, RotateCcw } from 'lucide-react';
import { Toggle } from './Toggle';

interface CourseDeliveryFormProps {
  course: {
    id: string;
    title: string;
    slug: string;
    checkoutAfterApply?: boolean | null;
    isBundle?: boolean | null;
    welcomeSmsBody?: string | null;
    welcomeEmailSubject?: string | null;
    welcomeEmailBody?: string | null;
    autoSendContract?: boolean | null;
  };
}

interface Draft {
  welcomeSmsBody: string;
  welcomeEmailSubject: string;
  welcomeEmailBody: string;
  autoSendContract: boolean;
}

const DEFAULT_HIGH_TICKET_SMS =
  "Hey {{firstName}}, this is Todd's team at Maxxed Out — welcome to {{courseTitle}}! We'll be in touch soon to schedule your first session. While you wait, you've got full access to our Real Estate Empire Blueprint course library. Tap to log in and dive in: {{shortUrl}}";
const DEFAULT_SELF_SERVE_SMS =
  "Hey {{firstName}}, this is Todd's team at Maxxed Out. Your {{courseTitle}} access is ready — and you've also got our full Real Estate Empire Blueprint course library included. Tap to set up your account: {{shortUrl}}";
const DEFAULT_BLUEPRINT_SMS =
  "Hey {{firstName}}, this is Todd's team at Maxxed Out. Welcome to {{courseTitle}} — your full course library is ready. Tap to set up your account and dive in: {{shortUrl}}";

const TOKENS = [
  { token: '{{firstName}}', label: 'First name' },
  { token: '{{courseTitle}}', label: 'Course title' },
  { token: '{{shortUrl}}', label: 'Short URL (SMS)' },
  { token: '{{activateUrl}}', label: 'Full activate URL (email)' },
  { token: '{{customerName}}', label: 'Full name' },
];

const SAMPLE_TOKENS = {
  firstName: 'Brian',
  customerName: 'Brian Johnson',
  courseTitle: '{{courseTitle}}_PLACEHOLDER',
  shortUrl: 'https://university.maxxedout.com/a/9nhTGn',
  activateUrl: 'https://university.maxxedout.com/auth/activate?token=…',
};

function renderTokens(template: string, courseTitle: string): string {
  return template
    .replaceAll('{{firstName}}', SAMPLE_TOKENS.firstName)
    .replaceAll('{{customerName}}', SAMPLE_TOKENS.customerName)
    .replaceAll('{{courseTitle}}', courseTitle)
    .replaceAll('{{shortUrl}}', SAMPLE_TOKENS.shortUrl)
    .replaceAll('{{activateUrl}}', SAMPLE_TOKENS.activateUrl);
}

function pickDefaultSms(course: CourseDeliveryFormProps['course']): string {
  const isBlueprint =
    course.title.trim().toLowerCase() === 'real estate empire blueprint' ||
    (course.isBundle === true && course.title.toLowerCase().includes('blueprint'));
  if (isBlueprint) return DEFAULT_BLUEPRINT_SMS;
  if (course.checkoutAfterApply) return DEFAULT_HIGH_TICKET_SMS;
  return DEFAULT_SELF_SERVE_SMS;
}

function defaultEmailSubject(courseTitle: string): string {
  return `Welcome to ${courseTitle} — set up your account`;
}

function defaultEmailBody(course: CourseDeliveryFormProps['course']): string {
  if (course.checkoutAfterApply) {
    return `You're in — welcome to {{courseTitle}}. Our team will reach out within one business day to schedule your first session. While you wait, click below to set up your account password and dive into the full Real Estate Empire Blueprint course library, included free with your enrollment.`;
  }
  return `You're in — your {{courseTitle}} access is ready, along with our full Real Estate Empire Blueprint course library. Click below to set up your account password and start watching.`;
}

export function CourseDeliveryForm({ course }: CourseDeliveryFormProps) {
  // Defaults computed up-front so the form can show the current effective
  // copy (saved override OR live default) on first render.
  const defaultSms = pickDefaultSms(course);
  const defaultSubject = defaultEmailSubject(course.title);
  const defaultBody = defaultEmailBody(course);

  // Each field starts populated with the current effective copy. We track
  // separately whether the current draft value came from an admin override
  // (ie the saved DB value) vs the live default — that drives the
  // "Custom override" / "Using default" label and what gets persisted on
  // Save: a draft that exactly matches the default is saved as NULL so the
  // course continues to track the live default if we update it later.
  const initial: Draft = {
    welcomeSmsBody: course.welcomeSmsBody || defaultSms,
    welcomeEmailSubject: course.welcomeEmailSubject || defaultSubject,
    welcomeEmailBody: course.welcomeEmailBody || defaultBody,
    autoSendContract: !!course.autoSendContract,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState({
    welcomeSmsBody: course.welcomeSmsBody || '',
    welcomeEmailSubject: course.welcomeEmailSubject || '',
    welcomeEmailBody: course.welcomeEmailBody || '',
    autoSendContract: !!course.autoSendContract,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const smsIsCustom = !!savedSnapshot.welcomeSmsBody;
  const subjectIsCustom = !!savedSnapshot.welcomeEmailSubject;
  const bodyIsCustom = !!savedSnapshot.welcomeEmailBody;

  // "Dirty" compares the draft to what would actually persist if saved
  // right now. A draft equal to the default + originally-NULL row is not
  // dirty — saving would no-op.
  const draftSmsToPersist = draft.welcomeSmsBody === defaultSms ? '' : draft.welcomeSmsBody;
  const draftSubjectToPersist =
    draft.welcomeEmailSubject === defaultSubject ? '' : draft.welcomeEmailSubject;
  const draftBodyToPersist =
    draft.welcomeEmailBody === defaultBody ? '' : draft.welcomeEmailBody;
  const dirty =
    draftSmsToPersist !== savedSnapshot.welcomeSmsBody ||
    draftSubjectToPersist !== savedSnapshot.welcomeEmailSubject ||
    draftBodyToPersist !== savedSnapshot.welcomeEmailBody ||
    draft.autoSendContract !== savedSnapshot.autoSendContract;

  const previewSms = renderTokens(
    draft.welcomeSmsBody.trim() || defaultSms,
    course.title,
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeSmsBody: draftSmsToPersist,
          welcomeEmailSubject: draftSubjectToPersist,
          welcomeEmailBody: draftBodyToPersist,
          autoSendContract: draft.autoSendContract,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const saved = await res.json();
      setSavedAt(new Date());
      setSavedSnapshot({
        welcomeSmsBody: saved.welcomeSmsBody || '',
        welcomeEmailSubject: saved.welcomeEmailSubject || '',
        welcomeEmailBody: saved.welcomeEmailBody || '',
        autoSendContract: !!saved.autoSendContract,
      });
      // Re-prefill the visible draft with the new effective value, so
      // a subsequent reload would land on the same content.
      setDraft({
        welcomeSmsBody: saved.welcomeSmsBody || defaultSms,
        welcomeEmailSubject: saved.welcomeEmailSubject || defaultSubject,
        welcomeEmailBody: saved.welcomeEmailBody || defaultBody,
        autoSendContract: !!saved.autoSendContract,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function resetSms() {
    setDraft((prev) => ({ ...prev, welcomeSmsBody: defaultSms }));
  }
  function resetSubject() {
    setDraft((prev) => ({ ...prev, welcomeEmailSubject: defaultSubject }));
  }
  function resetBody() {
    setDraft((prev) => ({ ...prev, welcomeEmailBody: defaultBody }));
  }

  function insertToken(target: keyof Draft, token: string) {
    if (target === 'autoSendContract') return;
    setDraft((prev) => ({ ...prev, [target]: prev[target] + token }));
  }

  function statusBadge(isCustom: boolean) {
    return isCustom ? (
      <span className="text-[10px] font-bold uppercase tracking-wider bg-maxxed-blue/10 text-maxxed-blue px-1.5 py-0.5 rounded">
        Custom override
      </span>
    ) : (
      <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
        Using default
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <Card>
        <CardContent className="p-6 space-y-2">
          <h3 className="text-base font-bold uppercase tracking-[0.18em] text-gray-900">
            Delivery
          </h3>
          <p className="text-sm text-gray-600">
            Post-purchase messaging fired when a buyer completes checkout for{' '}
            <strong>{course.title}</strong>. Fields support these tokens
            (click to insert):
          </p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {TOKENS.map((t) => (
              <code
                key={t.token}
                className="px-2 py-0.5 rounded bg-gray-100 text-[12px] text-gray-800 border border-gray-200"
                title={t.label}
              >
                {t.token}
              </code>
            ))}
          </div>
          <p className="text-xs text-gray-500 pt-1">
            Leave any field blank to use the default for this course type.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="welcomeSmsBody" className="font-bold text-base">
                Welcome SMS body
              </Label>
              {statusBadge(smsIsCustom)}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {TOKENS.slice(0, 4).map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => insertToken('welcomeSmsBody', t.token)}
                  className="px-1.5 py-0.5 rounded bg-maxxed-blue/10 text-[11px] text-maxxed-blue hover:bg-maxxed-blue/20 cursor-pointer"
                >
                  +{t.token}
                </button>
              ))}
              <button
                type="button"
                onClick={resetSms}
                disabled={draft.welcomeSmsBody === defaultSms}
                className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Restore the default copy for this course type"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
          <textarea
            id="welcomeSmsBody"
            value={draft.welcomeSmsBody}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, welcomeSmsBody: e.target.value }))
            }
            rows={5}
            placeholder={defaultSms}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-maxxed-blue focus:outline-none focus:ring-1 focus:ring-maxxed-blue"
          />
          <p className="text-xs text-gray-500">
            {draft.welcomeSmsBody.length} chars · SMS segments roughly cap at 160 per segment.
          </p>

          {/* Live preview */}
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Preview (sample tokens)
            </p>
            <p className="mt-1.5 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {previewSms}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="welcomeEmailSubject" className="font-bold text-base">
                  Welcome email subject
                </Label>
                {statusBadge(subjectIsCustom)}
              </div>
              <button
                type="button"
                onClick={resetSubject}
                disabled={draft.welcomeEmailSubject === defaultSubject}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <Input
              id="welcomeEmailSubject"
              value={draft.welcomeEmailSubject}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, welcomeEmailSubject: e.target.value }))
              }
              placeholder={defaultSubject}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="welcomeEmailBody" className="font-bold text-base">
                Welcome email body
              </Label>
              {statusBadge(bodyIsCustom)}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {TOKENS.slice(0, 5).map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => insertToken('welcomeEmailBody', t.token)}
                  className="px-1.5 py-0.5 rounded bg-maxxed-blue/10 text-[11px] text-maxxed-blue hover:bg-maxxed-blue/20 cursor-pointer"
                >
                  +{t.token}
                </button>
              ))}
              <button
                type="button"
                onClick={resetBody}
                disabled={draft.welcomeEmailBody === defaultBody}
                className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
          <textarea
            id="welcomeEmailBody"
            value={draft.welcomeEmailBody}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, welcomeEmailBody: e.target.value }))
            }
            rows={6}
            placeholder={`You're in — your ${course.title} access is ready, along with our full Real Estate Empire Blueprint course library. Click below to set up your account password and start watching.`}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-maxxed-blue focus:outline-none focus:ring-1 focus:ring-maxxed-blue"
          />
          <p className="text-xs text-gray-500">
            Sits between the email hero and the activation button. The full
            HTML wrapper (logo, button, footer) is rendered around it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Toggle
            id="autoSendContract"
            checked={draft.autoSendContract}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, autoSendContract: next }))
            }
            label="Auto-send enrollment contract"
            description="When ON, every successful checkout for this course also fires the default e-sign contract. Leave OFF for high-ticket programs where closers compose custom contracts."
          />
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {savedAt && !dirty && (
          <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
        {dirty && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            Unsaved changes
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-semibold hover:bg-maxxed-blue-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save delivery settings'}
        </button>
      </div>
    </div>
  );
}
