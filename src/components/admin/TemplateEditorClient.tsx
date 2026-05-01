'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FileSignature,
  Save,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowLeft,
  Loader2,
  CircleAlert,
  Sparkles,
} from 'lucide-react';
import { extractTokens, markdownToHtml, renderMarkdown, decorateContractHtml } from '@/lib/esign-render';
import {
  CONTRACT_FONT_LINKS,
  CONTRACT_LOGO_URL,
  CONTRACT_STYLES,
} from '@/components/sign/contract-styles';

type Initial = {
  id: string;
  name: string;
  body: string;
  tokens: string[];
  updatedAt: string;
};

type Props = { initial: Initial | null };

// Sample values for the live preview when "Preview filled" is on. Static —
// admins are previewing wording, not auditing real per-buyer renders.
const SAMPLE_TOKEN_VALUES: Record<string, string> = {
  'Agreement.EffectiveDate': 'April 30, 2026',
  'Customer.FullName': 'Brian Johnson',
  'Customer.FirstName': 'Brian',
  'Customer.LastName': 'Johnson',
  'Customer.Email': 'brian@example.com',
  'Course.Name': '6-Month Mentorship',
  'Payment.Total': '$10,000.00',
  'Payment.Initial': '$10,000.00',
  'Payment.RemainingBalance': '$0.00',
  'Payment.Date': 'April 30, 2026',
  'Payment.Schedule': 'Paid in full',
  'Payment.NumberOfInstallments': '1',
  'Payment.PerInstallmentAmount': '$10,000.00',
  'Payment.FirstDueDate': 'April 30, 2026',
  'Transaction.Id': 'pi_preview_1234',
  'Notes': '',
  'NonCompete.YearsPostProgram': '1',
  'GoverningLaw.State': 'Ohio',
  'Dispute.Location': 'Ohio',
  'Company.SignatureLine': 'Todd Pultz',
  'Company.SignatureDate': 'April 30, 2026',
};

const TOKEN_CHIPS: { token: string; label: string }[] = [
  { token: 'Customer.FullName', label: 'Customer name' },
  { token: 'Customer.Email', label: 'Customer email' },
  { token: 'Course.Name', label: 'Course name' },
  { token: 'Payment.Total', label: 'Total paid' },
  { token: 'Payment.Initial', label: 'Initial payment' },
  { token: 'Payment.RemainingBalance', label: 'Remaining balance' },
  { token: 'Payment.Schedule', label: 'Schedule' },
  { token: 'Agreement.EffectiveDate', label: 'Effective date' },
  { token: 'NonCompete.YearsPostProgram', label: 'Non-compete years' },
  { token: 'GoverningLaw.State', label: 'Governing state' },
  { token: 'Dispute.Location', label: 'Dispute location' },
  { token: 'Company.SignatureLine', label: 'Company sig name' },
  { token: 'Company.SignatureDate', label: 'Company sig date' },
];

export function TemplateEditorClient({ initial }: Props) {
  const [name, setName] = useState(initial?.name ?? 'Elite Coaching Agreement');
  const [body, setBody] = useState(initial?.body ?? '');
  const [filledPreview, setFilledPreview] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initial?.updatedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const dirty = useMemo(
    () => !!initial && (initial.body !== body || initial.name !== name),
    [initial, body, name],
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Live token list (re-extracted on every keystroke).
  const tokens = useMemo(() => extractTokens(body), [body]);

  // Render preview HTML. If filledPreview, substitute sample values; else
  // leave {{Token}} markers visible (highlighted in yellow downstream).
  const previewHtml = useMemo(() => {
    if (!body) return '';
    try {
      if (filledPreview) {
        const filled: Record<string, string> = {};
        for (const t of tokens) {
          filled[t] = SAMPLE_TOKEN_VALUES[t] ?? `<sample ${t}>`;
        }
        const md = renderMarkdown(body, filled);
        return decorateContractHtml(markdownToHtml(md));
      }
      // Show with placeholders highlighted.
      const highlighted = body.replace(
        /\{\{\s*([A-Za-z][A-Za-z0-9_.]*)\s*\}\}/g,
        (_, name) => `<mark data-token="${name}">{{${name}}}</mark>`,
      );
      return decorateContractHtml(markdownToHtml(highlighted));
    } catch (err) {
      return `<p style="color:#b91c1c">${(err as Error).message}</p>`;
    }
  }, [body, tokens, filledPreview]);

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => `${b}{{${token}}}`);
      return;
    }
    const before = body.slice(0, el.selectionStart);
    const after = body.slice(el.selectionEnd);
    const insertion = `{{${token}}}`;
    const next = before + insertion + after;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/documents/template', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Save failed');
      }
      setSavedAt(data.template?.updatedAt ?? new Date().toISOString());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function revert() {
    if (!initial) return;
    if (!dirty || confirm('Revert all unsaved changes?')) {
      setBody(initial.body);
      setName(initial.name);
      setError(null);
    }
  }

  // Warn before navigating away with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* ─── Header ────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-maxxed-blue to-maxxed-blue-dark text-white shadow-sm">
            <FileSignature className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <Link
              href="/admin/documents"
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Documents
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 mt-0.5">
              Edit Contract Template
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-tight mt-0.5">
              Markdown body of the active enrollment agreement. Already-sent documents keep their original copy — edits only affect future sends.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <button
              type="button"
              onClick={revert}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-600 bg-white ring-1 ring-gray-200 hover:bg-gray-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 transition-colors duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || (!dirty && !!initial)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white bg-maxxed-blue hover:bg-maxxed-blue-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 shadow-sm transition-colors duration-200"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving' : initial ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </header>

      {/* ─── Status row ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-extrabold text-gray-900 bg-transparent text-sm outline-none focus:ring-2 focus:ring-maxxed-blue/40 rounded px-1.5 py-0.5 -mx-1.5"
            aria-label="Template name"
          />
          <span className="text-gray-300">·</span>
          <span>{tokens.length} token{tokens.length === 1 ? '' : 's'} in use</span>
          {savedAt && (
            <>
              <span className="text-gray-300">·</span>
              <span>Saved {new Date(savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </>
          )}
          {dirty && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">
              Unsaved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5">
          <CircleAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* ─── Token chips ───────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-maxxed-blue" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Insert token
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOKEN_CHIPS.map(({ token, label }) => {
            const inUse = tokens.includes(token);
            return (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token)}
                title={`Insert {{${token}}} at cursor`}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 ${
                  inUse
                    ? 'bg-maxxed-blue/10 text-maxxed-blue ring-1 ring-maxxed-blue/30 hover:bg-maxxed-blue/15'
                    : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">{`{{${token.split('.').pop()}}}`}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Editor + preview ──────────────────────────────── */}
      <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
              Markdown source
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            className="w-full px-4 py-3 font-mono text-[13px] leading-6 text-gray-900 outline-none resize-none focus:ring-0"
            style={{ minHeight: '70vh' }}
            aria-label="Template body markdown"
          />
        </div>

        {showPreview && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                Live preview
              </span>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filledPreview}
                  onChange={(e) => setFilledPreview(e.target.checked)}
                  className="rounded border-gray-300 text-maxxed-blue focus:ring-maxxed-blue/40"
                />
                Preview filled
              </label>
            </div>
            <PreviewPane html={previewHtml} />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPane({ html }: { html: string }) {
  return (
    <>
      {CONTRACT_FONT_LINKS.map((href) => (
        // eslint-disable-next-line @next/next/no-css-tags
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_PANE_STYLES }} />
      <div className="overflow-y-auto px-4 sm:px-6 py-6 bg-[#fafafa]" style={{ maxHeight: '70vh' }}>
        <div className="contract-wrap" style={{ maxWidth: '640px' }}>
          <header className="contract-letterhead">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CONTRACT_LOGO_URL} alt="Maxxed Out" />
            <p className="lh-meta">Preview · Edits affect future sends only</p>
          </header>
          <div
            className="contract-display"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </>
  );
}

const PREVIEW_PANE_STYLES = `
  ${CONTRACT_STYLES}
  .contract-display mark[data-token] {
    background: #fef3c7;
    color: #92400e;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 12px;
    font-weight: 600;
  }
`;
