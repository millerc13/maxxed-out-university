'use client';

import { useEffect, useRef, useState } from 'react';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { tagStyles } from './types';

interface Props {
  /** Current tag on the entry. */
  value: string | null;
  /** All tags currently in use in this session — used as suggestions. */
  knownTags: string[];
  /** Setter — null clears the tag. */
  onChange: (next: string | null) => void;
  /** Visual style — pill is for inline cells; full-width is for the section header bar. */
  variant?: 'pill' | 'plain';
}

export function TagPicker({ value, knownTags, onChange, variant = 'pill' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const lowered = query.trim().toLowerCase();
  const filtered = knownTags.filter((t) => t.toLowerCase().includes(lowered));
  const exactExists = knownTags.some(
    (t) => t.toLowerCase() === lowered && lowered !== ''
  );
  const styles = tagStyles(value);

  return (
    <div className="relative inline-block">
      {variant === 'pill' ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ring-1 ring-inset transition max-w-[160px] ${styles.pill}`}
          title={value ? `Section: ${value}` : 'Click to set section'}
        >
          {value ? (
            <>
              <span className="truncate">{value}</span>
            </>
          ) : (
            <>
              <TagIcon className="w-3 h-3" />
              <span>Tag</span>
            </>
          )}
        </button>
      ) : (
        // Icon-only on hover so the row stays a uniform height even
        // when the tag name is long ("Production 35k with Tim - Miami
        // contacts"). Tooltip shows the full name. Section grouping
        // above already makes the tag obvious for the data row itself.
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={value ? `Section: ${value} (click to move)` : 'Add to a section'}
          aria-label={value ? `Section: ${value}` : 'Add to a section'}
          className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <TagIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-30 mt-1 left-0 w-64 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = query.trim();
                  if (v) {
                    onChange(v);
                    setOpen(false);
                  }
                }
              }}
              placeholder="Search or create section…"
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 text-left"
              >
                <X className="w-3.5 h-3.5" />
                Remove section
              </button>
            )}

            {filtered.length === 0 && lowered === '' && (
              <p className="px-3 py-2 text-xs text-gray-400">
                No sections yet. Type to create one.
              </p>
            )}

            {filtered.map((t) => {
              const s = tagStyles(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 text-left"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ring-1 ring-inset ${s.pill}`}
                  >
                    {t}
                  </span>
                  {value === t && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })}

            {lowered && !exactExists && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-maxxed-blue hover:bg-blue-50 border-t border-gray-100 text-left"
              >
                <Plus className="w-4 h-4" />
                Create "{query.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
