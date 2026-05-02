'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { PdfPreviewModal } from './PdfPreviewModal';
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
  User as UserIcon,
  ChevronDown,
  X,
} from 'lucide-react';

type PickedUser = { id: string; email: string; name: string | null; phone?: string | null };

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

type Course = { id: string; slug: string; title: string; priceCents: number | null };

type TemplateOption = { id: string; name: string; active: boolean };

type Props = {
  initialRows: Row[];
  courses: Course[];
  activeTemplate: { name: string; updatedAt: string } | null;
  templates: TemplateOption[];
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

// YYYY-MM-DD in local time. Used by the per-installment date picker
// so values round-trip through `<input type="date">` without TZ shift.
function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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

export function DocumentsClient({ initialRows, courses, activeTemplate, templates }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // PDF preview modal — opens inline so PWA users (especially iOS
  // standalone) never get bounced out of the dashboard.
  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [prefillUser, setPrefillUser] = useState<PickedUser | null>(null);

  // Open Compose pre-filled when arriving from a user detail page's
  // "Send Contract" button. The user detail page passes the recipient
  // metadata directly via query params so we don't need a roundtrip.
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams?.get('prefillUserId');
    if (!id) return;
    const email = searchParams?.get('prefillEmail') ?? '';
    const name = searchParams?.get('prefillName') ?? '';
    if (!email) return;
    setPrefillUser({ id, email, name: name || null });
    setComposeOpen(true);
    // intentional one-shot — only on initial mount with these params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Open inline preview instead of `window.open(...,'_blank')`. The
    // tab-target approach broke the iOS PWA — Safari can't open new
    // tabs from a standalone window so the user got stranded with no
    // way back. Inline modal stays inside the PWA shell.
    setPreviewRow(row);
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
            href="/admin/documents/templates"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs sm:text-sm font-semibold shadow-sm hover:bg-gray-50 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Templates</span>
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
          templates={templates}
          prefillUser={prefillUser}
          onClose={() => {
            setComposeOpen(false);
            setPrefillUser(null);
          }}
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

      {previewRow && (
        <PdfPreviewModal
          url={`/api/admin/documents/${previewRow.id}/pdf`}
          title={`${previewRow.recipientName ?? previewRow.recipientEmail} — ${previewRow.courseTitle}`}
          filename={`${(previewRow.recipientName ?? 'recipient').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`}
          onClose={() => setPreviewRow(null)}
        />
      )}
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
  templates,
  prefillUser,
  onClose,
  onCreated,
}: {
  courses: Course[];
  templates: TemplateOption[];
  prefillUser?: PickedUser | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState(prefillUser?.email ?? '');
  const [recipientName, setRecipientName] = useState(prefillUser?.name ?? '');
  const [recipientPhone, setRecipientPhone] = useState(prefillUser?.phone ?? '');
  const [pickedUserId, setPickedUserId] = useState<string | null>(prefillUser?.id ?? null);
  // Default to the 6-Month Mentorship course when present — Todd's
  // most-composed contract. Falls back to off-list/custom when that
  // course doesn't exist in this environment.
  const defaultCourseId =
    courses.find((c) => c.slug === '6-month-mentorship')?.id ?? '';
  const [courseId, setCourseId] = useState<string>(defaultCourseId);
  const [customCourseTitle, setCustomCourseTitle] = useState('');
  const [paymentTotalDollars, setPaymentTotalDollars] = useState('');
  const [scheduleType, setScheduleType] = useState<'full' | 'plan'>('full');
  const [installments, setInstallments] = useState('2');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly'>('monthly');
  const [firstDueAt, setFirstDueAt] = useState('');
  // Per-installment dates. Auto-populated from firstDueAt + frequency
  // when admin changes either of those, but each row is editable —
  // admin can override any single date without re-typing the others.
  // Length == installments (kept in sync by the effect below).
  const [dueDates, setDueDates] = useState<string[]>([]);
  // Per-installment refundability. true = refundable, false = NON-REFUNDABLE.
  // Default per the contract is ALL non-refundable (matches "ALL SALES
  // ARE FINAL"). Admin flips individual rows on. Length == installments.
  const [refundable, setRefundable] = useState<boolean[]>([]);
  const [notes, setNotes] = useState('');
  // Template picker — defaults to the default template's id. Falls
  // through to whichever template has active=true server-side when
  // empty.
  const defaultId = templates.find((t) => t.active)?.id ?? '';
  const [templateId, setTemplateId] = useState<string>(defaultId);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Preview-document state. Click Preview → POST current form values
  // to /api/admin/documents/preview → render the returned HTML in a
  // dedicated modal so the admin can see exactly what the recipient
  // will see before firing the send.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewTemplateName, setPreviewTemplateName] = useState<string>('');
  const [previewError, setPreviewError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? templates.find((t) => t.active) ?? templates[0];

  const selectedCourse = courses.find((c) => c.id === courseId) ?? null;
  const courseTitle = selectedCourse?.title || customCourseTitle.trim();

  // Auto-fill total from course price when a course is picked.
  useEffect(() => {
    if (selectedCourse?.priceCents != null) {
      setPaymentTotalDollars((selectedCourse.priceCents / 100).toFixed(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Auto-populate per-installment dates from firstDueAt + frequency
  // whenever those (or the installment count) change. Admin can still
  // edit individual rows after this fires — we only OVERWRITE the
  // computed slots, preserving any existing edits up to the new
  // installment count.
  useEffect(() => {
    const n = parseInt(installments, 10);
    if (scheduleType !== 'plan' || !Number.isFinite(n) || n < 2 || !firstDueAt) {
      return;
    }
    setDueDates((prev) => {
      const next: string[] = [];
      const start = new Date(firstDueAt + 'T00:00:00');
      if (Number.isNaN(start.getTime())) return prev;
      const stepMonths = frequency === 'monthly' ? 1 : 3;
      for (let i = 0; i < n; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i * stepMonths, 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(start.getDate(), lastDay));
        next.push(toIsoDate(d));
      }
      // Only overwrite if computed differs from current — prevents
      // wiping admin's manual edits on unrelated re-renders.
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
      return next;
    });
    // Sync the refundable array length to installments. Default = false
    // (non-refundable) for any new rows. Preserves admin's previous
    // choices on rows that still exist after a count change.
    setRefundable((prev) => {
      if (prev.length === n) return prev;
      const next = Array.from({ length: n }, (_, i) => prev[i] ?? false);
      return next;
    });
  }, [firstDueAt, frequency, installments, scheduleType]);

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
    (scheduleType === 'full' ||
      // Plan: need 2+ installments AND every visible date row filled in.
      (installmentsN >= 2 &&
        dueDates.length === installmentsN &&
        dueDates.every((d) => d.length > 0)));

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      recipientEmail: recipientEmail.trim(),
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim() || undefined,
      courseTitle,
      paymentTotalCents: totalCents,
      notes: notes.trim() || undefined,
    };
    if (selectedCourse) payload.courseId = selectedCourse.id;
    if (templateId) payload.templateId = templateId;
    if (pickedUserId) payload.userId = pickedUserId;
    if (scheduleType === 'plan') {
      const plan: Record<string, unknown> = {
        installments: installmentsN,
        perInstallmentCents,
        frequency,
        firstDueAt,
      };
      // Send dueDates only when the array is well-formed (one per
      // installment, all non-empty). Server then renders the contract
      // schedule using these exact dates instead of computing from
      // firstDueAt + frequency.
      if (dueDates.length === installmentsN && dueDates.every((d) => d.length > 0)) {
        plan.dueDates = dueDates;
      }
      // Send refundable only if the array length matches and at least
      // one row was flipped — saves payload bytes when admin hasn't
      // touched the toggles (default = all non-refundable handled
      // server-side).
      if (refundable.length === installmentsN && refundable.some(Boolean)) {
        plan.refundable = refundable;
      }
      payload.paymentPlan = plan;
    }
    return payload;
  }

  async function handlePreview() {
    if (!canSubmit) return;
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewHtml('');
    try {
      const res = await fetch('/api/admin/documents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Preview failed');
      setPreviewHtml(json.html ?? '');
      setPreviewTemplateName(json.templateName ?? selectedTemplate?.name ?? '');
    } catch (e) {
      setPreviewError((e as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
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
      {/* Brand-block header — anchors the modal on the template
          being sent. Single full-bleed maxxed-blue strip; the title
          row, eyebrow + name, and Change picker all live inside. */}
      <header className="bg-maxxed-blue text-white px-4 sm:px-5 pt-4 pb-3 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-3 right-3 p-1 rounded-md text-white/70 hover:text-white hover:bg-white/15 cursor-pointer transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 sm:gap-4 pr-7">
          <span
            aria-hidden
            className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25"
          >
            <FileSignature className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              Sending Template
            </p>
            <h3 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
              {selectedTemplate?.name ?? 'No template'}
            </h3>
            <p className="text-xs text-white/75 mt-0.5">
              {selectedTemplate?.active
                ? 'Default for self-checkout'
                : 'Manual variant'}
            </p>
          </div>
          {templates.length > 1 && (
            <button
              type="button"
              onClick={() => setShowTemplatePicker((v) => !v)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white text-maxxed-blue hover:bg-blue-50 px-3 h-9 text-[13px] font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 shadow-sm"
              aria-expanded={showTemplatePicker}
            >
              Change
              <ChevronDown
                className={
                  'h-4 w-4 transition-transform ' +
                  (showTemplatePicker ? 'rotate-180' : '')
                }
              />
            </button>
          )}
        </div>
        {showTemplatePicker && templates.length > 1 && (
          <ul className="mt-3 rounded-lg bg-white ring-1 ring-gray-200 divide-y divide-gray-100 overflow-hidden shadow-md">
            {templates.map((t) => {
              const isSelected = t.id === templateId;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateId(t.id);
                      setShowTemplatePicker(false);
                    }}
                    className={
                      'w-full text-left px-3 py-3 text-base sm:text-sm font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer ' +
                      (isSelected
                        ? 'bg-maxxed-blue text-white'
                        : 'text-gray-900 hover:bg-blue-50 hover:text-maxxed-blue')
                    }
                  >
                    <span className="truncate">
                      {t.name}
                      {t.active && (
                        <span className={'ml-2 text-[10px] font-bold uppercase tracking-wider ' + (isSelected ? 'text-white/80' : 'text-gray-500')}>
                          default
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </header>

      <div className="p-4 space-y-4">
        <UserPickerField
          pickedUserId={pickedUserId}
          recipientName={recipientName}
          recipientEmail={recipientEmail}
          onPick={(u) => {
            setPickedUserId(u.id);
            setRecipientName(u.name ?? '');
            setRecipientEmail(u.email);
            if (u.phone) setRecipientPhone(u.phone);
          }}
          onClear={() => {
            setPickedUserId(null);
            setRecipientName('');
            setRecipientEmail('');
          }}
          disabled={submitting}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Recipient name" required>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => {
                setRecipientName(e.target.value);
                if (pickedUserId) setPickedUserId(null);
              }}
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
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                if (pickedUserId) setPickedUserId(null);
              }}
              placeholder="brian@example.com"
              autoComplete="email"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Course">
            <Select
              value={courseId}
              onValueChange={setCourseId}
              ariaLabel="Course"
              options={[
                { value: '', label: '— Off-list / custom —' },
                ...courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
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
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Installments">
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="w-full px-3 py-3 bg-white border border-gray-200 rounded-lg text-base font-mono focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
                />
              </Field>
              <Field label="Auto-fill spacing">
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as 'monthly' | 'quarterly')}
                  ariaLabel="Auto-fill spacing"
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                  ]}
                />
              </Field>
              {Number.isFinite(totalCents) && installmentsN >= 2 && (
                <p className="col-span-2 text-xs text-gray-500">
                  Per installment: <span className="font-semibold text-gray-700 tabular-nums">{formatUsd(perInstallmentCents)}</span>
                </p>
              )}
            </div>
          )}
          {scheduleType === 'plan' && installmentsN >= 2 && (
            <div className="mt-3 border border-gray-200 bg-gray-50/60 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-600">
                  Payment dates ({installmentsN})
                </p>
                <p className="text-[10px] text-gray-500 text-right">
                  Set the first row — the rest auto-fill by spacing. Edit any row to override.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {Array.from({ length: installmentsN }).map((_, i) => {
                  const value = dueDates[i] ?? '';
                  const isRefundable = refundable[i] ?? false;
                  return (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="shrink-0 w-10 text-gray-500 font-semibold tabular-nums text-xs">#{i + 1}</span>
                    <DatePicker
                      value={value}
                      ariaLabel={`Installment ${i + 1} due date`}
                      onChange={(next) => {
                        const arr = [...dueDates];
                        while (arr.length <= i) arr.push('');
                        arr[i] = next;
                        // Editing row #1 cascades: re-set firstDueAt so the
                        // auto-fill effect re-runs and trickles spacing
                        // through to the rest.
                        if (i === 0) setFirstDueAt(next);
                        setDueDates(arr);
                      }}
                    />
                    <span className="shrink-0 text-[11px] text-gray-500 tabular-nums">{formatUsd(perInstallmentCents)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [...refundable];
                        while (arr.length <= i) arr.push(false);
                        arr[i] = !arr[i];
                        setRefundable(arr);
                      }}
                      title={isRefundable ? 'Refundable — click to mark non-refundable' : 'Non-refundable — click to mark refundable'}
                      aria-label={isRefundable ? `Installment ${i + 1} is refundable` : `Installment ${i + 1} is non-refundable`}
                      className={`shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-extrabold uppercase tracking-wider ring-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 ${
                        isRefundable
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100'
                      }`}
                    >
                      {isRefundable ? 'Refundable' : 'Non-refund'}
                    </button>
                  </div>
                  );
                })}
              </div>
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

      <div className="bg-gray-50/70 border-t border-gray-100 px-4 py-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!canSubmit || previewLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
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
      </div>

      {previewOpen && (
        <PreviewModal
          html={previewHtml}
          templateName={previewTemplateName || selectedTemplate?.name || ''}
          loading={previewLoading}
          error={previewError}
          recipientName={recipientName}
          courseTitle={courseTitle}
          onClose={() => setPreviewOpen(false)}
        />
      )}
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


/* ─── User picker (for Compose recipient) ─────────────────────── */

function UserPickerField({
  pickedUserId,
  recipientName,
  recipientEmail,
  onPick,
  onClear,
  disabled,
}: {
  pickedUserId: string | null;
  recipientName: string;
  recipientEmail: string;
  onPick: (u: PickedUser) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<PickedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced search — fires 250ms after the last keystroke.
  useEffect(() => {
    if (pickedUserId) return; // already matched, skip
    const q = query.trim();
    if (q.length < 2) {
      setMatches([]);
      return;
    }
    setSearching(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        signal: ctl.signal,
      })
        .then((r) => r.json())
        .then((data: { users?: PickedUser[] }) => setMatches(data.users ?? []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query, pickedUserId]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // When a user is locked in via picker, show a chip instead of the
  // search box. Click X to detach + free up manual editing.
  if (pickedUserId) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <UserIcon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Linked to existing student
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {recipientName || "—"}{" "}
            <span className="text-gray-500 font-normal">·</span>{" "}
            <span className="text-gray-600">{recipientEmail}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md hover:bg-emerald-100 disabled:opacity-50"
          aria-label="Detach"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
        Send to existing student
      </span>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or email…"
          disabled={disabled}
          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin pointer-events-none" />
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        Or fill the recipient fields below for an off-platform send.
      </p>
      {open && query.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.length === 0 && !searching && (
            <li className="px-3 py-3 text-sm text-gray-500">
              No students match "{query}". Use the fields below to send
              to a non-student email.
            </li>
          )}
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(u);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {(u.name || u.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {u.name || "(no name)"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


/* ─── Preview modal ─────────────────────────────────────────── */

function PreviewModal({
  html,
  templateName,
  loading,
  error,
  recipientName,
  courseTitle,
  onClose,
}: {
  html: string;
  templateName: string;
  loading: boolean;
  error: string | null;
  recipientName: string;
  courseTitle: string;
  onClose: () => void;
}) {
  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Document preview"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 px-0 sm:px-6 sm:py-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl flex flex-col sm:rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bg-maxxed-blue text-white px-4 sm:px-5 py-3 sm:py-4 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              Preview &middot; not yet sent
            </p>
            <h2 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
              {templateName || 'Contract'}
            </h2>
            <p className="text-xs text-white/80 mt-0.5 truncate">
              {recipientName ? `For ${recipientName}` : 'No recipient yet'}
              {courseTitle && (
                <>
                  {' '}
                  <span className="text-white/60">·</span> {courseTitle}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-md text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Rendering preview…</span>
            </div>
          )}
          {!loading && error && (
            <div className="m-4 sm:m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Preview failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}
          {!loading && !error && html && (
            <PreviewContent html={html} />
          )}
        </div>
        <footer className="border-t border-gray-100 bg-white px-4 sm:px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-gray-500">
            This is what the recipient will see. Hit{' '}
            <span className="font-semibold text-gray-700">Send agreement</span>{' '}
            on the form to actually fire it.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-maxxed-blue text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-maxxed-blue-dark cursor-pointer transition-colors"
          >
            Close preview
          </button>
        </footer>
      </div>
    </div>
  );
}

function PreviewContent({ html }: { html: string }) {
  // Lazy-load ContractDisplay so its style/font payload isn't pulled
  // into the main bundle for admins who never click Preview.
  const [ContractDisplayMod, setMod] = useState<typeof import('@/components/sign/ContractDisplay') | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('@/components/sign/ContractDisplay').then((mod) => {
      if (!cancelled) setMod(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!ContractDisplayMod) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  const { ContractDisplay } = ContractDisplayMod;
  return (
    <div className="py-6 sm:py-10 px-3 sm:px-6">
      <ContractDisplay renderedHtml={html} />
    </div>
  );
}
