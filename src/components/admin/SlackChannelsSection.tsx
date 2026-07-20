'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Slack,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Hash,
  Send,
  ExternalLink,
  Code2,
  ChevronDown,
} from 'lucide-react';
import { Switch } from '@/components/admin/Toggle';

interface SlackChannel {
  id: string;
  name: string;
  channel: string | null;
  webhookUrlMasked: string;
  hasWebhook: boolean;
  eventTypes: string[];
  sources: string[];
  active: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const EVENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'lead', label: 'Leads (apply submitted)' },
  { value: 'sale', label: 'Sales (purchase completed)' },
  { value: 'dd_application', label: 'DD applications' },
  { value: 'abandoned_checkout', label: 'Abandoned checkouts' },
  { value: 'contract_signed', label: 'Contracts signed' },
  { value: 'cohort_application', label: 'Cohort applications (webinar)' },
];

const SOURCE_OPTIONS: Array<{ value: string; label: string; short: string }> = [
  { value: 'blueprint', label: 'Blueprint funnel', short: 'BP' },
  { value: 'mentorship', label: 'Mentorship funnel', short: 'MT' },
  { value: 'business-mentorship', label: 'BAM (Business + Mentorship)', short: 'BAM' },
  { value: 'donewithyou', label: 'DWY funnel (legacy alias)', short: 'DWY' },
  { value: 'accelerator', label: 'Business Accelerator', short: 'ACC' },
  { value: 'university', label: 'University /apply', short: 'UNI' },
  { value: 'dd-healthcare', label: 'DD Healthcare', short: 'DD' },
  { value: 'medicaid-cohort', label: 'Medicaid 12-week cohort', short: 'COH' },
  { value: 'experience', label: 'Inner Circle Experience', short: 'IC' },
];

export function SlackChannelsSection() {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function reload() {
    const res = await fetch('/api/admin/notifications/slack-channels', { cache: 'no-store' });
    const json = await res.json();
    setChannels(json.channels || []);
    setLoaded(true);
  }

  useEffect(() => {
    reload().catch(() => setLoaded(true));
  }, []);

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  async function createChannel(input: {
    name: string;
    channel: string;
    webhookUrl: string;
    eventTypes: string[];
    sources: string[];
    active: boolean;
  }) {
    return withBusy('create', async () => {
      const res = await fetch('/api/admin/notifications/slack-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Create failed');
      }
      setAdding(false);
      await reload();
    });
  }

  async function updateChannel(
    id: string,
    patch: Partial<{
      name: string;
      channel: string | null;
      webhookUrl: string;
      eventTypes: string[];
      sources: string[];
      active: boolean;
    }>,
  ) {
    return withBusy(`update:${id}`, async () => {
      const res = await fetch(`/api/admin/notifications/slack-channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Update failed');
      }
      setEditingId(null);
      await reload();
    });
  }

  async function deleteChannel(id: string) {
    if (!confirm('Delete this Slack channel? Alerts will stop firing to it immediately.')) return;
    return withBusy(`delete:${id}`, async () => {
      const res = await fetch(`/api/admin/notifications/slack-channels/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      await reload();
    });
  }

  async function testChannel(id: string) {
    return withBusy(`test:${id}`, async () => {
      const res = await fetch(`/api/admin/notifications/slack-channels/${id}/test`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Test failed');
      }
      setToast({ kind: 'ok', text: 'Test alert sent — check Slack' });
      setTimeout(() => setToast(null), 4000);
    });
  }

  return (
    <section className="mt-8 sm:mt-10">
      {/* Section header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#4A154B]/10">
            <Slack className="w-5 h-5 text-[#4A154B]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Slack Channels</h2>
            <p className="mt-0.5 text-[13px] text-gray-600 leading-relaxed max-w-2xl">
              Each channel = one Slack incoming-webhook URL with its own filter for event types and
              traffic sources. Add as many as you want — events fan out to every matching channel.
              Generate webhook URLs in your{' '}
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-maxxed-blue hover:underline cursor-pointer inline-flex items-center gap-0.5"
              >
                Slack app <ExternalLink className="w-3 h-3" />
              </a>{' '}
              under Incoming Webhooks.
            </p>
          </div>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-maxxed-blue text-white text-sm font-bold hover:bg-maxxed-blue/90 cursor-pointer transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add channel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 inline-flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {toast && (
        <div
          className={`mb-4 inline-flex items-start gap-2 rounded-lg px-4 py-3 text-sm border ${
            toast.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {adding && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <ChannelForm
            onCancel={() => setAdding(false)}
            onSubmit={createChannel}
            busy={busy === 'create'}
          />
        </div>
      )}

      {!loaded ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          Loading channels…
        </div>
      ) : channels.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Slack className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-700 font-medium">No Slack channels configured yet</p>
          <p className="text-[12px] text-gray-500 mt-1">
            Add one to start receiving alerts in Slack.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {channels.map((c) =>
            editingId === c.id ? (
              <div
                key={c.id}
                className="rounded-xl border border-maxxed-blue/30 bg-white p-5 shadow-sm"
              >
                <ChannelForm
                  initial={c}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(patch) => updateChannel(c.id, patch)}
                  busy={busy === `update:${c.id}`}
                />
              </div>
            ) : (
              <ChannelRow
                key={c.id}
                channel={c}
                onEdit={() => setEditingId(c.id)}
                onDelete={() => deleteChannel(c.id)}
                onToggleActive={(active) => updateChannel(c.id, { active })}
                onTest={() => testChannel(c.id)}
                busyKey={busy}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

interface DeliveryLog {
  id: string;
  source: string;
  event: string;
  status: string;
  errorMessage: string | null;
  processedAt: string;
  payload: {
    channelName?: string;
    headline?: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

function ChannelRow({
  channel,
  onEdit,
  onDelete,
  onToggleActive,
  onTest,
  busyKey,
}: {
  channel: SlackChannel;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onTest: () => void;
  busyKey: string | null;
}) {
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<DeliveryLog[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  async function loadLogs() {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await fetch(
        `/api/admin/notifications/slack-channels/${channel.id}/logs`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load logs');
      setLogs(json.logs ?? []);
    } catch (e: any) {
      setLogsError(e.message || 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }

  function toggleLogs() {
    const next = !logsOpen;
    setLogsOpen(next);
    if (next && logs === null && !logsLoading) void loadLogs();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left: identity */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4A154B]/10">
            <Slack className="w-4 h-4 text-[#4A154B]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-[15px] truncate">{channel.name}</h3>
              {channel.channel && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-gray-500">
                  <Hash className="w-3 h-3" />
                  {channel.channel.replace(/^#/, '')}
                </span>
              )}
              {!channel.active && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">
                  Paused
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5 truncate">
              {channel.webhookUrlMasked}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {channel.eventTypes.length === 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                  No event types
                </span>
              ) : (
                channel.eventTypes.map((e) => {
                  const opt = EVENT_TYPE_OPTIONS.find((o) => o.value === e);
                  return (
                    <span
                      key={e}
                      className="text-[10px] font-bold uppercase tracking-wider bg-maxxed-blue/10 text-maxxed-blue border border-maxxed-blue/20 px-1.5 py-0.5 rounded"
                    >
                      {opt?.label.split(' ')[0] ?? e}
                    </span>
                  );
                })
              )}
              {channel.sources.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded">
                  {channel.sources.length === 1 ? channel.sources[0] : `${channel.sources.length} sources`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={channel.active} onChange={onToggleActive} />
          <button
            type="button"
            onClick={onTest}
            disabled={busyKey === `test:${channel.id}`}
            title="Send a test message to this channel"
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-gray-600 hover:text-maxxed-blue hover:bg-maxxed-blue/5 disabled:opacity-40 cursor-pointer"
          >
            {busyKey === `test:${channel.id}` ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Test
          </button>
          <button
            type="button"
            onClick={toggleLogs}
            title="Show recent delivery logs for this channel"
            aria-expanded={logsOpen}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors ${
              logsOpen
                ? 'text-maxxed-blue bg-maxxed-blue/10'
                : 'text-gray-500 hover:text-maxxed-blue hover:bg-maxxed-blue/5'
            }`}
          >
            <Code2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busyKey === `delete:${channel.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
            title="Delete"
          >
            {busyKey === `delete:${channel.id}` ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {logsOpen && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              Recent deliveries
            </span>
            <button
              type="button"
              onClick={loadLogs}
              disabled={logsLoading}
              className="text-[11px] font-medium text-maxxed-blue hover:underline disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              {logsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Refresh
            </button>
          </div>

          {logsError ? (
            <p className="text-[12px] text-red-600">{logsError}</p>
          ) : logsLoading && logs === null ? (
            <p className="text-[12px] text-gray-500 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </p>
          ) : logs && logs.length === 0 ? (
            <p className="text-[12px] text-gray-500">
              No deliveries logged yet. A row appears here every time this
              channel fires (or fails to fire) a Slack alert.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {logs?.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-[12px]"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {log.status}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500">
                      {log.event}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(log.processedAt).toLocaleString()}
                    </span>
                  </div>
                  {log.payload?.headline && (
                    <p className="mt-1 text-gray-800 font-medium truncate">
                      {log.payload.headline}
                    </p>
                  )}
                  {(log.payload?.contactName || log.payload?.email) && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {log.payload?.contactName ?? ''}
                      {log.payload?.email ? ` · ${log.payload.email}` : ''}
                    </p>
                  )}
                  {log.errorMessage && (
                    <p className="mt-1 text-[11px] text-red-600 font-mono break-all">
                      {log.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelForm({
  initial,
  onCancel,
  onSubmit,
  busy,
}: {
  initial?: SlackChannel;
  onCancel: () => void;
  onSubmit: (input: {
    name: string;
    channel: string;
    webhookUrl: string;
    eventTypes: string[];
    sources: string[];
    active: boolean;
  }) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [channel, setChannel] = useState(initial?.channel ?? '');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>(initial?.eventTypes ?? ['lead', 'sale']);
  const [sources, setSources] = useState<string[]>(initial?.sources ?? []);
  const [active, setActive] = useState(initial?.active ?? true);

  const isEdit = !!initial;
  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !webhookUrl.trim()) return false;
    return true;
  }, [name, webhookUrl, isEdit]);

  function toggle(arr: string[], setArr: (next: string[]) => void, value: string) {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          name: name.trim(),
          channel: channel.trim(),
          webhookUrl: webhookUrl.trim(),
          eventTypes,
          sources,
          active,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Channel name" required hint="What you'll see in this admin list">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DD Applications"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 outline-none text-sm"
          />
        </Field>
        <Field
          label="Slack channel (optional)"
          hint="Display only — e.g. #dd-applications"
        >
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="#dd-applications"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 outline-none text-sm font-mono"
          />
        </Field>
      </div>

      <Field
        label={isEdit ? 'Replace webhook URL (optional)' : 'Slack incoming webhook URL'}
        required={!isEdit}
        hint={
          isEdit
            ? `Currently ${initial?.webhookUrlMasked ?? '—'}. Leave blank to keep the existing URL.`
            : 'From api.slack.com → your app → Incoming Webhooks → Add New Webhook to Workspace'
        }
      >
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 outline-none text-xs font-mono"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <Field
        label="Event types"
        hint="Which events fan out to this channel. Pick at least one."
      >
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium cursor-pointer transition-colors ${
                eventTypes.includes(o.value)
                  ? 'bg-maxxed-blue/10 border-maxxed-blue/30 text-maxxed-blue'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={eventTypes.includes(o.value)}
                onChange={() => toggle(eventTypes, setEventTypes, o.value)}
              />
              {eventTypes.includes(o.value) && <Check className="w-3 h-3" />}
              {o.label}
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Source filter"
        hint="Empty = all sources. Pick specific ones to scope this channel to those funnels."
      >
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium cursor-pointer transition-colors ${
                sources.includes(o.value)
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={sources.includes(o.value)}
                onChange={() => toggle(sources, setSources, o.value)}
              />
              {sources.includes(o.value) && <Check className="w-3 h-3" />}
              {o.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <Switch checked={active} onChange={setActive} />
          Active
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-maxxed-blue text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-maxxed-blue/90 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save changes' : 'Add channel'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
