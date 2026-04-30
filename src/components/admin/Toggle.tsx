'use client';

import { useId } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  disabled?: boolean;
}

/**
 * Pill-switch toggle styled to match the maxxed-blue brand. Replaces the
 * native checkboxes used across the admin form.
 *
 * Layout: switch on the right, label + optional description filling the
 * remaining row width. Click anywhere on the label flips the switch.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
  disabled,
}: ToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={`flex items-start gap-4 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 leading-tight">
          {label}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        id={inputId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/50 focus-visible:ring-offset-2 ${
          checked ? 'bg-maxxed-blue' : 'bg-gray-300'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-out ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}
