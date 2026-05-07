'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  sessionId: string;
  knownTags: string[];
  onClose: () => void;
  onImported: (count: number) => void;
}

/**
 * CSV import flow.
 *
 * 1. Pick a file
 * 2. Show preview (header detection + first 5 rows)
 * 3. Optionally pick a default section for rows that don't have one
 * 4. Submit → server appends entries → reload page
 *
 * The server endpoint accepts the same column names we export, plus a
 * handful of common aliases ("Phone Number", "Did The Prospect Show?",
 * etc) so Rebecca's Excel sheet works out of the box.
 */
export function ImportModal({ sessionId, knownTags, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewHeader, setPreviewHeader] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [fallbackTag, setFallbackTag] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const onPickFile = async (f: File | null) => {
    setFile(f);
    setPreviewHeader([]);
    setPreviewRows([]);
    setError(null);
    if (!f) return;
    try {
      const text = await f.text();
      const rows = parseCsvClient(text);
      if (rows.length < 1) {
        setError('CSV looks empty.');
        return;
      }
      setPreviewHeader(rows[0]);
      setPreviewRows(rows.slice(1, 6));
    } catch {
      setError('Could not read this file.');
    }
  };

  const submit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (fallbackTag) fd.append('fallbackTag', fallbackTag);
      const res = await fetch(
        `/api/admin/sales-tracker/sessions/${sessionId}/import`,
        { method: 'POST', body: fd }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Import failed');
      }
      const j = await res.json();
      onImported(j.added ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-200">
          <div className="font-bold text-gray-900">Import from CSV</div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-2 -mr-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto space-y-4">
          {!file && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onPickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="mt-3 text-sm text-gray-700 font-semibold">
                Drop a CSV file here
              </p>
              <p className="text-xs text-gray-500">or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Choose file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-4 text-xs text-gray-500">
                Same columns as the export. Recognized headers include Name,
                Email, Phone, Date, Time, Showed?, Closed?, Deal Amount,
                Commission %, My Commission, Pay Date, Got Paid?, Notes,
                Section.
              </p>
            </div>
          )}

          {file && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="font-semibold text-gray-900 truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => onPickFile(null)}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  Choose a different file
                </button>
              </div>

              {previewHeader.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Preview ({previewRows.length} of N rows)
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {previewHeader.map((h, i) => (
                            <th
                              key={i}
                              className="text-left px-2 py-1.5 font-semibold text-gray-700 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[160px] truncate"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Default section
                  <span className="font-normal lowercase ml-1 text-gray-400">
                    (used for rows that don&apos;t list one)
                  </span>
                </label>
                <select
                  value={fallbackTag}
                  onChange={(e) => setFallbackTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-maxxed-blue focus:ring-2 focus:ring-maxxed-blue/20 focus:outline-none"
                >
                  <option value="">Uncategorized</option>
                  {knownTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 ring-1 ring-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            New rows are <span className="font-semibold">appended</span> — existing entries aren&apos;t changed.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!file || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-maxxed-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? (
                'Importing…'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal client-side CSV parser for the preview. Server has the same
// logic (RFC 4180 quoting, embedded commas, double-quotes).
function parseCsvClient(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
