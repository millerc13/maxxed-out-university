'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Loader2,
  Send,
  Bell,
  Pencil,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Switch } from '@/components/admin/Toggle';
import { SlackChannelsSection } from '@/components/admin/SlackChannelsSection';

interface Recipient {
  id: string;
  phone: string;
  label: string | null;
  notifyOnLead: boolean;
  notifyOnSale: boolean;
  active: boolean;
  sources: string[];
  ghlContactId: string | null;
}

interface Props {
  initialRecipients: Recipient[];
}

const SOURCE_OPTIONS: Array<{ value: string; label: string; short: string }> = [
  { value: 'blueprint', label: 'Blueprint funnel', short: 'BP' },
  { value: 'mentorship', label: 'Mentorship funnel', short: 'MT' },
  { value: 'donewithyou', label: 'DWY funnel', short: 'DWY' },
  { value: 'accelerator', label: 'Business Accelerator', short: 'ACC' },
  { value: 'university', label: 'University site (/apply)', short: 'UNI' },
  { value: 'experience', label: 'Inner Circle Experience', short: 'IC' },
];

export function NotificationsClient({ initialRecipients }: Props) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    sent: number;
    total: number;
    failures: Array<{ phone: string; label: string | null; error?: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await fetch('/api/admin/notifications/recipients', {
        cache: 'no-store',
      });
      const json = await res.json();
      setRecipients(json.recipients || []);
    } catch {
      router.refresh();
    }
  }

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  async function createRecipient(form: {
    phone: string;
    label: string;
    notifyOnLead: boolean;
    notifyOnSale: boolean;
    sources: string[];
  }) {
    await withBusy('create', async () => {
      const res = await fetch('/api/admin/notifications/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add recipient');
      setAdding(false);
      await reload();
    });
  }

  async function updateRecipient(id: string, patch: Partial<Recipient>) {
    // Optimistic — flip locally first so the toggle moves instantly,
    // then sync. Rollback on failure.
    const before = recipients;
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
    await withBusy(`update:${id}`, async () => {
      try {
        const res = await fetch(`/api/admin/notifications/recipients/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update');
        setEditingId(null);
        await reload();
      } catch (err) {
        setRecipients(before);
        throw err;
      }
    });
  }

  async function deleteRecipient(id: string, label: string) {
    if (!confirm(`Remove ${label}? They'll stop getting lead/sale notifications.`)) return;
    await withBusy(`delete:${id}`, async () => {
      const res = await fetch(`/api/admin/notifications/recipients/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      await reload();
    });
  }

  async function sendTest() {
    setTestResult(null);
    await withBusy('test', async () => {
      const res = await fetch('/api/admin/notifications/test', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Test send failed');
      setTestResult(json);
    });
  }

  const enabledLeadCount = recipients.filter((r) => r.active && r.notifyOnLead).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-maxxed-blue" />
            Notifications
          </h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl leading-relaxed">
            Phone numbers that get an SMS when a lead applies or a sale closes.
            Set this to your own number while QA-testing so closers don&apos;t
            get spammed; flip back when you&apos;re ready to go live.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy === 'test' || enabledLeadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
            title={
              enabledLeadCount === 0
                ? 'Add a recipient with "lead" enabled first'
                : 'Send a test SMS'
            }
          >
            {busy === 'test' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send test
          </button>
          {!adding && (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-maxxed-blue-dark cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add recipient
            </button>
          )}
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {testResult && (
        <div
          className={`text-sm px-4 py-3 rounded-lg border flex items-start gap-2 ${
            testResult.failures.length === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {testResult.failures.length === 0 ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-semibold">
              Test sent: {testResult.sent} / {testResult.total} succeeded
            </p>
            {testResult.failures.length > 0 && (
              <ul className="mt-1.5 list-disc list-inside text-xs">
                {testResult.failures.map((f, i) => (
                  <li key={i}>
                    {f.label ?? f.phone}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Add form (above table) */}
      {adding && (
        <RecipientForm
          mode="create"
          onSave={createRecipient}
          onCancel={() => {
            setAdding(false);
            setError(null);
          }}
          busy={busy === 'create'}
        />
      )}

      {/* Editing form (above table) */}
      {editingId && (
        <RecipientForm
          mode="edit"
          initial={recipients.find((r) => r.id === editingId)}
          onSave={(patch) => updateRecipient(editingId, patch)}
          onCancel={() => setEditingId(null)}
          busy={busy === `update:${editingId}`}
        />
      )}

      {/* Mobile: card stack (below sm). Same data, no horizontal scroll. */}
      <div className="sm:hidden space-y-3">
        {recipients.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-10 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
              <Bell className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-700 text-sm">No recipients yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Tap <span className="font-semibold">Add recipient</span> above.
            </p>
          </div>
        ) : (
          recipients.map((r) => (
            <RecipientMobileCard
              key={r.id}
              recipient={r}
              onToggle={(field, value) =>
                updateRecipient(r.id, { [field]: value })
              }
              onEdit={() => {
                setEditingId(r.id);
                setAdding(false);
                setError(null);
              }}
              onDelete={() => deleteRecipient(r.id, r.label || r.phone)}
              busy={busy === `update:${r.id}` || busy === `delete:${r.id}`}
            />
          ))
        )}
      </div>

      {/* Desktop: table (sm+) */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-[0.14em] text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Label</th>
              <th className="text-left px-4 py-3 font-bold">Phone</th>
              <th className="text-left px-4 py-3 font-bold">Sources</th>
              <th className="text-center px-4 py-3 font-bold w-20">Lead</th>
              <th className="text-center px-4 py-3 font-bold w-20">Sale</th>
              <th className="text-center px-4 py-3 font-bold w-20">Active</th>
              <th className="text-right px-4 py-3 font-bold w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recipients.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-gray-700">No recipients yet</p>
                  <p className="text-xs mt-1">
                    Click <span className="font-semibold">Add recipient</span>{' '}
                    above to set up your test number.
                  </p>
                </td>
              </tr>
            ) : (
              recipients.map((r) => (
                <RecipientRow
                  key={r.id}
                  recipient={r}
                  onToggle={(field, value) =>
                    updateRecipient(r.id, { [field]: value })
                  }
                  onEdit={() => {
                    setEditingId(r.id);
                    setAdding(false);
                    setError(null);
                  }}
                  onDelete={() => deleteRecipient(r.id, r.label || r.phone)}
                  busy={busy === `update:${r.id}` || busy === `delete:${r.id}`}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        SMS is sent through the GoHighLevel number already provisioned for this
        location (no new credentials). To swap to Twilio direct later, change{' '}
        <span className="font-mono">sendSmsToRecipient</span> in{' '}
        <span className="font-mono">src/lib/sms.ts</span>.
      </p>

      <SlackChannelsSection />
    </div>
  );
}

/* ─── Row + Form ──────────────────────────────────────────────── */

function RecipientRow({
  recipient: r,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  recipient: Recipient;
  onToggle: (field: keyof Recipient, value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const subscribesToAll = r.sources.length === 0;
  return (
    <tr className={`transition-opacity ${r.active ? '' : 'opacity-60'}`}>
      <td className="px-4 py-3 align-middle">
        {r.label ? (
          <span className="font-semibold text-gray-900">{r.label}</span>
        ) : (
          <span className="italic text-gray-400">Unlabeled</span>
        )}
      </td>
      <td className="px-4 py-3 align-middle font-mono text-xs text-gray-700">
        {r.phone}
      </td>
      <td className="px-4 py-3 align-middle">
        {subscribesToAll ? (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] bg-maxxed-blue/10 text-maxxed-blue rounded ring-1 ring-maxxed-blue/20">
            All sources
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.sources.map((s) => {
              const opt = SOURCE_OPTIONS.find((o) => o.value === s);
              return (
                <span
                  key={s}
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] bg-gray-100 text-gray-700 rounded ring-1 ring-gray-200"
                  title={opt?.label ?? s}
                >
                  {opt?.short ?? s}
                </span>
              );
            })}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex justify-center">
          <Switch
            checked={r.notifyOnLead}
            onChange={(v) => onToggle('notifyOnLead', v)}
            disabled={busy}
            ariaLabel="Toggle lead notifications"
          />
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex justify-center">
          <Switch
            checked={r.notifyOnSale}
            onChange={(v) => onToggle('notifyOnSale', v)}
            disabled={busy}
            ariaLabel="Toggle sale notifications"
          />
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex justify-center">
          <Switch
            checked={r.active}
            onChange={(v) => onToggle('active', v)}
            disabled={busy}
            ariaLabel="Toggle active"
          />
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="p-1.5 rounded-md text-gray-400 hover:text-maxxed-blue hover:bg-maxxed-blue/5 disabled:opacity-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
            title="Edit"
            aria-label={`Edit ${r.label || r.phone}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
            title="Delete"
            aria-label={`Delete ${r.label || r.phone}`}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function RecipientMobileCard({
  recipient: r,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  recipient: Recipient;
  onToggle: (field: keyof Recipient, value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const subscribesToAll = r.sources.length === 0;
  return (
    <article
      className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-opacity ${
        r.active ? '' : 'opacity-70'
      }`}
    >
      {/* Top: identity + actions */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900 truncate">
            {r.label || (
              <span className="italic font-medium text-gray-400">Unlabeled</span>
            )}
          </div>
          <div className="font-mono text-xs text-gray-500 truncate mt-0.5">
            {r.phone}
          </div>
        </div>
        <div className="flex items-center gap-0.5 -mr-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="p-1.5 rounded-md text-gray-400 hover:text-maxxed-blue hover:bg-maxxed-blue/5 disabled:opacity-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
            aria-label={`Edit ${r.label || r.phone}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
            aria-label={`Delete ${r.label || r.phone}`}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Sources row */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {subscribesToAll ? (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] bg-maxxed-blue/10 text-maxxed-blue rounded ring-1 ring-maxxed-blue/20">
            All sources
          </span>
        ) : (
          r.sources.map((s) => {
            const opt = SOURCE_OPTIONS.find((o) => o.value === s);
            return (
              <span
                key={s}
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] bg-gray-100 text-gray-700 rounded ring-1 ring-gray-200"
                title={opt?.label ?? s}
              >
                {opt?.short ?? s}
              </span>
            );
          })
        )}
      </div>

      {/* Toggle rows — full-width labelled rows so the labels never get cut */}
      <div className="border-t border-gray-100 divide-y divide-gray-100">
        <MobileToggleRow
          label="Notify on lead"
          checked={r.notifyOnLead}
          onChange={(v) => onToggle('notifyOnLead', v)}
          disabled={busy}
        />
        <MobileToggleRow
          label="Notify on sale"
          checked={r.notifyOnSale}
          onChange={(v) => onToggle('notifyOnSale', v)}
          disabled={busy}
        />
        <MobileToggleRow
          label="Active"
          checked={r.active}
          onChange={(v) => onToggle('active', v)}
          disabled={busy}
        />
      </div>
    </article>
  );
}

function MobileToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        ariaLabel={label}
      />
    </div>
  );
}

function RecipientForm({
  mode,
  initial,
  onSave,
  onCancel,
  busy,
}: {
  mode: 'create' | 'edit';
  initial?: Recipient;
  onSave: (data: {
    phone: string;
    label: string;
    notifyOnLead: boolean;
    notifyOnSale: boolean;
    sources: string[];
  }) => void | Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [notifyOnLead, setNotifyOnLead] = useState(initial?.notifyOnLead ?? true);
  const [notifyOnSale, setNotifyOnSale] = useState(initial?.notifyOnSale ?? true);
  const [sources, setSources] = useState<string[]>(initial?.sources ?? []);
  const allSources = sources.length === 0;

  function toggleSource(value: string) {
    setSources((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    onSave({
      phone: phone.trim(),
      label: label.trim(),
      notifyOnLead,
      notifyOnSale,
      sources,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border-2 border-maxxed-blue/30 ring-2 ring-maxxed-blue/10 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 bg-maxxed-blue/[0.04] flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          {mode === 'create' ? (
            <>
              <Plus className="w-4 h-4 text-maxxed-blue" strokeWidth={2.5} />
              New recipient
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4 text-maxxed-blue" />
              Edit recipient
            </>
          )}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Label" hint="Friendly name (e.g. CJ test, Brian)">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="CJ (test)"
              autoComplete="name"
              autoFocus={mode === 'create'}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
            />
          </Field>
          <Field label="Phone" required hint="With country code (+1…)">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 937 555 1234"
              autoComplete="tel"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
            />
          </Field>
        </div>

        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 mb-2">
            Notify when
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleRow
              label="A lead applies"
              hint="New form submission"
              checked={notifyOnLead}
              onChange={setNotifyOnLead}
            />
            <ToggleRow
              label="A sale closes"
              hint="Payment succeeds"
              checked={notifyOnSale}
              onChange={setNotifyOnSale}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 mb-2">
            Sources{' '}
            <span className="font-normal normal-case tracking-normal text-gray-400">
              · which funnels send to this number
            </span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <SourceChip
              active={allSources}
              onToggle={() => setSources([])}
              label="All sources"
              emphasis
            />
            {SOURCE_OPTIONS.map((opt) => (
              <SourceChip
                key={opt.value}
                active={sources.includes(opt.value)}
                onToggle={() => toggleSource(opt.value)}
                label={opt.label}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="bg-gray-50/70 border-t border-gray-100 px-4 py-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !phone.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-maxxed-blue text-white text-sm font-semibold shadow-sm hover:bg-maxxed-blue-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" strokeWidth={2.5} />
          )}
          {mode === 'create' ? 'Add recipient' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 leading-tight">
          {label}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
          {hint}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

function SourceChip({
  active,
  onToggle,
  label,
  emphasis,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 ${
        active
          ? emphasis
            ? 'bg-maxxed-blue text-white border-maxxed-blue shadow-sm'
            : 'bg-maxxed-blue/10 text-maxxed-blue border-maxxed-blue/30'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      <span
        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded ring-1 ${
          active
            ? emphasis
              ? 'bg-white ring-white text-maxxed-blue'
              : 'bg-maxxed-blue ring-maxxed-blue text-white'
            : 'bg-white ring-gray-300'
        }`}
      >
        {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}
