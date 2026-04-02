'use client';

import { useRef, useState, cloneElement, type ReactElement } from 'react';
import { FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react';
import type { ExportFormat } from './registry';

/* ------------------------------------------------------------------ */
/*  Public types — imported by all tool components                     */
/* ------------------------------------------------------------------ */

export interface ToolHandle {
  getExportData: () => ExportPayload;
}

export interface ExportPayload {
  title: string;
  type: 'calculator' | 'tracker' | 'template' | 'script' | 'checklist';
  sections: ExportSection[];
}

export interface ExportSection {
  heading: string;
  rows?: { label: string; value: string }[];
  table?: { headers: string[]; rows: string[][] };
  checkItems?: { label: string; checked: boolean }[];
  paragraphs?: string[];
}

/* ------------------------------------------------------------------ */
/*  Format metadata                                                    */
/* ------------------------------------------------------------------ */

const FORMAT_META: Record<ExportFormat, { label: string; icon: typeof FileText; ext: string }> = {
  pdf: { label: 'Export PDF', icon: FileText, ext: 'pdf' },
  excel: { label: 'Export Excel', icon: FileSpreadsheet, ext: 'xlsx' },
  docx: { label: 'Export DOCX', icon: File, ext: 'docx' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ExportableToolShellProps {
  toolTitle: string;
  exportFormats: ExportFormat[];
  children: ReactElement<any>;
}

export function ExportableToolShell({
  toolTitle,
  exportFormats,
  children,
}: ExportableToolShellProps) {
  const toolRef = useRef<ToolHandle>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!toolRef.current) return;
    setExporting(format);

    try {
      const payload = toolRef.current.getExportData();

      if (format === 'pdf') {
        const { exportPdf } = await import('@/lib/export/export-pdf');
        await exportPdf(payload);
      } else if (format === 'excel') {
        const { exportExcel } = await import('@/lib/export/export-excel');
        await exportExcel(payload);
      } else if (format === 'docx') {
        const { exportDocx } = await import('@/lib/export/export-docx');
        await exportDocx(payload);
      }
    } catch (err) {
      console.error(`Export ${format} failed:`, err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      {/* Export Bar */}
      <div className="flex items-center justify-end gap-2 mb-6">
        {exportFormats.map((fmt) => {
          const meta = FORMAT_META[fmt];
          const Icon = meta.icon;
          const isActive = exporting === fmt;
          return (
            <button
              key={fmt}
              type="button"
              disabled={exporting !== null}
              onClick={() => handleExport(fmt)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700
                hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isActive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Tool Content — pass ref to child */}
      {cloneElement(children, { ref: toolRef })}
    </div>
  );
}
