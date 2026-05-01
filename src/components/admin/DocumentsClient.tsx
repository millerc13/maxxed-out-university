'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileSignature,
  Search,
  Plus,
  Loader2,
  RefreshCw,
  XCircle,
  Download,
  ExternalLink,
  Pencil,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  Inbox,
  X,
} from 'lucide-react';

type PaymentPlan = {
  installments: number;
  perInstallmentCents: number;
  frequency: 'monthly' | 'quarterly';
  firstDueAt: string;
};

type Row = {
  id: string;
  status: string; // draft | sent | viewed | completed | declined | cancelled | expired
  origin: string; // auto_self_checkout | manual_admin
  recipientEmail: string;
  recipientName: string | null;
  courseTitle: string;
  paymentTotalCents: number | null;
  paymentPlan: PaymentPlan | null;
  notes: string | null;
  createdAt: string;
  sentAt: string | null;
  firstViewedAt: string | null;
  signedAt: string | null;
  cancelledAt: string | null;
  declinedAt: string | null;
};

type Course = { id: string; title: string; priceCents: number | null };

type Props = {
  initialRows: Row[];
  courses: Course[];
  activeTemplate: { name: string; updatedAt: string } | null;
};

type FilterKey = 'all' | 'sent' | 'viewed' | 'completed' | 'declined' | 'cancelled';

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  sent: { label: 'Sent', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  viewed: { label: 'Viewed', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  completed: { label: 'Signed', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
};

function formatUsd(cents: number | null): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialOf(row: Row): string {
  return (row.recipientName || row.recipientEmail || '?').trim().charAt(0).toUpperCase();
}

export function DocumentsClient({ initialRows, courses, activeTemplate }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // KPI counts derived from the unfiltered list so totals don't shift
  // as the admin types in the search box.
  const counts = useMemo(() => {
    const total = rows.length;
    const awaiting = rows.filter((r) => r.status === 'sent' || r.status === 'viewed').length;
    const signed = rows.filter((r) => r.status === 'completed').length;
    const stByKey: Record<string, number> = {};
    for (const r of rows) stByKey[r.status] = (stByKey[r.status] ?? 0) + 1;
    return { total, awaiting, signed, stByKey };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === 'all') return true;
        return r.status === filter;
      })
      .filter((r) => {
        if (!q) return true;
        return (
          (r.recipientName ?? '').toLowerCase().includes(q) ||
          r.recipientEmail.toLowerCase().includes(q) ||
          r.courseTitle.toLowerCase().includes(q)
        );
      });
  }, [rows, search, filter]);

  async function refresh() {
    try {
      // No GET endpoint — page just reloads via Next router refresh
      // logic. We use window.location.reload for simplicity since this
      // page is server-rendered with dynamic=force-dynamic.
      window.location.reload();
    } catch {
      // ignored
    }
  }

  async function handleResend(row: Row) {
    if (busyId) return;
    setError(null);
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/documents/${row.id}/resend`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to resend');
      // Optimistic touch — update sentAt locally so the row reflects.
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, sentAt: new Date().toISOString() } : r)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(row: Row) {
    if (busyId) return;
    const reason = window.prompt(
      `Cancel agreement for ${row.recipientName || row.recipientEmail}? Optional reason for audit trail:`,
      '',
    );
    // null = clicked Cancel button in browser prompt (abort), '' = OK with no reason
    if (reason === null) return;
    setError(null);
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/documents/${row.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Cancel failed');
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: 'cancelled', cancelledAt: new Date().toISOString() } : r,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function handleDownload(row: Row) {
    if (row.status !== 'completed') return;
    window.open(`/api/admin/documents/${row.id}/pdf`, '_blank');
  }

  // Clear the global error banner after 6s automatically.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-maxxed-blue text-white shadow-sm shrink-0">
            <FileSignature className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
              Documents
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
              Enrollment agreements signed via e-signature.{' '}
              {activeTemplate ? (
                <>
                  Active template: <span className="font-semibold text-gray-700">{activeTemplate.name}</span>
                </>
              ) : (
                <span className="text-amber-700 font-semibold">No active template</span>
              )}
              .
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/documents/template"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs sm:text-sm font-semibold shadow-sm hover:bg-gray-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit template</span>
            <span className="sm:hidden">Template</span>
          </Link>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            disabled={composeOpen}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm hover:bg-maxxed-blue-dark disabled:opacity-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Compose</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <section
        aria-label="Documents summary"
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        <KpiCard
          icon={Inbox}
          label="Total"
          value={String(counts.total)}
          tone="neutral"
        />
        <KpiCard
          icon={Clock}
          label="Awaiting"
          value={String(counts.awaiting)}
          tone="amber"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Signed"
          value={String(counts.signed)}
          tone="emerald"
        />
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="w-4 h-4 text-red-500 hover:text-red-700" />
          </button>
        </div>
      )}

      {/* Compose modal/inline */}
      {composeOpen && (
        <ComposeForm
          courses={courses}
          onClose={() => setComposeOpen(false)}
          onCreated={() => {
            setComposeOpen(false);
            void refresh();
          }}
        />
      )}

      {/* Search + filter */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100"
      >
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, email, or course…"
            className="flex-1 bg-transparent text-sm placeholder:text-gray-400 outline-none focus:outline-none"
            aria-label="Filter documents"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
          {(['all', 'sent', 'viewed', 'completed', 'declined', 'cancelled'] as const).map((f) => {
            const isActive = filter === f;
            const count = f === 'all' ? counts.total : counts.stByKey[f] ?? 0;
            const label =
              f === 'all'
                ? 'All'
                : f === 'completed'
                  ? 'Signed'
                  : f.charAt(0).toUpperCase() + f.slice(1);
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 ${
                  isActive
                    ? 'bg-maxxed-blue text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-gray-500 ring-1 ring-gray-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </form>

      {/* Mobile card stack (below sm) */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 ? (
          <EmptyState filtered={!!search || filter !== 'all'} />
        ) : (
          filtered.map((r) => (
            <DocumentMobileCard
              key={r.id}
              row={r}
              busy={busyId === r.id}
              onResend={() => handleResend(r)}
              onCancel={() => handleCancel(r)}
              onDownload={() => handleDownload(r)}
            />
          ))
        )}
      </div>

      {/* Desktop table (sm+) */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-[11px] uppercase tracking-[0.14em] text-gray-500">
              <th className="px-4 py-3 font-bold">Recipient</th>
              <th className="px-4 py-3 font-bold">Course</th>
              <th className="px-4 py-3 font-bold text-right">Amount</th>
              <th className="px-4 py-3 font-bold text-center">Status</th>
              <th className="px-4 py-3 font-bold">Activity</th>
              <th className="px-4 py-3 font-bold text-right w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <EmptyState filtered={!!search || filter !== 'all'} />
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <DocumentRow
                  key={r.id}
                  row={r}
                  busy={busyId === r.id}
                  onResend={() => handleResend(r)}
                  onCancel={() => handleCancel(r)}
                  onDownload={() => handleDownload(r)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileSignature;
  label: string;
  value: string;
  tone: 'neutral' | 'amber' | 'emerald';
}) {
  const toneCls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-gray-50 text-gray-700 ring-gray-200';
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-2.5 py-2.5 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
      <span
        className={`inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${toneCls}`}
      >
        <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          {label}
        </div>
        <div className="text-sm sm:text-base font-extrabold text-gray-900 tabular-nums leading-tight">
          {value}
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  row: r,
  busy,
  onResend,
  onCancel,
  onDownload,
}: {
  row: Row;
  busy: boolean;
  onResend: () => void;
  onCancel: () => void;
  onDownload: () => void;
}) {
  const badge = STATUS_BADGES[r.status] ?? STATUS_BADGES.draft;
  const isPending = r.status === 'sent' || r.status === 'viewed' || r.status === 'draft';
  const isCompleted = r.status === 'completed';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maxxed-blue text-white text-xs font-extrabold shadow-sm">
            {initialOf(r)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate capitalize">
              {r.recipientName || r.recipientEmail}
            </p>
            {r.recipientName && (
              <p className="text-xs text-gray-500 truncate">{r.recipientEmail}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="text-sm text-gray-700 truncate">{r.courseTitle}</p>
        {r.origin === 'manual_admin' && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 mt-1">
            Manual
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-middle text-right tabular-nums">
        <div className="font-semibold text-gray-900">{formatUsd(r.paymentTotalCents)}</div>
        {r.paymentPlan && (
          <div className="text-[11px] text-gray-500 mt-0.5">
            {r.paymentPlan.installments}× {formatUsd(r.paymentPlan.perInstallmentCents)}{' '}
            {r.paymentPlan.frequency}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-middle text-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-[0.14em] ${badge.cls}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="text-xs text-gray-700">
          {isCompleted && r.signedAt ? (
            <>Signed {formatRelative(r.signedAt)}</>
          ) : r.status === 'cancelled' && r.cancelledAt ? (
            <>Cancelled {formatRelative(r.cancelledAt)}</>
          ) : r.firstViewedAt ? (
            <>Viewed {formatRelative(r.firstViewedAt)}</>
          ) : r.sentAt ? (
            <>Sent {formatRelative(r.sentAt)}</>
          ) : (
            <>Created {formatRelative(r.createdAt)}</>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={onResend}
            disabled={busy || !isPending}
            className="p-1.5 rounded-md text-gray-400 hover:text-maxxed-blue hover:bg-maxxed-blue/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
            title={isPending ? 'Resend signing email' : 'Resend not available'}
            aria-label="Resend"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy || !isPending}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
            title={isPending ? 'Cancel agreement' : 'Cancel not available'}
            aria-label="Cancel"
          >
            <XCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={busy || !isCompleted}
            className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
            title={isCompleted ? 'Download signed PDF' : 'Download available after signing'}
            aria-label="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DocumentMobileCard({
  row: r,
  busy,
  onResend,
  onCancel,
  onDownload,
}: {
  row: Row;
  busy: boolean;
  onResend: () => void;
  onCancel: () => void;
  onDownload: () => void;
}) {
  const badge = STATUS_BADGES[r.status] ?? STATUS_BADGES.draft;
  const isPending = r.status === 'sent' || r.status === 'viewed' || r.status === 'draft';
  const isCompleted = r.status === 'completed';
  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maxxed-blue text-white text-sm font-extrabold shadow-sm">
          {initialOf(r)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate capitalize">
              {r.recipientName || r.recipientEmail}
            </p>
            <span
              className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-[0.14em] ${badge.cls}`}
            >
              {badge.label}
            </span>
          </div>
          {r.recipientName && (
            <p className="text-xs text-gray-500 truncate">{r.recipientEmail}</p>
          )}
          <p className="text-xs text-gray-700 mt-1 truncate">
            {r.courseTitle} · <span className="font-semibold">{formatUsd(r.paymentTotalCents)}</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isCompleted && r.signedAt
              ? `Signed ${formatRelative(r.signedAt)}`
              : r.status === 'cancelled' && r.cancelledAt
                ? `Cancelled ${formatRelative(r.cancelledAt)}`
                : r.firstViewedAt
                  ? `Viewed ${formatRelative(r.firstViewedAt)}`
                  : r.sentAt
                    ? `Sent ${formatRelative(r.sentAt)}`
                    : `Created ${formatRelative(r.createdAt)}`}
          </p>
        </div>
      </div>
      <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
        <button
          type="button"
          onClick={onResend}
          disabled={busy || !isPending}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Resend
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy || !isPending}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={busy || !isCompleted}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </article>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-6 py-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
        <FileSignature className="w-6 h-6" />
      </span>
      <p className="text-sm font-semibold text-gray-700 mb-1">
        {filtered ? 'No documents match your filter' : 'No documents yet'}
      </p>
      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
        {filtered
          ? 'Try clearing the search or switching the chip above.'
          : 'The first one will appear when a customer self-checks out, or you can compose one manually.'}
      </p>
    </div>
  );
}

/* ─── Compose form ─────────────────────────────────────── */

function ComposeForm({
  courses,
  onClose,
  onCreated,
}: {
  courses: Course[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [customCourseTitle, setCustomCourseTitle] = useState('');
  const [paymentTotalDollars, setPaymentTotalDollars] = useState('');
  const [scheduleType, setScheduleType] = useState<'full' | 'plan'>('full');
  const [installments, setInstallments] = useState('2');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly'>('monthly');
  const [firstDueAt, setFirstDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.id === courseId) ?? null;
  const courseTitle = selectedCourse?.title || customCourseTitle.trim();

  // Auto-fill total from course price when a course is picked.
  useEffect(() => {
    if (selectedCourse?.priceCents != null) {
      setPaymentTotalDollars((selectedCourse.priceCents / 100).toFixed(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const totalCents = (() => {
    const n = parseFloat(paymentTotalDollars);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  })();
  const installmentsN = parseInt(installments, 10);
  const perInstallmentCents = Number.isFinite(totalCents) && installmentsN >= 2
    ? Math.round(totalCents / installmentsN)
    : 0;

  const canSubmit =
    !submitting &&
    recipientEmail.includes('@') &&
    recipientName.trim().length > 0 &&
    courseTitle.length > 0 &&
    Number.isFinite(totalCents) &&
    totalCents >= 0 &&
    (scheduleType === 'full' || (installmentsN >= 2 && firstDueAt.length > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim() || undefined,
        courseTitle,
        paymentTotalCents: totalCents,
        notes: notes.trim() || undefined,
      };
      if (selectedCourse) payload.courseId = selectedCourse.id;
      if (scheduleType === 'plan') {
        payload.paymentPlan = {
          installments: installmentsN,
          perInstallmentCents,
          frequency,
          firstDueAt,
        };
      }
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Send failed');
      onCreated();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-2 border-maxxed-blue/30 ring-2 ring-maxxed-blue/10 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 bg-maxxed-blue/[0.04] flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-maxxed-blue" strokeWidth={2.5} />
          New document
        </h3>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Recipient name" required>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Brian Johnson"
              autoComplete="name"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
            />
          </Field>
          <Field label="Recipient email" required>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="brian@example.com"
              autoComplete="email"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Course">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
            >
              <option value="">— Off-list / custom —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {!courseId && (
              <input
                type="text"
                value={customCourseTitle}
                onChange={(e) => setCustomCourseTitle(e.target.value)}
                placeholder="Custom course title"
                className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
              />
            )}
          </Field>
          <Field label="Payment total" required hint="USD, dollars">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={paymentTotalDollars}
                onChange={(e) => setPaymentTotalDollars(e.target.value)}
                required
                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
              />
            </div>
          </Field>
        </div>

        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 mb-2">
            Payment schedule
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <ScheduleOption
              active={scheduleType === 'full'}
              onClick={() => setScheduleType('full')}
              title="Paid in full"
              subtitle="One-time"
            />
            <ScheduleOption
              active={scheduleType === 'plan'}
              onClick={() => setScheduleType('plan')}
              title="Payment plan"
              subtitle="N installments"
            />
          </div>
          {scheduleType === 'plan' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <Field label="Installments">
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
                />
              </Field>
              <Field label="Frequency">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'monthly' | 'quarterly')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </Field>
              <Field label="First due">
                <input
                  type="date"
                  value={firstDueAt}
                  onChange={(e) => setFirstDueAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
                />
              </Field>
              {Number.isFinite(totalCents) && installmentsN >= 2 && (
                <p className="sm:col-span-3 text-xs text-gray-500">
                  Per installment: <span className="font-semibold text-gray-700 tabular-nums">{formatUsd(perInstallmentCents)}</span>
                </p>
              )}
            </div>
          )}
        </fieldset>

        <Field label="Notes (optional)" hint="Free text shown on the rendered contract">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors resize-none"
            placeholder="Custom payment terms, due dates, etc."
          />
        </Field>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{err}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-50/70 border-t border-gray-100 px-4 py-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-maxxed-blue text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-maxxed-blue-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Send agreement
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

function ScheduleOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 ${
        active
          ? 'border-maxxed-blue bg-maxxed-blue/5 text-maxxed-blue'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-bold leading-tight">{title}</div>
        <div className="text-[11px] opacity-80 leading-tight">{subtitle}</div>
      </div>
      <span
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? 'border-maxxed-blue bg-maxxed-blue' : 'border-gray-300 bg-white'
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}
