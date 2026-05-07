'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}
import {
  Plus,
  Trash2,
  RotateCcw,
  Search,
  FileText,
  X,
  MoreVertical,
  Pencil,
  Tag as TagIcon,
  Palette,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  Copy,
  ChevronDown,
  FileText as FileTextIcon,
  FileSpreadsheet,
} from 'lucide-react';
import {
  type EntryRow,
  type TriState,
  type TagColorMap,
  autoCommissionCents,
  effectiveCommissionCents,
  isOverridden,
  formatUSD,
  tagStyles,
} from './types';
import { TagPicker } from './TagPicker';
import { BulkActionBar } from './BulkActionBar';

const COL_COUNT = 15; // checkbox + 13 data columns + actions cell

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

// Column keys we support sorting by. Other columns (notes, time as HH:MM
// string) aren't useful to sort.
type SortKey =
  | 'name'
  | 'contactDate'
  | 'dealAmountCents'
  | 'commissionRate'
  | 'commission'
  | 'commissionDue'
  | 'commissionPaid';

function compareEntries(
  a: EntryRow,
  b: EntryRow,
  key: SortKey,
  dir: 'asc' | 'desc'
): number {
  const mul = dir === 'asc' ? 1 : -1;
  // Helper that pushes nullish to the end regardless of direction.
  const ord = <T,>(av: T | null | undefined, bv: T | null | undefined) => {
    const aMissing = av == null;
    const bMissing = bv == null;
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return 0;
  };
  switch (key) {
    case 'name': {
      const m = ord(a.name, b.name);
      if (m !== 0) return m;
      return mul * (a.name ?? '').localeCompare(b.name ?? '');
    }
    case 'contactDate': {
      const m = ord(a.contactDate, b.contactDate);
      if (m !== 0) return m;
      return mul * (a.contactDate ?? '').localeCompare(b.contactDate ?? '');
    }
    case 'commissionDue': {
      const m = ord(a.commissionDue, b.commissionDue);
      if (m !== 0) return m;
      return mul * (a.commissionDue ?? '').localeCompare(b.commissionDue ?? '');
    }
    case 'dealAmountCents': {
      const m = ord(a.dealAmountCents, b.dealAmountCents);
      if (m !== 0) return m;
      return mul * ((a.dealAmountCents ?? 0) - (b.dealAmountCents ?? 0));
    }
    case 'commissionRate': {
      const m = ord(a.commissionRate, b.commissionRate);
      if (m !== 0) return m;
      return mul * ((a.commissionRate ?? 0) - (b.commissionRate ?? 0));
    }
    case 'commission': {
      const ac = effectiveCommissionCents(a) ?? null;
      const bc = effectiveCommissionCents(b) ?? null;
      const m = ord(ac, bc);
      if (m !== 0) return m;
      return mul * ((ac ?? 0) - (bc ?? 0));
    }
    case 'commissionPaid':
      // false (still owed) sorts before true (paid) in asc.
      return mul * (Number(a.commissionPaid) - Number(b.commissionPaid));
  }
}

/**
 * Bucket entries by tag, preserving the position-order within each tag
 * and ordering groups by their first entry's position. Entries without
 * a tag fall into the trailing "Uncategorized" group, omitted entirely
 * if no such entries exist.
 */
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
  // Order groups by first-position of their first entry; null group last.
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.tag === null) return 1;
    if (b.tag === null) return -1;
    return (a.entries[0]?.position ?? 0) - (b.entries[0]?.position ?? 0);
  });
  return groups;
}

export function DesktopEditor({
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const [filter, setFilter] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingTagDelete, setConfirmingTagDelete] = useState<{
    tag: string;
    count: number;
  } | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  // Sort state — null means "manual order" (use position field).
  // Sort applies within each section so grouping is preserved.
  // Click cycle: not-set → asc → desc → cleared.
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(
    null
  );
  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // 3rd click: clear sort
    });
  }, []);

  // Filter chips. 'all' = no filter applied for that dimension.
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

  const groups = useMemo(() => {
    const g = groupByTag(filtered);
    if (!sort) return g;
    return g.map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) =>
        compareEntries(a, b, sort.key, sort.dir)
      ),
    }));
  }, [filtered, sort]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.tag && e.tag.trim()) set.add(e.tag);
    }
    return Array.from(set).sort();
  }, [entries]);

  const anyFilterActive =
    paidFilter !== 'all' || closeFilter !== 'all' || sectionFilter !== 'all';

  return (
    <div className="space-y-3">
      <FilterChipBar
        paidFilter={paidFilter}
        setPaidFilter={setPaidFilter}
        closeFilter={closeFilter}
        setCloseFilter={setCloseFilter}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        knownTags={allTags}
        anyActive={anyFilterActive}
        onClear={() => {
          setPaidFilter('all');
          setCloseFilter('all');
          setSectionFilter('all');
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name, email, phone, notes…"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
          />
        </div>
        <div className="text-xs text-gray-500">
          {filtered.length} of {entries.length}
        </div>
        <ExportMenu sessionId={sessionId} />
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
            title="Import entries from a CSV file"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        )}
        <button
          type="button"
          onClick={() => setCreatingSection(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
        >
          <TagIcon className="w-4 h-4" />
          New Section
        </button>
        <button
          type="button"
          onClick={() => addEntry()}
          className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white hover:bg-maxxed-blue/90 active:scale-[0.98] transition"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-maxxed-blue focus:ring-maxxed-blue/30 cursor-pointer"
                  checked={
                    filtered.length > 0 &&
                    filtered.every((e) => selectedIds.has(e.id))
                  }
                  ref={(el) => {
                    if (!el) return;
                    const some = filtered.some((e) => selectedIds.has(e.id));
                    const all =
                      filtered.length > 0 &&
                      filtered.every((e) => selectedIds.has(e.id));
                    el.indeterminate = some && !all;
                  }}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(filtered.map((x) => x.id)));
                    } else {
                      clearSelection();
                    }
                  }}
                  aria-label="Select all visible rows"
                />
              </th>
              <Th className="min-w-[180px]" sortKey="name" sort={sort} onSort={toggleSort}>Name</Th>
              <Th className="min-w-[200px]">Email</Th>
              <Th className="min-w-[130px]">Phone</Th>
              <Th className="min-w-[130px]" sortKey="contactDate" sort={sort} onSort={toggleSort}>Date</Th>
              <Th className="min-w-[100px]">Time</Th>
              <Th className="min-w-[100px]">Showed?</Th>
              <Th className="min-w-[100px]">Closed?</Th>
              <Th className="min-w-[130px] text-right" sortKey="dealAmountCents" sort={sort} onSort={toggleSort}>Deal Amount</Th>
              <Th className="min-w-[90px] text-right" sortKey="commissionRate" sort={sort} onSort={toggleSort}>Comm %</Th>
              <Th className="min-w-[140px] text-right" sortKey="commission" sort={sort} onSort={toggleSort}>My Commission</Th>
              <Th className="min-w-[130px]" sortKey="commissionDue" sort={sort} onSort={toggleSort}>Pay Date</Th>
              <Th className="min-w-[110px]" sortKey="commissionPaid" sort={sort} onSort={toggleSort}>Got Paid?</Th>
              <Th className="min-w-[180px]">Notes</Th>
              <Th className="w-20"></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={COL_COUNT}
                  className="text-center text-sm text-gray-500 py-12"
                >
                  {entries.length === 0 ? (
                    <>
                      No entries yet.{' '}
                      <button
                        type="button"
                        onClick={() => addEntry()}
                        className="text-maxxed-blue font-semibold hover:underline"
                      >
                        Add the first one
                      </button>
                      .
                    </>
                  ) : (
                    'No entries match that search.'
                  )}
                </td>
              </tr>
            )}

            {groups.map((group) => (
              <GroupSection
                key={group.tag ?? '__uncategorized__'}
                group={group}
                knownTags={allTags}
                tagColor={group.tag ? tagColors?.[group.tag] ?? null : null}
                updateEntry={updateEntry}
                addEntry={addEntry}
                renameTag={renameTag}
                onAskDeleteRow={(id) => setConfirmingDelete(id)}
                onAskDeleteTag={(tag, count) =>
                  setConfirmingTagDelete({ tag, count })
                }
                onChangeColor={onChangeColor}
                onAnalyzeSection={onAnalyzeSection}
                selectedIds={selectedIds}
                toggleSelected={toggleSelected}
                onToggleAllInGroup={(ids, allSelected) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (allSelected) ids.forEach((id) => next.delete(id));
                    else ids.forEach((id) => next.add(id));
                    return next;
                  });
                }}
                duplicateEntry={duplicateEntry}
              />
            ))}
          </tbody>
        </table>
      </div>

      {confirmingDelete && (
        <DeleteRowModal
          entry={entries.find((e) => e.id === confirmingDelete)!}
          onCancel={() => setConfirmingDelete(null)}
          onConfirm={async () => {
            await deleteEntry(confirmingDelete);
            setConfirmingDelete(null);
          }}
        />
      )}

      {confirmingTagDelete && (
        <DeleteSectionModal
          tag={confirmingTagDelete.tag}
          count={confirmingTagDelete.count}
          onCancel={() => setConfirmingTagDelete(null)}
          onConfirm={async () => {
            await renameTag(confirmingTagDelete.tag, null);
            setConfirmingTagDelete(null);
          }}
        />
      )}

      {selectedIds.size > 0 && bulkUpdate && (
        <BulkActionBar
          count={selectedIds.size}
          knownTags={allTags}
          onClear={clearSelection}
          onMarkPaid={async () => {
            await bulkUpdate(Array.from(selectedIds), 'paid');
            clearSelection();
          }}
          onMarkUnpaid={async () => {
            await bulkUpdate(Array.from(selectedIds), 'unpaid');
            clearSelection();
          }}
          onMove={async (tag) => {
            await bulkUpdate(Array.from(selectedIds), 'move', tag);
            clearSelection();
          }}
          onDelete={async () => {
            await bulkUpdate(Array.from(selectedIds), 'delete');
            clearSelection();
          }}
        />
      )}

      {creatingSection && (
        <NewSectionModal
          existingTags={allTags}
          onCancel={() => setCreatingSection(false)}
          onCreate={async (name) => {
            // Creating a section = adding one entry pre-tagged. The new
            // section bar appears as soon as React re-renders.
            await addEntry(name);
            setCreatingSection(false);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Cells
// ----------------------------------------------------------------

function Th({
  children,
  className = '',
  sortKey,
  sort,
  onSort,
}: {
  children?: React.ReactNode;
  className?: string;
  sortKey?: SortKey;
  sort?: { key: SortKey; dir: 'asc' | 'desc' } | null;
  onSort?: (key: SortKey) => void;
}) {
  // Non-sortable columns render as plain th.
  if (!sortKey || !onSort) {
    return <th className={`px-3 py-2 font-semibold ${className}`}>{children}</th>;
  }
  const active = sort?.key === sortKey;
  const dir = active ? sort.dir : null;
  // Right-aligned columns flip the icon position so the caret hugs the
  // numeric values; left columns keep it next to the label.
  const isRightAligned = className.includes('text-right');
  return (
    <th className={`px-0 py-0 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title="Click to sort"
        className={`w-full flex items-center gap-1 px-3 py-2 hover:bg-gray-100 transition uppercase tracking-wide text-xs ${
          isRightAligned ? 'justify-end' : ''
        } ${active ? 'text-maxxed-blue' : 'text-gray-600'}`}
      >
        {!isRightAligned && children}
        {dir === 'asc' && <ArrowUp className="w-3 h-3" />}
        {dir === 'desc' && <ArrowDown className="w-3 h-3" />}
        {isRightAligned && children}
      </button>
    </th>
  );
}

// `placeholder:text-transparent focus:placeholder:text-gray-300` keeps the
// cell visually empty (just a row separator) until the user focuses it,
// so the table doesn't look like every blank field has fake data in it.
const cellInputBase =
  'w-full bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-transparent focus:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-maxxed-blue/40 focus:bg-white';

function TextCell({
  value,
  onChange,
  type = 'text',
  placeholder,
  align = 'left',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  type?: string;
  placeholder?: string;
  align?: 'left' | 'right';
}) {
  // Bind directly to prop — the parent already debounces saves, so we don't
  // need local state to keep typing snappy. This also avoids stale-state
  // bugs when the row is updated from elsewhere (e.g. another cell's edit
  // triggers a re-render).
  return (
    <td className="p-0 align-middle">
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === '' ? null : next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        className={`${cellInputBase} ${align === 'right' ? 'text-right tabular-nums' : ''}`}
      />
    </td>
  );
}

function DateCell({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  // <input type="date"> wants YYYY-MM-DD. The browser's "mm/dd/yyyy"
  // hint is dimmed via text-transparent until focus so it doesn't read
  // as fake data; same trick as TextCell's placeholder.
  const dateValue = value ? value.slice(0, 10) : '';
  return (
    <td className="p-0 align-middle">
      <input
        type="date"
        value={dateValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? new Date(v).toISOString() : null);
        }}
        className={`${cellInputBase} ${
          dateValue ? '' : 'text-transparent focus:text-gray-900'
        }`}
      />
    </td>
  );
}

function TimeCell({
  value,
  onChange,
}: {
  value: string | null; // "HH:MM" 24h
  onChange: (v: string | null) => void;
}) {
  const has = !!value;
  // Empty <input type="time"> renders as an invisible "--:-- --" string
  // — easy to mistake for missing data vs. "field exists but empty".
  // Overlay a muted em-dash that hides on focus or once a value is set.
  return (
    <td className="p-0 align-middle">
      <div className="relative">
        <input
          type="time"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className={`peer ${cellInputBase} ${
            has ? '' : 'text-transparent focus:text-gray-900'
          }`}
        />
        {!has && (
          <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-gray-300 peer-focus:opacity-0">
            —
          </span>
        )}
      </div>
    </td>
  );
}

function MoneyCell({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(
    value == null ? '' : (value / 100).toFixed(2)
  );
  const [editing, setEditing] = useState(false);

  return (
    <td className="p-0 align-middle">
      <input
        type="text"
        inputMode="decimal"
        value={editing ? local : value == null ? '' : formatUSD(value)}
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
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="$0.00"
        className={`${cellInputBase} text-right tabular-nums`}
      />
    </td>
  );
}

function PercentCell({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  // commissionRate is stored as a decimal (e.g. 0.10 = 10%). Edit as
  // percent for human comfort.
  const [local, setLocal] = useState<string>(
    value == null ? '' : (value * 100).toFixed(2)
  );
  const [editing, setEditing] = useState(false);

  return (
    <td className="p-0 align-middle">
      <input
        type="text"
        inputMode="decimal"
        value={
          editing
            ? local
            : value == null
            ? ''
            : `${(value * 100).toFixed(2)}%`
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
          // Clamp to [0, 1] (after dividing by 100). 5,4 Decimal in DB
          // means rates above 9.9999 will fail anyway, so 100% cap is
          // the most permissive safe choice.
          const rate = Math.max(0, Math.min(1, n / 100));
          if (rate !== value) onChange(Number(rate.toFixed(4)));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="10.00%"
        className={`${cellInputBase} text-right tabular-nums`}
      />
    </td>
  );
}

function CommissionAmountCell({
  entry,
  updateEntry,
}: {
  entry: EntryRow;
  updateEntry: (id: string, patch: Partial<EntryRow>) => void;
}) {
  const [local, setLocal] = useState<string>('');
  const [editing, setEditing] = useState(false);

  const overridden = isOverridden(entry);
  const effective = effectiveCommissionCents(entry);
  const auto = autoCommissionCents(entry);

  // The cell shows formatted currency when not editing. When she focuses
  // it we drop into raw-number editing. Typing a value sets the override;
  // a small ↻ button clears it back to auto.
  return (
    <td className="p-0 align-middle">
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={
            editing
              ? local
              : effective == null
              ? ''
              : formatUSD(effective)
          }
          onFocus={() => {
            setLocal(effective == null ? '' : (effective / 100).toFixed(2));
            setEditing(true);
          }}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const cleaned = local.replace(/[^0-9.\-]/g, '');
            if (cleaned === '') {
              // Empty = revert to auto-calc.
              if (overridden) updateEntry(entry.id, { commissionAmountCents: null });
              return;
            }
            const n = Number(cleaned);
            if (!Number.isFinite(n)) return;
            const cents = Math.round(n * 100);
            // If she typed exactly the auto value, no need to mark as
            // override — keep it tied to rate × deal so future changes
            // still flow through.
            if (cents === auto) {
              if (overridden) updateEntry(entry.id, { commissionAmountCents: null });
              return;
            }
            if (cents !== entry.commissionAmountCents) {
              updateEntry(entry.id, { commissionAmountCents: cents });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="$0.00"
          className={`${cellInputBase} text-right tabular-nums ${
            overridden
              ? 'font-semibold text-amber-700'
              : effective != null
              ? 'text-gray-500'
              : ''
          }`}
          title={
            overridden
              ? `Manual override (auto would be ${auto != null ? formatUSD(auto) : '—'})`
              : 'Auto-calculated from deal × rate'
          }
        />
        {overridden && !editing && (
          <button
            type="button"
            onClick={() =>
              updateEntry(entry.id, { commissionAmountCents: null })
            }
            className="absolute right-1 p-1 rounded text-amber-600 hover:bg-amber-50"
            aria-label="Reset to auto-calculated amount"
            title="Reset to auto-calculated amount"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </td>
  );
}

function TriStateCell({
  value,
  onChange,
}: {
  value: TriState | null;
  onChange: (v: TriState | null) => void;
}) {
  const v: TriState = value ?? 'PENDING';
  const cycle = (): TriState =>
    v === 'PENDING' ? 'YES' : v === 'YES' ? 'NO' : 'PENDING';

  const styles: Record<TriState, string> = {
    YES: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    NO: 'bg-red-100 text-red-800 ring-red-200',
    PENDING: 'bg-gray-100 text-gray-600 ring-gray-200',
  };

  return (
    <td className="px-3 py-1 align-middle">
      <button
        type="button"
        onClick={() => onChange(cycle())}
        className={`inline-flex items-center justify-center min-w-[80px] px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-inset transition ${styles[v]}`}
        title="Click to cycle: PENDING → YES → NO"
      >
        {v}
      </button>
    </td>
  );
}

function BoolCell({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <td className="px-3 py-1 align-middle">
      <button
        type="button"
        onClick={() => onChange(!value)}
        title={
          value
            ? 'Rebecca has been paid her commission for this deal'
            : 'Rebecca is still owed commission for this deal'
        }
        className={`inline-flex items-center justify-center min-w-[80px] px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-inset transition ${
          value
            ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
            : 'bg-amber-100 text-amber-800 ring-amber-200'
        }`}
      >
        {value ? 'I GOT PAID' : 'STILL OWED'}
      </button>
    </td>
  );
}

function ExportMenu({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  // Both exports use direct anchors with target="_blank" instead of
  // fetch+blob. Reasoning:
  //  - Safari has historical issues with programmatic Blob downloads;
  //    direct links + Content-Disposition is the most reliable path.
  //  - iOS PWAs: target="_blank" forces the browser to open the file
  //    in Safari (where the share sheet works) instead of navigating
  //    the PWA itself. Without _blank the entire app would replace
  //    its document with the PDF binary on iOS standalone.
  //  - rel="noopener noreferrer" matches the security baseline for
  //    every other external/new-tab link in the codebase.
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={closeMenu}
            aria-hidden
          />
          <div className="absolute right-0 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
            <a
              href={`/api/admin/sales-tracker/sessions/${sessionId}/export`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 text-left"
            >
              <FileSpreadsheet className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Export CSV</div>
                <div className="text-xs text-gray-500">All entries · open in Excel</div>
              </div>
            </a>
            <a
              href={`/api/admin/sales-tracker/sessions/${sessionId}/export-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 text-left border-t border-gray-100"
            >
              <FileTextIcon className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Export PDF report</div>
                <div className="text-xs text-gray-500">
                  Stats, charts, and all entries
                </div>
              </div>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function FilterChipBar({
  paidFilter,
  setPaidFilter,
  closeFilter,
  setCloseFilter,
  sectionFilter,
  setSectionFilter,
  knownTags,
  anyActive,
  onClear,
}: {
  paidFilter: 'all' | 'paid' | 'owed';
  setPaidFilter: (v: 'all' | 'paid' | 'owed') => void;
  closeFilter: 'all' | 'closed' | 'showedNoClose' | 'noShow';
  setCloseFilter: (v: 'all' | 'closed' | 'showedNoClose' | 'noShow') => void;
  sectionFilter: string;
  setSectionFilter: (v: string) => void;
  knownTags: string[];
  anyActive: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ChipGroup
        label="Status"
        value={paidFilter}
        options={[
          { v: 'all', label: 'All' },
          { v: 'owed', label: 'Owed to me' },
          { v: 'paid', label: 'Paid to me' },
        ]}
        onChange={(v) => setPaidFilter(v as typeof paidFilter)}
      />
      <ChipGroup
        label="Outcome"
        value={closeFilter}
        options={[
          { v: 'all', label: 'All' },
          { v: 'closed', label: 'Closed' },
          { v: 'showedNoClose', label: 'Showed, no close' },
          { v: 'noShow', label: 'No-show' },
        ]}
        onChange={(v) => setCloseFilter(v as typeof closeFilter)}
      />
      <select
        value={sectionFilter}
        onChange={(e) => setSectionFilter(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
      >
        <option value="all">All sections</option>
        <option value="__uncategorized__">Uncategorized</option>
        {knownTags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {anyActive && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function ChipGroup<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: Array<{ v: V; label: string }>;
  onChange: (v: V) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
      <span className="px-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </span>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------
// Section grouping
// ----------------------------------------------------------------

function GroupSection({
  group,
  knownTags,
  tagColor,
  updateEntry,
  addEntry,
  renameTag,
  onAskDeleteRow,
  onAskDeleteTag,
  onChangeColor,
  onAnalyzeSection,
  selectedIds,
  toggleSelected,
  onToggleAllInGroup,
  duplicateEntry,
}: {
  group: Group;
  knownTags: string[];
  tagColor: import('./types').TagColorName | null;
  updateEntry: (id: string, patch: Partial<EntryRow>) => void;
  addEntry: (tag?: string | null) => Promise<EntryRow | undefined>;
  renameTag: (from: string | null, to: string | null) => Promise<void>;
  onAskDeleteRow: (id: string) => void;
  onAskDeleteTag: (tag: string, count: number) => void;
  onChangeColor?: (tag: string) => void;
  onAnalyzeSection?: (tag: string) => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  onToggleAllInGroup: (ids: string[], allSelected: boolean) => void;
  duplicateEntry?: (id: string) => Promise<void>;
}) {
  const groupIds = group.entries.map((e) => e.id);
  const allSelected =
    groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id));
  const someSelected = groupIds.some((id) => selectedIds.has(id));

  // Per-section totals for the bar — visible at-a-glance numbers so
  // Rebecca knows where her money is without flipping to Analytics.
  let totalCommission = 0;
  let paidCommission = 0;
  for (const e of group.entries) {
    if (e.didClose !== 'YES') continue;
    const eff = effectiveCommissionCents(e) ?? 0;
    totalCommission += eff;
    if (e.commissionPaid) paidCommission += eff;
  }
  const owedCommission = totalCommission - paidCommission;

  return (
    <>
      <SectionHeaderRow
        tag={group.tag}
        tagColor={tagColor}
        count={group.entries.length}
        totalCommissionCents={totalCommission}
        paidCommissionCents={paidCommission}
        owedCommissionCents={owedCommission}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleAllInGroup={() => onToggleAllInGroup(groupIds, allSelected)}
        onAdd={() => addEntry(group.tag)}
        onRename={(to) => renameTag(group.tag, to)}
        onDeleteSection={() =>
          group.tag != null && onAskDeleteTag(group.tag, group.entries.length)
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
      {group.entries.map((e) => (
        <DataRow
          key={e.id}
          entry={e}
          knownTags={knownTags}
          selected={selectedIds.has(e.id)}
          onToggleSelected={() => toggleSelected(e.id)}
          updateEntry={updateEntry}
          onAskDelete={() => onAskDeleteRow(e.id)}
          onDuplicate={duplicateEntry ? () => duplicateEntry(e.id) : undefined}
        />
      ))}
    </>
  );
}

function SectionHeaderRow({
  tag,
  tagColor,
  count,
  totalCommissionCents,
  paidCommissionCents,
  owedCommissionCents,
  allSelected,
  someSelected,
  onToggleAllInGroup,
  onAdd,
  onRename,
  onDeleteSection,
  onChangeColor,
  onAnalyzeSection,
}: {
  tag: string | null;
  tagColor?: import('./types').TagColorName | null;
  count: number;
  totalCommissionCents: number;
  paidCommissionCents: number;
  owedCommissionCents: number;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAllInGroup: () => void;
  onAdd: () => void;
  onRename: (to: string | null) => void;
  onDeleteSection: () => void;
  onChangeColor?: () => void;
  onAnalyzeSection?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tag ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const styles = tagStyles(tag, tagColor ?? null);
  const label = tag ?? 'Uncategorized';

  // Section bar layout: tag name + controls cluster, all left-aligned
  // immediately after the name. The colSpan'd bar is wider than the
  // viewport (the table has horizontal scroll), so right-aligned
  // controls would render off-screen. Keeping everything packed left
  // means the kebab and Add button are always reachable without any
  // horizontal scroll.
  return (
    <tr>
      <td colSpan={COL_COUNT} className="p-0">
        <div
          className={`flex items-center gap-3 px-4 py-2 shadow-sm ${styles.bar} ${styles.barText}`}
        >
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={onToggleAllInGroup}
            className="rounded border-white/40 bg-white/30 text-maxxed-blue focus:ring-white/50 cursor-pointer"
            aria-label={`Select all in ${tag ?? 'Uncategorized'}`}
          />
          {editing ? (
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const next = draft.trim();
                  if (next && next !== tag) onRename(next);
                  setEditing(false);
                } else if (e.key === 'Escape') {
                  setEditing(false);
                  setDraft(tag ?? '');
                }
              }}
              onBlur={() => {
                const next = draft.trim();
                if (next && next !== tag) onRename(next);
                setEditing(false);
              }}
              className="flex-1 bg-white/20 placeholder-white/60 px-2 py-0.5 rounded text-sm font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => tag != null && (setDraft(tag), setEditing(true))}
              className="font-bold text-sm uppercase tracking-wider truncate text-left disabled:cursor-default min-w-0 max-w-[60ch]"
              disabled={tag == null}
              title={tag != null ? 'Click to rename section' : ''}
            >
              {label}
            </button>
          )}

          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span className="opacity-80">
              {count} {count === 1 ? 'entry' : 'entries'}
            </span>
            {totalCommissionCents > 0 && (
              <>
                <span className="opacity-50">·</span>
                <span
                  className="opacity-90 tabular-nums"
                  title={`Paid to me: ${formatUSD(paidCommissionCents)} · Owed to me: ${formatUSD(owedCommissionCents)}`}
                >
                  {formatUSD(totalCommissionCents)}
                </span>
                {owedCommissionCents > 0 && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/25 text-[10px] font-bold tabular-nums"
                    title="Commission still owed to me in this section"
                  >
                    {formatUSD(owedCommissionCents)} owed
                  </span>
                )}
              </>
            )}
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 font-semibold transition"
              title={tag != null ? `Add entry to ${tag}` : 'Add entry'}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
            {tag != null && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded bg-white/20 hover:bg-white/30 transition"
                  aria-label="Section menu"
                  title="Section options (rename, change color, delete)"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-30 overflow-hidden text-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setDraft(tag);
                          setEditing(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
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
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
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
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
                        >
                          <ArrowUp className="w-4 h-4 rotate-45" />
                          View analytics
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDeleteSection();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 text-left"
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
      </td>
    </tr>
  );
}

function DataRow({
  entry: e,
  knownTags,
  selected,
  onToggleSelected,
  updateEntry,
  onAskDelete,
  onDuplicate,
}: {
  entry: EntryRow;
  knownTags: string[];
  selected: boolean;
  onToggleSelected: () => void;
  updateEntry: (id: string, patch: Partial<EntryRow>) => void;
  onAskDelete: () => void;
  onDuplicate?: () => void;
}) {
  return (
    <tr
      className={`border-t border-gray-100 hover:bg-gray-50/60 group ${
        selected ? 'bg-blue-50/40' : ''
      }`}
    >
      <td className="px-3 py-1 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          className="rounded border-gray-300 text-maxxed-blue focus:ring-maxxed-blue/30 cursor-pointer"
          aria-label="Select row"
        />
      </td>
      <TextCell
        value={e.name}
        onChange={(v) => updateEntry(e.id, { name: v })}
        placeholder="Full name"
      />
      <TextCell
        value={e.email}
        onChange={(v) => updateEntry(e.id, { email: v })}
        type="email"
        placeholder="email@example.com"
      />
      <TextCell
        value={e.phone}
        onChange={(v) => updateEntry(e.id, { phone: v })}
        type="tel"
        placeholder="(555) 555-5555"
      />
      <DateCell
        value={e.contactDate}
        onChange={(v) => updateEntry(e.id, { contactDate: v })}
      />
      <TimeCell
        value={e.contactTime}
        onChange={(v) => updateEntry(e.id, { contactTime: v })}
      />
      <TriStateCell
        value={e.didShow}
        onChange={(v) => updateEntry(e.id, { didShow: v })}
      />
      <TriStateCell
        value={e.didClose}
        onChange={(v) => updateEntry(e.id, { didClose: v })}
      />
      <MoneyCell
        value={e.dealAmountCents}
        onChange={(v) => updateEntry(e.id, { dealAmountCents: v })}
      />
      <PercentCell
        value={e.commissionRate}
        onChange={(v) => updateEntry(e.id, { commissionRate: v })}
      />
      <CommissionAmountCell entry={e} updateEntry={updateEntry} />
      <DateCell
        value={e.commissionDue}
        onChange={(v) => updateEntry(e.id, { commissionDue: v })}
      />
      <BoolCell
        value={e.commissionPaid}
        onChange={(v) => updateEntry(e.id, { commissionPaid: v })}
      />
      <NotesCell
        entry={e}
        onChange={(v) => updateEntry(e.id, { notes: v })}
      />
      <td className="px-2 py-1">
        {/* Persistent action group — always visible (low opacity at rest,
            full on hover) so delete and section move are discoverable
            without forcing the user to hover-discover. */}
        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition">
          <TagPicker
            value={e.tag}
            knownTags={knownTags}
            onChange={(next) => updateEntry(e.id, { tag: next })}
            variant="plain"
          />
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate row"
              aria-label="Duplicate row"
              className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onAskDelete}
            title="Delete row"
            aria-label="Delete row"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NotesCell({
  entry,
  onChange,
}: {
  entry: EntryRow;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const value = entry.notes ?? '';
  const hasContent = value.trim().length > 0;

  // The button is `flex` with a span we want to truncate. Flex children
  // need `min-w-0` for `truncate` to actually clip — otherwise the span
  // grows to fit the full note text and stretches the whole row vertical-
  // ly. Capping the cell width via the column header's min-w isn't
  // enough; `whitespace-nowrap` on the cell keeps everything on one line.
  return (
    <td className="p-0 align-middle whitespace-nowrap max-w-[240px]">
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={hasContent ? value : 'Click to add notes'}
        className={`group/notes w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-maxxed-blue/40 transition ${
          hasContent ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        <FileText
          className={`w-3.5 h-3.5 shrink-0 ${
            hasContent
              ? 'text-maxxed-blue'
              : 'text-gray-300 group-hover/notes:text-gray-500'
          }`}
        />
        <span className="flex-1 min-w-0 truncate">
          {hasContent ? value : 'Add notes…'}
        </span>
      </button>

      {open && (
        <NotesModal
          entry={entry}
          onClose={() => setOpen(false)}
          onChange={onChange}
        />
      )}
    </td>
  );
}

function NotesModal({
  entry,
  onClose,
  onChange,
}: {
  entry: EntryRow;
  onClose: () => void;
  onChange: (v: string | null) => void;
}) {
  useEscape(onClose);
  // Bind directly to the prop — parent debounces saves, so each keystroke
  // round-trips cleanly. Closing the modal is a UI concern only; the
  // latest value is already in flight to the server.
  const value = entry.notes ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </div>
            <div className="font-bold text-gray-900 truncate">
              {entry.name || (
                <span className="text-gray-400 italic">No name</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <textarea
            autoFocus
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next === '' ? null : next);
            }}
            rows={10}
            placeholder="Anything to remember about this lead — context, next steps, links, follow-up dates…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-relaxed focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none resize-y min-h-[200px]"
          />
          <p className="text-xs text-gray-500 mt-2">
            Saves automatically as you type.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white hover:bg-maxxed-blue/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteRowModal({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: EntryRow;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEscape(onCancel);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900">Delete entry?</h3>
        <p className="text-sm text-gray-600 mt-1">
          {entry.name ? (
            <>
              This will remove{' '}
              <span className="font-semibold">{entry.name}</span> from the session.
            </>
          ) : (
            'This will remove the entry from the session.'
          )}{' '}
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function NewSectionModal({
  existingTags,
  onCancel,
  onCreate,
}: {
  existingTags: string[];
  onCancel: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  useEscape(onCancel);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = name.trim();
  const duplicate = existingTags.some(
    (t) => t.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !submitting && onCancel()}
    >
      <form
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!trimmed || duplicate || submitting) return;
          setSubmitting(true);
          await onCreate(trimmed);
          setSubmitting(false);
        }}
      >
        <h3 className="text-base font-bold text-gray-900">New section</h3>
        <p className="text-sm text-gray-500 mt-1">
          A new entry will be added under this section so it shows up in the editor right away.
        </p>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. ATLANTA, Q3 Outbound, Webinar Leads"
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
        />
        {duplicate && (
          <p className="text-xs text-amber-600 mt-1">
            A section named "{trimmed}" already exists.
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed || duplicate || submitting}
            className="rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteSectionModal({
  tag,
  count,
  onCancel,
  onConfirm,
}: {
  tag: string;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEscape(onCancel);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900">
          Delete section &quot;{tag}&quot;?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          The {count} {count === 1 ? 'entry' : 'entries'} in this section
          won&apos;t be deleted — they&apos;ll move to Uncategorized. You can
          re-tag them at any time.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete section
          </button>
        </div>
      </div>
    </div>
  );
}
