'use client';

import { useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

/**
 * Bare pill-switch in maxxed-blue brand. Use this when the visual label
 * is provided by the surrounding markup (e.g. compact tri-toggle row in
 * a card). Use `<Toggle>` when you want the switch paired with an
 * always-visible text label + description.
 */
export function Switch({
  checked,
  onChange,
  id,
  disabled,
  ariaLabel,
  size = 'md',
}: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const dims =
    size === 'sm'
      ? {
          root: 'h-5 w-9',
          knob: 'h-4 w-4',
          on: 'translate-x-4',
          off: 'translate-x-0.5',
        }
      : {
          root: 'h-6 w-11',
          knob: 'h-5 w-5',
          on: 'translate-x-5',
          off: 'translate-x-0.5',
        };

  return (
    <button
      type="button"
      role="switch"
      id={inputId}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 inline-flex items-center rounded-full transition-colors duration-200 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/50 focus-visible:ring-offset-1 ${dims.root} ${
        checked ? 'bg-maxxed-blue' : 'bg-gray-300'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block ${dims.knob} rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-out ${
          checked ? dims.on : dims.off
        }`}
      />
    </button>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  disabled?: boolean;
}

/**
 * Labeled pill-switch row. Renders label + optional description on the
 * left and the switch on the right. Click anywhere on the row toggles.
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
      <Switch
        id={inputId}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}
