'use client';

import { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import {
  TAG_COLOR_NAMES,
  type TagColorName,
  tagSwatch,
  tagStyles,
} from './types';

interface Props {
  /** Tag whose color we're picking (used in the title + preview). */
  tag: string;
  /** Currently selected color, or null/undefined for Auto. */
  current: TagColorName | null;
  onSelect: (color: TagColorName | null) => void;
  onClose: () => void;
}

/**
 * Modal palette picker. 12 named swatches arranged in a 4-column grid
 * plus an "Auto" option that reverts to the deterministic hash color.
 * The header shows a live preview of the bar so Rebecca sees the
 * change immediately.
 */
export function ColorPicker({ tag, current, onSelect, onClose }: Props) {
  // Esc closes — matches the rest of the modals in this feature.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const previewStyles = tagStyles(tag, current ?? null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-200">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Section color
            </div>
            <div className="font-bold text-gray-900 truncate max-w-[240px]">
              {tag}
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

        {/* Live preview bar — same look as the section bar in the editor. */}
        <div
          className={`mx-5 mt-4 mb-2 px-4 py-2 rounded-lg ${previewStyles.bar} ${previewStyles.barText}`}
        >
          <div className="font-bold text-sm uppercase tracking-wider truncate">
            {tag}
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* Auto option — restores deterministic hash color. */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-sm font-semibold border transition ${
              current == null
                ? 'border-maxxed-blue bg-blue-50 text-maxxed-blue'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Auto
            <span className="text-xs font-normal text-gray-500 ml-auto">
              Color picked from name
            </span>
          </button>

          <div className="grid grid-cols-7 gap-2">
            {TAG_COLOR_NAMES.map((name) => {
              const active = current === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelect(name)}
                  title={name}
                  aria-label={`Color: ${name}`}
                  className={`relative w-10 h-10 rounded-lg ${tagSwatch(name)} hover:scale-110 active:scale-95 transition shadow-sm ${
                    active ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
