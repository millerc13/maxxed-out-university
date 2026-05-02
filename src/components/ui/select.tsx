'use client';

import { forwardRef } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Cross-platform select that looks polished on mobile + desktop.
 * Replaces native <select> wherever the default browser dropdown
 * looks bad (especially iOS Safari, where the native picker is OK
 * but the inline trigger styling can't be customized).
 *
 * Built on Radix Select — keyboard nav + screen-reader support out
 * of the box, auto-positions content, doesn't trigger iOS zoom.
 */
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { value, onValueChange, options, placeholder = 'Select…', className = '', ariaLabel, disabled },
  ref,
) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        ref={ref}
        aria-label={ariaLabel}
        className={`w-full h-11 px-3 inline-flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg text-base sm:text-sm text-gray-900 hover:border-gray-300 focus:outline-none focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer data-[placeholder]:text-gray-400 ${className}`}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 min-w-[--radix-select-trigger-width] max-h-[60vh] overflow-hidden bg-white rounded-xl ring-1 ring-gray-200 shadow-2xl animate-in fade-in-0 zoom-in-95 origin-[--radix-select-content-transform-origin]"
        >
          <RadixSelect.Viewport className="p-1.5">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex flex-col items-stretch px-3 py-2.5 sm:py-2 rounded-lg text-base sm:text-sm text-gray-900 cursor-pointer outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-maxxed-blue data-[state=checked]:bg-maxxed-blue data-[state=checked]:text-white data-[state=checked]:font-semibold transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </RadixSelect.ItemIndicator>
                </div>
                {opt.description && (
                  <span className="text-[11px] mt-0.5 text-current opacity-70">{opt.description}</span>
                )}
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
});
