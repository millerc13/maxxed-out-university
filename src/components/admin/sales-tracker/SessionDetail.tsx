'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, BarChart3, Table, Plus } from 'lucide-react';
import type { EntryRow, SessionRow, TagColorMap, TagColorName } from './types';
import { DesktopEditor } from './DesktopEditor';
import { MobileEditor } from './MobileEditor';
import { Analytics } from './Analytics';
import { ColorPicker } from './ColorPicker';
import { ImportModal } from './ImportModal';
import type { ChartLayout, Slot } from './chart-config';

type Tab = 'analytics' | 'editor';

interface Props {
  initialSession: Omit<SessionRow, '_count'> & {
    tagColors?: TagColorMap;
    chartLayout?: ChartLayout;
  };
  initialEntries: EntryRow[];
}

export function SessionDetail({ initialSession, initialEntries }: Props) {
  // Default to Analytics so Rebecca lands on the high-level view first.
  const [tab, setTab] = useState<Tab>('analytics');
  const [entries, setEntries] = useState<EntryRow[]>(initialEntries);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [tagColors, setTagColors] = useState<TagColorMap>(
    initialSession.tagColors ?? {}
  );
  const [colorPickerTag, setColorPickerTag] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [analyticsScope, setAnalyticsScope] = useState<string | null>(null);
  const [chartLayout, setChartLayout] = useState<ChartLayout>(
    initialSession.chartLayout ?? {}
  );

  // Hydration-safe responsive switch. We render nothing on the first pass
  // (matches SSR), then pick a tree once we know the viewport. Avoids the
  // "render desktop, flash to mobile" flicker.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // ---- Save queue. Keyed by entryId so multiple edits to the same row
  // collapse into one in-flight request. Each call cancels any pending
  // timer for that entry and queues a fresh PATCH after a short delay.
  // ----------------------------------------------------------------
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingRef = useRef<Map<string, Partial<EntryRow>>>(new Map());

  // Save status for the indicator badge. Three states: 'idle' (nothing
  // pending or in-flight), 'pending' (waiting for debounce), 'saving'
  // (request in flight). 'saved' is a transient state that shows for
  // ~1.5s after the last successful flush, then drops back to 'idle'.
  type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const inflightRef = useRef(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recomputeStatus = useCallback(() => {
    if (inflightRef.current > 0) {
      setSaveStatus('saving');
    } else if (timersRef.current.size > 0 || pendingRef.current.size > 0) {
      setSaveStatus('pending');
    } else {
      // Nothing in flight or pending — flash 'saved' briefly, then idle.
      setSaveStatus((prev) => (prev === 'idle' ? 'idle' : 'saved'));
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1500);
    }
  }, []);

  const flush = useCallback(
    async (entryId: string) => {
      const pending = pendingRef.current.get(entryId);
      if (!pending) return;
      pendingRef.current.delete(entryId);
      inflightRef.current++;
      recomputeStatus();
      try {
        await fetch(`/api/admin/sales-tracker/entries/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending),
        });
      } catch {
        // Optimistic UI stays put; she'll see the edit. Background save
        // failure is rare on dev — if this becomes a real issue we can
        // add a toast + retry. For now silence beats a noisy false alarm.
      } finally {
        inflightRef.current--;
        recomputeStatus();
      }
    },
    [recomputeStatus]
  );

  const queueSave = useCallback(
    (entryId: string, patch: Partial<EntryRow>) => {
      const merged = { ...(pendingRef.current.get(entryId) ?? {}), ...patch };
      pendingRef.current.set(entryId, merged);

      const existing = timersRef.current.get(entryId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        timersRef.current.delete(entryId);
        flush(entryId);
      }, 400);
      timersRef.current.set(entryId, t);
      recomputeStatus();
    },
    [flush, recomputeStatus]
  );

  // Best-effort flush on unmount.
  useEffect(() => {
    return () => {
      const ids = Array.from(timersRef.current.keys());
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      ids.forEach((id) => flush(id));
    };
  }, [flush]);

  const updateEntry = useCallback(
    (id: string, patch: Partial<EntryRow>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
      queueSave(id, patch);
    },
    [queueSave]
  );

  const addEntry = useCallback(
    async (tag?: string | null) => {
      const res = await fetch(
        `/api/admin/sales-tracker/sessions/${initialSession.id}/entries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tag != null ? { tag } : {}),
        }
      );
      if (!res.ok) return;
      const j = await res.json();
      const newEntry: EntryRow = {
        ...j.entry,
        tag: j.entry.tag ?? null,
        contactDate: j.entry.contactDate ?? null,
        commissionDue: j.entry.commissionDue ?? null,
        createdAt: j.entry.createdAt,
        updatedAt: j.entry.updatedAt,
      };
      setEntries((prev) => [...prev, newEntry]);
      return newEntry;
    },
    [initialSession.id]
  );

  // Bulk rename or delete a section. Pass `to: null` to move all entries
  // in `from` to uncategorized.
  const renameTag = useCallback(
    async (from: string | null, to: string | null) => {
      const res = await fetch(
        `/api/admin/sales-tracker/sessions/${initialSession.id}/tag`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to }),
        }
      );
      if (!res.ok) return;
      setEntries((prev) =>
        prev.map((e) => (e.tag === from ? { ...e, tag: to } : e))
      );
    },
    [initialSession.id]
  );

  // Pending-undo state: rows that have been "deleted" client-side but
  // whose actual server DELETE is held off for 5 seconds so Rebecca can
  // hit Undo. Snapshot the row's index so Undo can restore it in place.
  const [pendingUndo, setPendingUndo] = useState<{
    entry: EntryRow;
    index: number;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalizeDelete = useCallback(async (id: string) => {
    await fetch(`/api/admin/sales-tracker/entries/${id}`, { method: 'DELETE' });
  }, []);

  const deleteEntry = useCallback(
    async (id: string) => {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx < 0) return prev;
        const entry = prev[idx];
        // If something was already pending undo, finalize it first so
        // we don't lose the previous deletion.
        setPendingUndo((existing) => {
          if (existing) {
            // Fire the previous delete in the background.
            finalizeDelete(existing.entry.id);
          }
          return { entry, index: idx };
        });
        return prev.filter((e) => e.id !== id);
      });

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        // Read pending state at fire time to avoid a stale closure.
        setPendingUndo((cur) => {
          if (cur && cur.entry.id === id) {
            finalizeDelete(id);
            return null;
          }
          return cur;
        });
      }, 5000);
    },
    [finalizeDelete]
  );

  const undoDelete = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingUndo((cur) => {
      if (!cur) return null;
      // Re-insert at original index so the row pops back into the same
      // visual spot.
      setEntries((prev) => {
        if (prev.some((e) => e.id === cur.entry.id)) return prev;
        const next = [...prev];
        const idx = Math.min(cur.index, next.length);
        next.splice(idx, 0, cur.entry);
        return next;
      });
      return null;
    });
  }, []);

  const duplicateEntry = useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/admin/sales-tracker/entries/${id}/duplicate`,
        { method: 'POST' }
      );
      if (!res.ok) return;
      const j = await res.json();
      const newEntry: EntryRow = {
        ...j.entry,
        contactDate: j.entry.contactDate ?? null,
        commissionDue: j.entry.commissionDue ?? null,
        createdAt: j.entry.createdAt,
        updatedAt: j.entry.updatedAt,
      };
      // Insert right after the source in the local order so the copy
      // appears next to it without waiting for a refetch.
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx < 0) return [...prev, newEntry];
        return [...prev.slice(0, idx + 1), newEntry, ...prev.slice(idx + 1)];
      });
    },
    []
  );

  const bulkUpdate = useCallback(
    async (
      ids: string[],
      op: 'delete' | 'paid' | 'unpaid' | 'move',
      tag?: string | null
    ) => {
      if (ids.length === 0) return;
      // Optimistic update.
      setEntries((prev) => {
        if (op === 'delete') return prev.filter((e) => !ids.includes(e.id));
        const idSet = new Set(ids);
        return prev.map((e) => {
          if (!idSet.has(e.id)) return e;
          if (op === 'paid') return { ...e, commissionPaid: true };
          if (op === 'unpaid') return { ...e, commissionPaid: false };
          if (op === 'move') return { ...e, tag: tag ?? null };
          return e;
        });
      });
      await fetch('/api/admin/sales-tracker/entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, op, tag: tag ?? undefined }),
      });
    },
    []
  );

  const setChartSlot = useCallback(
    async (slot: Slot, chartId: string | null) => {
      // Optimistic update.
      setChartLayout((prev) => {
        const next = { ...prev };
        if (chartId === null) delete next[slot];
        else next[slot] = chartId;
        return next;
      });
      await fetch(
        `/api/admin/sales-tracker/sessions/${initialSession.id}/chart-layout`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot, chartId }),
        }
      );
    },
    [initialSession.id]
  );

  const resetChartLayout = useCallback(async () => {
    setChartLayout({});
    await fetch(
      `/api/admin/sales-tracker/sessions/${initialSession.id}/chart-layout`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      }
    );
  }, [initialSession.id]);

  const setTagColor = useCallback(
    async (tag: string, color: TagColorName | null) => {
      // Optimistic update — we'll let the server be source-of-truth on
      // failure but the UI flips immediately.
      setTagColors((prev) => {
        const next = { ...prev };
        if (color === null) delete next[tag];
        else next[tag] = color;
        return next;
      });
      await fetch(
        `/api/admin/sales-tracker/sessions/${initialSession.id}/tag-color`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag, color }),
        }
      );
    },
    [initialSession.id]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/sales"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          Sessions
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
          {initialSession.name}
        </h1>
        <SaveBadge status={saveStatus} />
      </div>

      {/* Tabs — full-width on mobile so they're easy to tap. Analytics
          first so Rebecca sees performance summary before drilling in. */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </TabButton>
        <TabButton active={tab === 'editor'} onClick={() => setTab('editor')}>
          <Table className="w-4 h-4" />
          <span>Editor</span>
        </TabButton>
      </div>

      {tab === 'analytics' && (
        <Analytics
          entries={entries}
          scopedTag={analyticsScope}
          onClearScope={() => setAnalyticsScope(null)}
          chartLayout={chartLayout}
          onChangeSlot={setChartSlot}
          onResetAllCharts={resetChartLayout}
        />
      )}

      {tab === 'editor' && (
        <>
          {isMobile === null ? (
            // Match the eventual layout's chrome height to reduce CLS.
            <div className="h-64" />
          ) : isMobile ? (
            <MobileEditor
              sessionId={initialSession.id}
              entries={entries}
              updateEntry={updateEntry}
              addEntry={addEntry}
              deleteEntry={deleteEntry}
              duplicateEntry={duplicateEntry}
              renameTag={renameTag}
              tagColors={tagColors}
              onChangeColor={setColorPickerTag}
              bulkUpdate={bulkUpdate}
              onImport={() => setImportOpen(true)}
              onAnalyzeSection={(t) => {
                setAnalyticsScope(t);
                setTab('analytics');
              }}
            />
          ) : (
            <DesktopEditor
              sessionId={initialSession.id}
              entries={entries}
              updateEntry={updateEntry}
              addEntry={addEntry}
              deleteEntry={deleteEntry}
              duplicateEntry={duplicateEntry}
              renameTag={renameTag}
              tagColors={tagColors}
              onChangeColor={setColorPickerTag}
              bulkUpdate={bulkUpdate}
              onImport={() => setImportOpen(true)}
              onAnalyzeSection={(t) => {
                setAnalyticsScope(t);
                setTab('analytics');
              }}
            />
          )}
        </>
      )}

      {colorPickerTag && (
        <ColorPicker
          tag={colorPickerTag}
          current={tagColors[colorPickerTag] ?? null}
          onSelect={(color) => {
            setTagColor(colorPickerTag, color);
            setColorPickerTag(null);
          }}
          onClose={() => setColorPickerTag(null)}
        />
      )}

      {pendingUndo && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900 text-white shadow-2xl px-4 py-2.5">
            <span className="text-sm">
              Deleted{' '}
              <span className="font-semibold">
                {pendingUndo.entry.name || 'entry'}
              </span>
              .
            </span>
            <button
              type="button"
              onClick={undoDelete}
              className="text-sm font-bold text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {importOpen && (
        <ImportModal
          sessionId={initialSession.id}
          knownTags={Array.from(
            new Set(entries.map((e) => e.tag).filter(Boolean) as string[])
          ).sort()}
          onClose={() => setImportOpen(false)}
          onImported={(added) => {
            // Refetch — server-rendered initial state is stale after import.
            // Simpler than reconciling individual rows; the page is dynamic
            // and the caller is rare (a few times per week max).
            if (added > 0) window.location.reload();
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SaveBadge({
  status,
}: {
  status: 'idle' | 'pending' | 'saving' | 'saved';
}) {
  if (status === 'idle') return null;
  const base = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold';
  if (status === 'saving' || status === 'pending') {
    return (
      <span className={`${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {status === 'saving' ? 'Saving…' : 'Unsaved'}
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      All changes saved
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
        active
          ? 'border-maxxed-blue text-maxxed-blue'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

// Re-export so consumers can `import { AddButton }` if needed elsewhere.
export function AddEntryButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white hover:bg-maxxed-blue/90 active:scale-[0.98] transition"
    >
      <Plus className="w-4 h-4" />
      New Entry
    </button>
  );
}
