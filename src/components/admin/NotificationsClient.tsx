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
} from 'lucide-react';

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

// The known notification sources the admin can scope a recipient to.
// Keep slugs in sync with the funnel program detection (Host header
// suffix → 'blueprint' / 'mentorship' / 'donewithyou') and the
// university apply route's hard-coded 'university' source.
const SOURCE_OPTIONS: Array<{ value: string; label: string; short: string }> = [
  { value: 'blueprint', label: 'Blueprint funnel', short: 'BP' },
  { value: 'mentorship', label: 'Mentorship funnel', short: 'MT' },
  { value: 'donewithyou', label: 'DWY funnel', short: 'DWY' },
  { value: 'accelerator', label: 'Business Accelerator (stage-sell)', short: 'ACC' },
  { value: 'university', label: 'University site (/apply)', short: 'UNI' },
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
      const res = await fetch('/api/admin/notifications/recipients', { cache: 'no-store' });
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
    await withBusy(`update:${id}`, async () => {
      const res = await fetch(`/api/admin/notifications/recipients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update');
      setEditingId(null);
      await reload();
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-maxxed-blue" />
            Notifications
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 max-w-2xl">
            Phone numbers that get an SMS when a lead applies or a sale closes. Replaces the
            legacy GHL-opportunity → mastermind webhook path. Set this to your own number while
            QA-testing so closers don&apos;t get spammed; flip back when you&apos;re ready to go live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy === 'test' || enabledLeadCount === 0}
            className="flex items-center gap-2 px-3 py-2 border border-maxxed-blue/30 text-maxxed-blue rounded-lg text-sm font-semibold hover:bg-maxxed-blue/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={enabledLeadCount === 0 ? 'Add a recipient with "lead" enabled first' : ''}
          >
            {busy === 'test' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send test SMS
          </button>
          {!adding && (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setError(null);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark"
            >
              <Plus className="w-4 h-4" />
              Add recipient
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`text-sm px-4 py-3 rounded-lg border ${
            testResult.failures.length === 0
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
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
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Label</th>
              <th className="text-left px-4 py-2 font-semibold">Phone</th>
              <th className="text-left px-4 py-2 font-semibold">Sources</th>
              <th className="text-center px-4 py-2 font-semibold">Lead</th>
              <th className="text-center px-4 py-2 font-semibold">Sale</th>
              <th className="text-center px-4 py-2 font-semibold">Active</th>
              <th className="text-right px-4 py-2 font-semibold w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adding && (
              <RecipientFormRow
                onSave={createRecipient}
                onCancel={() => {
                  setAdding(false);
                  setError(null);
                }}
                busy={busy === 'create'}
              />
            )}

            {recipients.length === 0 && !adding ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                  No recipients yet. Click <span className="font-semibold">Add recipient</span> to set up your test number.
                </td>
              </tr>
            ) : (
              recipients.map((r) =>
                editingId === r.id ? (
                  <RecipientFormRow
                    key={r.id}
                    initial={r}
                    onSave={(patch) => updateRecipient(r.id, patch)}
                    onCancel={() => setEditingId(null)}
                    busy={busy === `update:${r.id}`}
                  />
                ) : (
                  <RecipientRow
                    key={r.id}
                    recipient={r}
                    onToggle={(field, value) => updateRecipient(r.id, { [field]: value })}
                    onEdit={() => {
                      setEditingId(r.id);
                      setError(null);
                    }}
                    onDelete={() => deleteRecipient(r.id, r.label || r.phone)}
                    busy={busy === `update:${r.id}` || busy === `delete:${r.id}`}
                  />
                )
              )
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        SMS is sent through the GoHighLevel number already provisioned for this location (no
        new credentials). To swap to Twilio direct later, change <span className="font-mono">
        sendSmsToRecipient</span> in <span className="font-mono">src/lib/sms.ts</span> — the
        recipient list and admin UI stay the same.
      </p>
    </div>
  );
}

function RecipientRow({
  recipient,
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
  const subscribesToAll = recipient.sources.length === 0;

  return (
    <tr className={recipient.active ? '' : 'opacity-60'}>
      <td className="px-4 py-3">
        {recipient.label ? (
          <span className="font-medium text-gray-900">{recipient.label}</span>
        ) : (
          <span className="italic text-gray-400">(unlabeled)</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-700">{recipient.phone}</td>
      <td className="px-4 py-3">
        {subscribesToAll ? (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-maxxed-blue rounded">
            All sources
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {recipient.sources.map((s) => {
              const opt = SOURCE_OPTIONS.find((o) => o.value === s);
              return (
                <span
                  key={s}
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 rounded"
                  title={opt?.label ?? s}
                >
                  {opt?.short ?? s}
                </span>
              );
            })}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <Checkbox
          checked={recipient.notifyOnLead}
          onChange={(v) => onToggle('notifyOnLead', v)}
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <Checkbox
          checked={recipient.notifyOnSale}
          onChange={(v) => onToggle('notifyOnSale', v)}
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <Checkbox
          checked={recipient.active}
          onChange={(v) => onToggle('active', v)}
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="p-1.5 text-gray-500 hover:text-maxxed-blue hover:bg-gray-100 rounded disabled:opacity-50"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RecipientFormRow({
  initial,
  onSave,
  onCancel,
  busy,
}: {
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

  return (
    <tr className="bg-blue-50/30">
      <td className="px-4 py-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="CJ (test)"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          autoFocus
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 937 555 1234"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
        />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={allSources}
              onChange={() => setSources([])}
              className="w-3.5 h-3.5 text-maxxed-blue rounded"
            />
            <span className={`font-bold ${allSources ? 'text-maxxed-blue' : 'text-gray-500'}`}>
              All sources
            </span>
          </label>
          <div className="space-y-0.5">
            {SOURCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={sources.includes(opt.value)}
                  onChange={() => toggleSource(opt.value)}
                  className="w-3.5 h-3.5 text-maxxed-blue rounded"
                />
                <span className="text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <Checkbox checked={notifyOnLead} onChange={setNotifyOnLead} disabled={busy} />
      </td>
      <td className="px-4 py-3 text-center">
        <Checkbox checked={notifyOnSale} onChange={setNotifyOnSale} disabled={busy} />
      </td>
      <td className="px-4 py-3 text-center text-xs text-gray-500">on save</td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSave({ phone, label, notifyOnLead, notifyOnSale, sources })}
            disabled={busy || !phone.trim()}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            title="Save"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function Checkbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-4 h-4 text-maxxed-blue rounded cursor-pointer"
    />
  );
}
