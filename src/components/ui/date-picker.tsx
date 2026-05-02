'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-day-picker/style.css';

/**
 * Cross-platform date input — same polished react-day-picker calendar
 * inside a Radix Popover on every screen size. Day cells scale up to
 * 44px on touch viewports (Apple HIG minimum), trigger button is
 * 16px font (no iOS auto-zoom on tap), popover auto-flips when near
 * the bottom of the viewport so the calendar always renders fully
 * onscreen on phones.
 *
 * Value is always YYYY-MM-DD (matches `<input type="date">` contract
 * so it round-trips through existing form state without re-encoding).
 */
interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

// YYYY-MM-DD ↔ Date helpers that don't shift across midnight in non-UTC TZs.
function parseLocal(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}
function toIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function formatHuman(s: string): string {
  const d = parseLocal(s);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'Pick a date',
  ariaLabel,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocal(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={`flex-1 min-w-0 h-11 px-3 inline-flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg text-base sm:text-sm text-gray-900 hover:border-gray-300 active:border-maxxed-blue focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
        >
          <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {value ? formatHuman(value) : placeholder}
          </span>
          <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // avoidCollisions auto-flips above when there's no room
          // below — important on phones where the picker often sits
          // near the bottom of the viewport.
          avoidCollisions
          className="z-50 bg-white rounded-2xl ring-1 ring-gray-200 shadow-2xl p-3 animate-in fade-in-0 zoom-in-95 origin-[--radix-popover-content-transform-origin]"
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (d) {
                onChange(toIso(d));
                setOpen(false);
              }
            }}
            showOutsideDays
            fixedWeeks
            styles={{ root: { fontFamily: 'inherit' } }}
            classNames={{
              root: 'rdp-root text-sm',
              months: 'relative',
              month: 'relative',
              // Caption sits behind the absolutely-positioned nav arrows.
              month_caption: 'flex justify-center items-center h-10 font-bold text-gray-900 text-base sm:text-sm',
              nav: 'flex items-center justify-between absolute top-1.5 left-1.5 right-1.5 z-10',
              // 44px nav buttons on mobile (touch target), 32px on desktop.
              button_previous: 'h-11 w-11 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 cursor-pointer transition-colors',
              button_next: 'h-11 w-11 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 cursor-pointer transition-colors',
              month_grid: 'border-collapse',
              weekdays: 'flex',
              weekday: 'w-11 h-9 sm:w-10 sm:h-8 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-center',
              week: 'flex',
              // 44x44 day cells on mobile (Apple HIG minimum), 40x40 on desktop.
              day: 'w-11 h-11 sm:w-10 sm:h-10 inline-flex items-center justify-center',
              day_button: 'w-full h-full inline-flex items-center justify-center rounded-xl text-base sm:text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-maxxed-blue active:bg-blue-100 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40',
              selected: '[&_button]:!bg-maxxed-blue [&_button]:!text-white [&_button]:!font-bold [&_button]:hover:!bg-blue-700',
              today: '[&_button]:!font-bold [&_button]:!text-maxxed-blue',
              outside: '[&_button]:!text-gray-300',
              disabled: '[&_button]:!text-gray-200 [&_button]:!cursor-not-allowed [&_button]:hover:!bg-transparent',
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
