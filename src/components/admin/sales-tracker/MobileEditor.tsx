'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronRight,
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  RotateCcw,
  Search,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Tag as TagIcon,
  MoreVertical,
  Pencil,
  Palette,
  Download,
  Upload,
  Copy,
} from 'lucide-react';
import {
  type EntryRow,
  type TriState,
  type TagColorMap,
  effectiveCommissionCents,
  isOverridden,
  autoCommissionCents,
  formatUSD,
  formatPct,
  tagStyles,
} from './types';
import { TagPicker } from './TagPicker';
import { BulkActionBar } from './BulkActionBar';

interface Props {
  sessionId: string;
  entries: EntryRow[];
  updateEntry: (id: string, patch: Partial<EntryRow>) => void;
  addEntry: (tag?: string | null) => Promise<EntryRow | undefined>;
  deleteEntry: (id: string) => Promise<void>;
  duplicateEntry?: (id: string) => Promise<void>;
  renameTag: (from: string | null, to: string | null) => Promise<void>;
  tagColors?: TagColorMap;
  onChangeColor?: (tag: string) => void;
  bulkUpdate?: (
    ids: string[],
    op: 'delete' | 'paid' | 'unpaid' | 'move',
    tag?: string | null
  ) => Promise<void>;
  onImport?: () => void;
  onAnalyzeSection?: (tag: string) => void;
}

interface Group {
  tag: string | null;
  entries: EntryRow[];
}

function groupByTag(entries: EntryRow[]): Group[] {
  const map = new Map<string | null, Group>();
  for (const e of entries) {
    const key = e.tag && e.tag.trim() ? e.tag : null;
    let g = map.get(key);
    if (!g) {
      g = { tag: key, entries: [] };
      map.set(key, g);
    }
    g.entries.push(e);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.tag === null) return 1;
    if (b.tag === null) return -1;
    return (a.entries[0]?.position ?? 0) - (b.entries[0]?.position ?? 0);
  });
  return groups;
}

export function MobileEditor({
  sessionId,
  entries,
  updateEntry,
  addEntry,
  deleteEntry,
  duplicateEntry,
  renameTag,
  tagColors,
  onChangeColor,
  bulkUpdate,
  onImport,
  onAnalyzeSection,
}: Props) {
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [confirmingTagDelete, setConfirmingTagDelete] = useState<{
    tag: string;
    count: number;
  } | null>(null);

  // Selection mode (long-press to enter, X on bar to exit). When in
  // selection mode, tapping a card toggles selection instead of opening
  // the edit sheet.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Filter chips — same semantics as desktop. Compact "Status" + "Outcome"
  // chip groups + a section dropdown so Rebecca can scope the list on
  // her phone without hunting through 50+ cards.
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'owed'>('all');
  const [closeFilter, setCloseFilter] = useState<
    'all' | 'closed' | 'showedNoClose' | 'noShow'
  >('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return entries.filter((e) => {
      if (q) {
        const hit = [e.name, e.email, e.phone, e.notes, e.tag]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (paidFilter === 'paid' && !e.commissionPaid) return false;
      if (paidFilter === 'owed') {
        const eff = effectiveCommissionCents(e) ?? 0;
        if (e.commissionPaid || eff === 0) return false;
      }
      if (closeFilter === 'closed' && e.didClose !== 'YES') return false;
      if (closeFilter === 'noShow' && e.didShow !== 'NO') return false;
      if (closeFilter === 'showedNoClose') {
        if (e.didShow !== 'YES' || e.didClose === 'YES') return false;
      }
      if (sectionFilter !== 'all') {
        const tag = e.tag ?? '__uncategorized__';
        if (tag !== sectionFilter) return false;
      }
      return true;
    });
  }, [entries, filter, paidFilter, closeFilter, sectionFilter]);
  const anyFilterActive =
    paidFilter !== 'all' || closeFilter !== 'all' || sectionFilter !== 'all';

  const groups = useMemo(() => groupByTag(filtered), [filtered]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.tag && e.tag.trim()) set.add(e.tag);
    return Array.from(set).sort();
  }, [entries]);

  const editingEntry = entries.find((e) => e.id === editingId) ?? null;

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2 flex-wrap">
        {/* target="_blank" so iOS PWA standalone opens the file in
            Safari (with native share sheet) instead of navigating the
            entire PWA away from the editor. Same reasoning as the
            desktop ExportMenu. */}
        <a
          href={`/api/admin/sales-tracker/sessions/${sessionId}/export`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </a>
        <a
          href={`/api/admin/sales-tracker/sessions/${sessionId}/export-pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </a>
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
        />
      </div>

      {/* Filter chips. Horizontal scroll keeps everything reachable
          even on narrow phones without wrapping awkwardly. */}
      <div className="-mx-1 px-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden">
        <select
          value={paidFilter}
          onChange={(e) => setPaidFilter(e.target.value as 'all' | 'paid' | 'owed')}
          className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-maxxed-blue focus:outline-none"
        >
          <option value="all">All status</option>
          <option value="owed">Owed to me</option>
          <option value="paid">Paid to me</option>
        </select>
        <select
          value={closeFilter}
          onChange={(e) => setCloseFilter(e.target.value as 'all' | 'closed' | 'showedNoClose' | 'noShow')}
          className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-maxxed-blue focus:outline-none"
        >
          <option value="all">All outcomes</option>
          <option value="closed">Closed</option>
          <option value="showedNoClose">Showed, no close</option>
          <option value="noShow">No-show</option>
        </select>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-maxxed-blue focus:outline-none"
        >
          <option value="all">All sections</option>
          <option value="__uncategorized__">Uncategorized</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {anyFilterActive && (
          <button
            type="button"
            onClick={() => {
              setPaidFilter('all');
              setCloseFilter('all');
              setSectionFilter('all');
            }}
            className="shrink-0 text-xs text-gray-500 underline px-2"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            {entries.length === 0
              ? 'No entries yet.'
              : 'No entries match that search.'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <MobileSectionGroup
            key={group.tag ?? '__uncategorized__'}
            group={group}
            tagColor={group.tag ? tagColors?.[group.tag] ?? null : null}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onAdd={async () => {
              const created = await addEntry(group.tag);
              if (created) setEditingId(created.id);
            }}
            onTapCard={(id) => {
              if (selectionMode) toggleSelected(id);
              else setEditingId(id);
            }}
            onLongPressCard={(id) => {
              setSelectionMode(true);
              toggleSelected(id);
            }}
            onRenameTo={(to) => renameTag(group.tag, to)}
            onAskDelete={() =>
              group.tag != null &&
              setConfirmingTagDelete({ tag: group.tag, count: group.entries.length })
            }
            onChangeColor={onChangeColor && group.tag != null
              ? () => onChangeColor(group.tag as string)
              : undefined
            }
            onAnalyzeSection={onAnalyzeSection && group.tag != null
              ? () => onAnalyzeSection(group.tag as string)
              : undefined
            }
          />
        ))}
      </div>

      {confirmingTagDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmingTagDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">
              Delete section &ldquo;{confirmingTagDelete.tag}&rdquo;?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              The {confirmingTagDelete.count}{' '}
              {confirmingTagDelete.count === 1 ? 'entry' : 'entries'} won&apos;t
              be deleted — they&apos;ll move to Uncategorized.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmingTagDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await renameTag(confirmingTagDelete.tag, null);
                  setConfirmingTagDelete(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Delete section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-section button below the last group. Always visible so she can
          create new categories without diving into an entry's edit sheet. */}
      <button
        type="button"
        onClick={() => {
          setNewSectionName('');
          setCreatingSection(true);
        }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition"
      >
        <TagIcon className="w-4 h-4" />
        New Section
      </button>

      {creatingSection && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setCreatingSection(false)}
        >
          <form
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = newSectionName.trim();
              if (!trimmed) return;
              const created = await addEntry(trimmed);
              setCreatingSection(false);
              if (created) setEditingId(created.id);
            }}
          >
            <h3 className="text-base font-bold text-gray-900">New section</h3>
            <p className="text-sm text-gray-500 mt-1">
              A new entry will be added under this section so it shows up right away.
            </p>
            <input
              type="text"
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Section name"
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCreatingSection(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newSectionName.trim()}
                className="rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAB — fixed bottom-right so it's always reachable. */}
      <button
        type="button"
        onClick={async () => {
          const created = await addEntry();
          if (created) setEditingId(created.id);
        }}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center justify-center w-14 h-14 rounded-full bg-maxxed-blue text-white shadow-lg shadow-maxxed-blue/30 hover:bg-maxxed-blue/90 active:scale-95 transition"
        aria-label="New entry"
      >
        <Plus className="w-6 h-6" />
      </button>

      {editingEntry && (
        <EditSheet
          entry={editingEntry}
          knownTags={allTags}
          onClose={() => setEditingId(null)}
          updateEntry={updateEntry}
          deleteEntry={async (id) => {
            await deleteEntry(id);
            setEditingId(null);
          }}
          duplicateEntry={duplicateEntry}
        />
      )}

      {selectionMode && bulkUpdate && (
        <BulkActionBar
          count={selectedIds.size}
          knownTags={allTags}
          onClear={exitSelection}
          onMarkPaid={async () => {
            await bulkUpdate(Array.from(selectedIds), 'paid');
            exitSelection();
          }}
          onMarkUnpaid={async () => {
            await bulkUpdate(Array.from(selectedIds), 'unpaid');
            exitSelection();
          }}
          onMove={async (tag) => {
            await bulkUpdate(Array.from(selectedIds), 'move', tag);
            exitSelection();
          }}
          onDelete={async () => {
            await bulkUpdate(Array.from(selectedIds), 'delete');
            exitSelection();
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Card — tappable summary row
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// MobileSectionGroup — section bar (tag, count, Add, manage menu) +
// the cards for that group. Per-section state (menu, inline rename)
// lives here so each group is self-contained.
// ----------------------------------------------------------------
function MobileSectionGroup({
  group,
  tagColor,
  selectionMode,
  selectedIds,
  onAdd,
  onTapCard,
  onLongPressCard,
  onRenameTo,
  onAskDelete,
  onChangeColor,
  onAnalyzeSection,
}: {
  group: Group;
  tagColor: import('./types').TagColorName | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onAdd: () => void;
  onTapCard: (id: string) => void;
  onLongPressCard: (id: string) => void;
  onRenameTo: (to: string) => Promise<void>;
  onAskDelete: () => void;
  onChangeColor?: () => void;
  onAnalyzeSection?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.tag ?? '');
  const styles = tagStyles(group.tag, tagColor);

  return (
    <section>
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${styles.bar} ${styles.barText}`}
      >
        {editing ? (
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const next = draft.trim();
                if (next && next !== group.tag) onRenameTo(next);
                setEditing(false);
              } else if (e.key === 'Escape') {
                setEditing(false);
                setDraft(group.tag ?? '');
              }
            }}
            onBlur={() => {
              const next = draft.trim();
              if (next && next !== group.tag) onRenameTo(next);
              setEditing(false);
            }}
            className="flex-1 bg-white/20 placeholder-white/60 px-2 py-0.5 rounded text-sm font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        ) : (
          <span className="font-bold text-sm uppercase tracking-wider truncate">
            {group.tag ?? 'Uncategorized'}
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          <span className="opacity-80">{group.entries.length}</span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 font-semibold transition"
            aria-label="Add to section"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          {group.tag != null && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center w-7 h-7 rounded bg-white/20 hover:bg-white/30 transition"
                aria-label="Section menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden text-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setDraft(group.tag ?? '');
                        setEditing(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-100 text-left"
                    >
                      <Pencil className="w-4 h-4" />
                      Rename section
                    </button>
                    {onChangeColor && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onChangeColor();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-100 text-left"
                      >
                        <Palette className="w-4 h-4" />
                        Change color
                      </button>
                    )}
                    {onAnalyzeSection && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onAnalyzeSection();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-100 text-left"
                      >
                        <ChevronRight className="w-4 h-4 -rotate-45" />
                        View analytics
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onAskDelete();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete section
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 space-y-2">
        {group.entries.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            selected={selectedIds.has(e.id)}
            selectionMode={selectionMode}
            onTap={() => onTapCard(e.id)}
            onLongPress={() => onLongPressCard(e.id)}
          />
        ))}
      </div>
    </section>
  );
}

function EntryCard({
  entry,
  selected,
  selectionMode,
  onTap,
  onLongPress,
}: {
  entry: EntryRow;
  selected: boolean;
  selectionMode: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const commission = effectiveCommissionCents(entry);
  const isClosed = entry.didClose === 'YES';

  // Long-press detection — 500ms hold enters selection mode. Cancel on
  // touchend/mouseup/move so a brief tap still calls onTap.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const startPress = () => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onLongPress();
    }, 500);
  };
  const cancelPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const handleClick = () => {
    if (longPressFiredRef.current) return; // long-press already triggered
    onTap();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      className={`w-full text-left rounded-xl border bg-white p-4 shadow-sm active:scale-[0.99] transition ${
        selected
          ? 'border-maxxed-blue ring-2 ring-maxxed-blue/40'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode && (
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded border ${
                  selected
                    ? 'bg-maxxed-blue border-maxxed-blue text-white'
                    : 'border-gray-300'
                }`}
              >
                {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
              </span>
            )}
            <h3 className="font-bold text-gray-900 truncate">
              {entry.name || <span className="text-gray-400 italic">No name</span>}
            </h3>
            <TriBadge value={entry.didClose} short />
          </div>
          {entry.email && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {entry.email}
            </p>
          )}
        </div>
        {!selectionMode && (
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 mt-1" />
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900 tabular-nums">
            {entry.dealAmountCents != null
              ? formatUSD(entry.dealAmountCents)
              : '—'}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${
            isClosed && commission != null
              ? entry.commissionPaid
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isClosed && commission != null ? (
            <>
              My commission: {formatUSD(commission)}{' '}
              {entry.commissionPaid ? '· paid' : '· still owed'}
            </>
          ) : (
            <>My commission —</>
          )}
        </div>
      </div>
    </button>
  );
}

// ----------------------------------------------------------------
// Edit sheet — full-screen on mobile
// ----------------------------------------------------------------
function EditSheet({
  entry,
  knownTags,
  onClose,
  updateEntry,
  deleteEntry,
  duplicateEntry,
}: {
  entry: EntryRow;
  knownTags: string[];
  onClose: () => void;
  updateEntry: (id: string, patch: Partial<EntryRow>) => void;
  deleteEntry: (id: string) => Promise<void>;
  duplicateEntry?: (id: string) => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const overridden = isOverridden(entry);
  const auto = autoCommissionCents(entry);
  const commission = effectiveCommissionCents(entry);

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Sticky header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-gray-900 truncate">
          {entry.name || 'New entry'}
        </h2>
        <div className="flex items-center gap-1">
          {duplicateEntry && (
            <button
              type="button"
              onClick={async () => {
                await duplicateEntry(entry.id);
                onClose();
              }}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Duplicate entry"
              title="Duplicate"
            >
              <Copy className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="p-2 -mr-2 rounded-md text-red-600 hover:bg-red-50"
            aria-label="Delete entry"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Section / tag */}
        <Section title="Section">
          <TagPicker
            value={entry.tag}
            knownTags={knownTags}
            onChange={(next) => updateEntry(entry.id, { tag: next })}
            variant="pill"
          />
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <Field label="Name">
            <TextInput
              value={entry.name}
              onChange={(v) => updateEntry(entry.id, { name: v })}
              placeholder="Full name"
            />
          </Field>
          <Field label="Email" icon={<Mail className="w-4 h-4 text-gray-400" />}>
            <TextInput
              value={entry.email}
              onChange={(v) => updateEntry(entry.id, { email: v })}
              type="email"
              placeholder="email@example.com"
            />
          </Field>
          <Field label="Phone" icon={<Phone className="w-4 h-4 text-gray-400" />}>
            <TextInput
              value={entry.phone}
              onChange={(v) => updateEntry(entry.id, { phone: v })}
              type="tel"
              placeholder="(555) 555-5555"
            />
          </Field>
        </Section>

        {/* Meeting */}
        <Section title="Meeting">
          <Field label="Date" icon={<Calendar className="w-4 h-4 text-gray-400" />}>
            <input
              type="date"
              value={entry.contactDate ? entry.contactDate.slice(0, 10) : ''}
              onChange={(e) =>
                updateEntry(entry.id, {
                  contactDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={entry.contactTime ?? ''}
              onChange={(e) =>
                updateEntry(entry.id, {
                  contactTime: e.target.value || null,
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Showed up?">
            <TriToggle
              value={entry.didShow}
              onChange={(v) => updateEntry(entry.id, { didShow: v })}
            />
          </Field>
          <Field label="Closed?">
            <TriToggle
              value={entry.didClose}
              onChange={(v) => updateEntry(entry.id, { didClose: v })}
            />
          </Field>
        </Section>

        {/* Deal & commission */}
        <Section title="Deal">
          <Field label="Deal Amount">
            <MoneyInput
              value={entry.dealAmountCents}
              onChange={(v) => updateEntry(entry.id, { dealAmountCents: v })}
            />
          </Field>
          <Field label="Commission %">
            <PercentInput
              value={entry.commissionRate}
              onChange={(v) => updateEntry(entry.id, { commissionRate: v })}
            />
          </Field>
          <Field
            label="Commission Amount"
            hint={
              overridden
                ? `Manual override — auto would be ${auto != null ? formatUSD(auto) : '—'}`
                : auto != null
                ? `Auto-calculated from deal × rate (${formatPct(entry.commissionRate)})`
                : 'Enter deal amount and rate, or override below'
            }
          >
            <div className="relative">
              <MoneyInput
                value={commission}
                onChange={(v) => {
                  if (v === null) {
                    updateEntry(entry.id, { commissionAmountCents: null });
                    return;
                  }
                  if (v === auto) {
                    // Don't lock as override when she enters the auto value.
                    updateEntry(entry.id, { commissionAmountCents: null });
                    return;
                  }
                  updateEntry(entry.id, { commissionAmountCents: v });
                }}
                emphasis={overridden ? 'override' : auto != null ? 'muted' : 'normal'}
              />
              {overridden && (
                <button
                  type="button"
                  onClick={() =>
                    updateEntry(entry.id, { commissionAmountCents: null })
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100"
                  aria-label="Reset to auto-calculated amount"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Auto
                </button>
              )}
            </div>
          </Field>
          <Field label="When I'll be paid (date)">
            <input
              type="date"
              value={entry.commissionDue ? entry.commissionDue.slice(0, 10) : ''}
              onChange={(e) =>
                updateEntry(entry.id, {
                  commissionDue: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Have I been paid yet?"
            hint="Whether the company has paid out Rebecca's commission for this deal."
          >
            <BoolToggle
              value={entry.commissionPaid}
              onChange={(v) => updateEntry(entry.id, { commissionPaid: v })}
            />
          </Field>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <textarea
            value={entry.notes ?? ''}
            onChange={(e) =>
              updateEntry(entry.id, {
                notes: e.target.value === '' ? null : e.target.value,
              })
            }
            rows={4}
            placeholder="Anything to remember about this lead…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
          />
        </Section>
      </div>

      {confirmingDelete && (
        <div
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmingDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">Delete entry?</h3>
            <p className="text-sm text-gray-600 mt-1">
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteEntry(entry.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Form primitives
// ----------------------------------------------------------------
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none bg-white';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
        {icon}
        {label}
      </div>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : v);
      }}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

function MoneyInput({
  value,
  onChange,
  emphasis = 'normal',
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  emphasis?: 'normal' | 'muted' | 'override';
}) {
  const [local, setLocal] = useState<string>(
    value == null ? '' : (value / 100).toFixed(2)
  );
  const [editing, setEditing] = useState(false);

  const tone =
    emphasis === 'override'
      ? 'text-amber-700 font-semibold'
      : emphasis === 'muted'
      ? 'text-gray-500'
      : '';

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={
          editing
            ? local
            : value == null
            ? ''
            : (value / 100).toFixed(2)
        }
        onFocus={() => {
          setLocal(value == null ? '' : (value / 100).toFixed(2));
          setEditing(true);
        }}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const cleaned = local.replace(/[^0-9.\-]/g, '');
          if (cleaned === '') {
            if (value !== null) onChange(null);
            return;
          }
          const n = Number(cleaned);
          if (!Number.isFinite(n)) return;
          const cents = Math.round(n * 100);
          if (cents !== value) onChange(cents);
        }}
        placeholder="0.00"
        className={`${inputClass} pl-7 tabular-nums ${tone}`}
      />
    </div>
  );
}

function PercentInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(
    value == null ? '' : (value * 100).toFixed(2)
  );
  const [editing, setEditing] = useState(false);
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={
          editing
            ? local
            : value == null
            ? ''
            : (value * 100).toFixed(2)
        }
        onFocus={() => {
          setLocal(value == null ? '' : (value * 100).toFixed(2));
          setEditing(true);
        }}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const cleaned = local.replace(/[^0-9.\-]/g, '');
          if (cleaned === '') {
            if (value !== null) onChange(null);
            return;
          }
          const n = Number(cleaned);
          if (!Number.isFinite(n)) return;
          const rate = Math.max(0, Math.min(1, n / 100));
          if (rate !== value) onChange(Number(rate.toFixed(4)));
        }}
        placeholder="10.00"
        className={`${inputClass} pr-8 tabular-nums`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        %
      </span>
    </div>
  );
}

function TriToggle({
  value,
  onChange,
}: {
  value: TriState | null;
  onChange: (v: TriState) => void;
}) {
  const v: TriState = value ?? 'PENDING';
  const opts: Array<{ key: TriState; label: string; icon: React.ReactNode; color: string }> = [
    {
      key: 'YES',
      label: 'Yes',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
    },
    {
      key: 'NO',
      label: 'No',
      icon: <Circle className="w-4 h-4" />,
      color: 'bg-red-100 text-red-800 ring-red-300',
    },
    {
      key: 'PENDING',
      label: 'Pending',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-700 ring-gray-300',
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = v === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold ring-1 ring-inset transition ${
              active
                ? o.color + ' shadow-sm'
                : 'bg-white text-gray-500 ring-gray-200'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function BoolToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold ring-1 ring-inset transition ${
          value
            ? 'bg-emerald-100 text-emerald-800 ring-emerald-300 shadow-sm'
            : 'bg-white text-gray-500 ring-gray-200'
        }`}
      >
        <CheckCircle2 className="w-4 h-4" />
        I got paid
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold ring-1 ring-inset transition ${
          !value
            ? 'bg-amber-100 text-amber-800 ring-amber-300 shadow-sm'
            : 'bg-white text-gray-500 ring-gray-200'
        }`}
      >
        <Circle className="w-4 h-4" />
        Still owed
      </button>
    </div>
  );
}

function TriBadge({
  value,
  short = false,
}: {
  value: TriState | null;
  short?: boolean;
}) {
  const v: TriState = value ?? 'PENDING';
  const styles: Record<TriState, string> = {
    YES: 'bg-emerald-100 text-emerald-800',
    NO: 'bg-red-100 text-red-800',
    PENDING: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles[v]}`}
    >
      {short ? (v === 'PENDING' ? '?' : v) : v}
    </span>
  );
}
