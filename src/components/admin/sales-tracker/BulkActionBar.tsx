'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ArrowRightLeft,
  Trash2,
  X,
} from 'lucide-react';
import { tagStyles } from './types';

interface Props {
  count: number;
  knownTags: string[];
  onClear: () => void;
  onMarkPaid: () => Promise<void> | void;
  onMarkUnpaid: () => Promise<void> | void;
  onMove: (tag: string | null) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

/**
 * Bottom-anchored action bar that slides in when one or more rows are
 * selected. Same layout works on desktop and mobile (full-width on
 * narrow viewports, centered with max-width on wider ones).
 */
export function BulkActionBar({
  count,
  knownTags,
  onClear,
  onMarkPaid,
  onMarkUnpaid,
  onMove,
  onDelete,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] sm:w-auto">
        {/* Single bar: text labels collapse to icon-only below `sm`, so
            all 4 actions + count + close fit on the narrowest phone
            without horizontal overflow. Hover labels are still
            available via `title=` for accessibility. */}
        <div className="flex items-center gap-1 sm:gap-2 rounded-2xl bg-gray-900 text-white shadow-2xl px-2 sm:px-3 py-2 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full hover:bg-white/10"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="font-semibold text-sm tabular-nums px-1 shrink-0">
            {count}
            <span className="hidden sm:inline"> selected</span>
          </span>
          <span className="w-px h-6 bg-white/20 mx-0.5 sm:mx-1 shrink-0" />
          <BarButton
            onClick={onMarkPaid}
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Mark paid"
          />
          <BarButton
            onClick={onMarkUnpaid}
            icon={<Circle className="w-4 h-4" />}
            label="Mark unpaid"
          />
          <div className="relative shrink-0">
            <BarButton
              onClick={() => setMovePickerOpen((v) => !v)}
              icon={<ArrowRightLeft className="w-4 h-4" />}
              label="Move to…"
            />
            {movePickerOpen && (
              <MovePicker
                knownTags={knownTags}
                onPick={(t) => {
                  setMovePickerOpen(false);
                  onMove(t);
                }}
                onClose={() => setMovePickerOpen(false)}
              />
            )}
          </div>
          <BarButton
            onClick={() => setConfirmingDelete(true)}
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            danger
          />
        </div>
      </div>

      {confirmingDelete && (
        <DeleteConfirm
          count={count}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            setConfirmingDelete(false);
            await onDelete();
          }}
        />
      )}
    </>
  );
}

function BarButton({
  onClick,
  icon,
  label,
  danger = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
        danger
          ? 'text-red-300 hover:bg-red-500/20'
          : 'text-white hover:bg-white/10'
      }`}
    >
      {icon}
      {/* Hide label on narrow viewports — title attr keeps it accessible
          via long-press tooltip. */}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MovePicker({
  knownTags,
  onPick,
  onClose,
}: {
  knownTags: string[];
  onPick: (tag: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-white text-gray-900 shadow-xl ring-1 ring-black/10 overflow-hidden"
    >
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-gray-500 border-b border-gray-100">
        Move selected to
      </div>
      <div className="max-h-60 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => onPick(null)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 text-left"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-300" />
          Uncategorized
        </button>
        {knownTags.map((t) => {
          const styles = tagStyles(t);
          // tagStyles' swatch is a bg-* class. Reuse it as the dot.
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 text-left"
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-sm ${styles.swatch}`}
              />
              <span className="truncate">{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeleteConfirm({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

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
          Delete {count} {count === 1 ? 'entry' : 'entries'}?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
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
