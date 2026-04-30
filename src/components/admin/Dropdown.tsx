'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface DropdownProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Hand-rolled custom dropdown — closes on outside click + Escape, opens
 * with smooth fade/slide. Replaces native <select> across the admin so
 * the UI stays branded.
 */
export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
  disabled,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-9 flex items-center justify-between gap-2 px-3 text-[14px] text-left bg-white border rounded-md transition-colors ${
          open
            ? 'border-maxxed-blue ring-2 ring-maxxed-blue/30'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <span className="shrink-0 text-gray-500">{selected.icon}</span>
          )}
          <span className="truncate text-gray-900">
            {selected ? selected.label : <span className="text-gray-400">{placeholder}</span>}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
          <ul role="listbox" className="py-1 max-h-64 overflow-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left transition-colors ${
                      isSelected
                        ? 'bg-maxxed-blue/5 text-maxxed-blue'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.icon && (
                      <span className="shrink-0 text-gray-500">{opt.icon}</span>
                    )}
                    <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-maxxed-blue" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
