'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  TrendingUp,
  Users,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Wallet,
  Target,
  DollarSign,
  Layers,
  ChevronRight,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { type SessionRow, formatUSD } from './types';
import { Kpi, PaidVsOwedBar, Funnel } from './SummaryWidgets';

interface GlobalStats {
  sessionCount: number;
  contacts: number;
  shows: number;
  closes: number;
  totalDealCents: number;
  totalCommissionCents: number;
  paidCents: number;
  unpaidCents: number;
}

interface Props {
  initialSessions: SessionRow[];
  globalStats: GlobalStats;
}

export function SessionsIndex({ initialSessions, globalStats }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingSession, setDeletingSession] = useState<SessionRow | null>(null);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/sales-tracker/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed to create session');
      }
      const j = await res.json();
      setSessions((prev) => [
        { ...j.session, _count: { entries: 0 } },
        ...prev,
      ]);
      setNewName('');
      setCreating(false);
      router.push(`/admin/sales/${j.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    const res = await fetch(`/api/admin/sales-tracker/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const j = await res.json();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, name: j.session.name, updatedAt: j.session.updatedAt } : s
        )
      );
      setRenamingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Sales Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Each session is a standalone tracker — sales for a specific person, event, or period.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-maxxed-blue/90 active:scale-[0.98] transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Session</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Global summary — only shown once there's at least one session
          with data, so an empty state isn't all zeros. */}
      {sessions.length > 0 && globalStats.contacts > 0 && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              label="Owed to me"
              value={formatUSD(globalStats.unpaidCents)}
              sub={`Across ${globalStats.sessionCount} ${globalStats.sessionCount === 1 ? 'session' : 'sessions'}`}
              icon={<Wallet className="w-5 h-5" />}
              tone="amber"
            />
            <Kpi
              label="Paid to me"
              value={formatUSD(globalStats.paidCents)}
              sub="Lifetime received"
              icon={<CheckCircle2 className="w-5 h-5" />}
              tone="emerald"
            />
            <Kpi
              label="Total commission earned"
              value={formatUSD(globalStats.totalCommissionCents)}
              sub={`From ${globalStats.closes} closed ${globalStats.closes === 1 ? 'deal' : 'deals'}`}
              icon={<DollarSign className="w-5 h-5" />}
              tone="violet"
            />
            <Kpi
              label="Total deal value"
              value={formatUSD(globalStats.totalDealCents)}
              sub="Closed deal volume"
              icon={<Layers className="w-5 h-5" />}
              tone="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                My Commission · all sessions
              </h3>
              <PaidVsOwedBar
                paidCents={globalStats.paidCents}
                unpaidCents={globalStats.unpaidCents}
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Show / Close Funnel · all sessions
              </h3>
              <Funnel
                contacts={globalStats.contacts}
                shows={globalStats.shows}
                closes={globalStats.closes}
                compact
              />
            </div>
          </div>
        </section>
      )}

      {sessions.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <TrendingUp className="w-10 h-10 mx-auto text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            No sessions yet
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Create your first tracker session to start logging sales.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 pt-2">
          Your sessions
        </h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            renaming={renamingId === s.id}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onStartRename={() => {
              setRenamingId(s.id);
              setRenameValue(s.name);
            }}
            onCancelRename={() => setRenamingId(null)}
            onSaveRename={() => saveRename(s.id)}
            onAskDelete={() => setDeletingSession(s)}
          />
        ))}
      </div>

      {creating && (
        <Modal onClose={() => !submitting && setCreating(false)}>
          <form onSubmit={createSession} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New session</h2>
            <p className="text-sm text-gray-500">
              Pick a name you'll recognize — e.g. "Sales for Todd Pultz" or "Q3 Outbound".
            </p>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Session name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
              disabled={submitting}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newName.trim()}
                className="rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingSession && (
        <DeleteConfirm
          session={deletingSession}
          onClose={() => setDeletingSession(null)}
          onDeleted={() => {
            setSessions((prev) => prev.filter((s) => s.id !== deletingSession.id));
            setDeletingSession(null);
          }}
        />
      )}
    </div>
  );
}

// Per-session identity color. Hash the name and pick from a small
// curated list of vibrant Tailwind shades. Each card gets its own
// accent strip so they're easy to tell apart at a glance even when
// the names are similar ("Sales for X" / "Sales for Y").
const ACCENT_STRIPS = [
  'bg-gradient-to-r from-rose-500 to-pink-500',
  'bg-gradient-to-r from-orange-500 to-amber-500',
  'bg-gradient-to-r from-emerald-500 to-teal-500',
  'bg-gradient-to-r from-cyan-500 to-sky-500',
  'bg-gradient-to-r from-blue-500 to-indigo-500',
  'bg-gradient-to-r from-violet-500 to-fuchsia-500',
  'bg-gradient-to-r from-fuchsia-500 to-pink-500',
  'bg-gradient-to-r from-amber-500 to-rose-500',
];

function sessionAccent(name: string): { strip: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return { strip: ACCENT_STRIPS[h % ACCENT_STRIPS.length] };
}

interface CardProps {
  session: SessionRow;
  renaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onAskDelete: () => void;
}

function SessionCard({
  session,
  renaming,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onAskDelete,
}: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const updated = new Date(session.updatedAt);
  const entryCount = session._count?.entries ?? 0;

  if (renaming) {
    return (
      <div className="rounded-xl border-2 border-maxxed-blue bg-white p-5 shadow-sm">
        <input
          type="text"
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-semibold focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onCancelRename}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveRename}
            className="rounded-md bg-maxxed-blue px-3 py-1.5 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  const stats = session.stats;
  const closeRate =
    entryCount > 0 && stats ? Math.round((stats.closedCount / entryCount) * 100) : null;

  // Per-card identity color — hashed from session name so each card has
  // its own visual fingerprint. Maps to a Tailwind hue picked from a
  // curated list of contrast-safe shades.
  const accent = sessionAccent(session.name);
  const totalCommission = stats?.totalCommissionCents ?? 0;
  const paidCents = stats?.paidCents ?? 0;
  const unpaidCents = stats?.unpaidCents ?? 0;
  const paidPct =
    totalCommission > 0 ? Math.round((paidCents / totalCommission) * 100) : 0;

  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all overflow-hidden">
      {/* Identity strip across the top — hashed accent per session. */}
      <div className={`h-1 ${accent.strip}`} />

      <Link href={`/admin/sales/${session.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-2 group-hover:text-maxxed-blue transition-colors">
              {session.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="font-semibold text-gray-700 tabular-nums">{entryCount}</span>
                <span>{entryCount === 1 ? 'entry' : 'entries'}</span>
              </span>
              {stats && stats.closedCount > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      {stats.closedCount}
                    </span>
                    <span>closed{closeRate != null ? ` · ${closeRate}%` : ''}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hero: outstanding commission. The number Rebecca cares about
            most — what she's still owed across this session. */}
        {stats && totalCommission > 0 ? (
          <>
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700">
                    Owed to me
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900 tabular-nums leading-none mt-0.5">
                    {formatUSD(unpaidCents)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                    Paid
                  </div>
                  <div className="text-base font-bold text-gray-700 tabular-nums leading-none mt-0.5">
                    {formatUSD(paidCents)}
                  </div>
                </div>
              </div>

              {/* Proportional bar — instantly shows the paid/owed split. */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-100">
                {paidPct > 0 && (
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${paidPct}%` }}
                  />
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                <span>
                  {paidPct}% paid of {formatUSD(totalCommission)} earned
                </span>
                {unpaidCents > 0 && (
                  <span className="text-amber-700">
                    {100 - paidPct}% pending
                  </span>
                )}
              </div>
            </div>
          </>
        ) : entryCount > 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <Wallet className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-gray-400" />
            No commission earned yet — close a deal to start tracking.
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            Empty session. Click to add the first entry.
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Updated {updated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-gray-500 group-hover:text-maxxed-blue transition-colors">
            Open
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </Link>

      <div className="absolute top-3 right-3">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          aria-label="More"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onStartRename();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                <Pencil className="w-4 h-4" />
                Rename
              </button>
              <a
                href={`/api/admin/sales-tracker/sessions/${session.id}/export`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left border-t border-gray-100"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export CSV
              </a>
              <a
                href={`/api/admin/sales-tracker/sessions/${session.id}/export-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                Export PDF
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAskDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteConfirm({
  session,
  onClose,
  onDeleted,
}: {
  session: SessionRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed === session.name;

  async function confirm() {
    if (!matches) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sales-tracker/sessions/${session.id}?confirm=${encodeURIComponent(session.name)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed to delete');
      }
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={() => !submitting && onClose()}>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-red-600">Delete session</h2>
        <p className="text-sm text-gray-700">
          This permanently deletes <span className="font-semibold">{session.name}</span> and all of its entries. This cannot be undone.
        </p>
        <p className="text-sm text-gray-700">
          To confirm, type <span className="font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded">{session.name}</span> below.
        </p>
        <input
          type="text"
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type session name to confirm"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
          disabled={submitting}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!matches || submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Escape closes the modal — matches OS-level dialog conventions and
  // avoids the trap where Rebecca clicks into the backdrop and nothing
  // happens because focus is on an input inside.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
