'use client';

import { useState, useRef, useCallback, useEffect, type ComponentType } from 'react';
import { Save, FolderOpen, X, Trash2, Loader2, FileText, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/calc-utils';

/* ------------------------------------------------------------------ */
/*  Public types (imported by calculator components)                   */
/* ------------------------------------------------------------------ */

export interface CalculatorHandle {
  getState: () => { inputs: Record<string, any>; results: Record<string, any> };
  loadState: (inputs: Record<string, any>) => void;
  getName: () => string;
}

export interface SavedReportSummary {
  id: string;
  name: string;
  toolSlug: string;
  results: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Metric preview helpers                                            */
/* ------------------------------------------------------------------ */

const METRIC_CONFIGS: Record<string, { label: string; format: (v: any) => string }[]> = {
  'multi-family-calculator': [
    { label: 'NOI', format: (v) => formatCurrency(v) },
    { label: 'Cap Rate', format: (v) => formatPercent(v) },
    { label: 'Cash Flow', format: (v) => formatCurrency(v) },
  ],
  'cap-rate-underwriter': [
    { label: 'Current Cap', format: (v) => formatPercent(v) },
    { label: 'Asking Cap', format: (v) => formatPercent(v) },
  ],
};

const RESULT_KEY_MAP: Record<string, string[]> = {
  'multi-family-calculator': ['noi', 'capRate', 'cashFlow'],
  'cap-rate-underwriter': ['currentCapRate', 'askingCapRate'],
};

function MetricPills({ toolSlug, results }: { toolSlug: string; results: Record<string, any> }) {
  const configs = METRIC_CONFIGS[toolSlug];
  const keys = RESULT_KEY_MAP[toolSlug];
  if (!configs || !keys) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {configs.map((cfg, i) => {
        const val = results[keys[i]];
        if (val === undefined || val === null) return null;
        return (
          <span
            key={cfg.label}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md"
          >
            <span className="text-gray-400">{cfg.label}</span>
            <span className="text-gray-700 tabular-nums">{cfg.format(val)}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ToolWrapper Props                                                  */
/* ------------------------------------------------------------------ */

interface ToolWrapperProps {
  toolSlug: string;
  toolTitle: string;
  CalculatorComponent: ComponentType<{ ref: React.Ref<CalculatorHandle> }>;
  initialReports: SavedReportSummary[];
  reportCount: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ToolWrapper({
  toolSlug,
  toolTitle,
  CalculatorComponent,
  initialReports,
  reportCount: initialCount,
}: ToolWrapperProps) {
  const calcRef = useRef<CalculatorHandle>(null);
  const [reports, setReports] = useState<SavedReportSummary[]>(initialReports);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeReportName, setActiveReportName] = useState<string | null>(null);

  // Save bar state
  const [saveBarOpen, setSaveBarOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const atLimit = totalCount >= 10;

  /* ---- Save ---- */
  const openSaveBar = useCallback(() => {
    if (atLimit) {
      setPanelOpen(true);
      return;
    }
    const name = calcRef.current?.getName() || 'Untitled Report';
    setSaveName(name);
    setSaveError(null);
    setSaveBarOpen(true);
  }, [atLimit]);

  const handleSave = useCallback(async () => {
    if (!calcRef.current || !saveName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { inputs, results } = calcRef.current.getState();
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), toolSlug, inputs, results }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save');
        return;
      }
      setReports((prev) => [
        { id: data.report.id, name: data.report.name, toolSlug, results, createdAt: data.report.createdAt, updatedAt: data.report.updatedAt },
        ...prev,
      ]);
      setTotalCount((c) => c + 1);
      setActiveReportId(data.report.id);
      setActiveReportName(data.report.name);
      setSaveBarOpen(false);
      setToast('Report saved');
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  }, [saveName, toolSlug]);

  /* ---- Update (re-save) ---- */
  const handleUpdate = useCallback(async () => {
    if (!calcRef.current || !activeReportId) return;
    setSaving(true);
    try {
      const { inputs, results } = calcRef.current.getState();
      const res = await fetch(`/api/reports/${activeReportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, results }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === activeReportId
              ? { ...r, results, updatedAt: new Date().toISOString() }
              : r,
          ),
        );
        setToast('Report updated');
      }
    } catch {
      // silent fail for update
    } finally {
      setSaving(false);
    }
  }, [activeReportId]);

  /* ---- Load ---- */
  const handleLoad = useCallback(async (reportId: string) => {
    setLoadingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();
      if (res.ok && data.report && calcRef.current) {
        calcRef.current.loadState(data.report.inputs);
        setActiveReportId(reportId);
        setActiveReportName(data.report.name);
        setPanelOpen(false);
        setToast(`Loaded "${data.report.name}"`);
      }
    } catch {
      // silent
    } finally {
      setLoadingId(null);
    }
  }, []);

  /* ---- Delete ---- */
  const handleDelete = useCallback(async (reportId: string) => {
    setDeletingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        setTotalCount((c) => c - 1);
        if (activeReportId === reportId) {
          setActiveReportId(null);
          setActiveReportName(null);
        }
        setToast('Report deleted');
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }, [activeReportId]);

  /* ---- Clear loaded report ---- */
  const handleClear = useCallback(() => {
    setActiveReportId(null);
    setActiveReportName(null);
  }, []);

  return (
    <div className="relative">
      {/* ---- Action bar ---- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {activeReportId && activeReportName && (
            <div className="flex items-center gap-2 text-sm bg-[#0000CC]/5 border border-[#0000CC]/15 text-[#0000CC] px-3 py-1.5 rounded-lg">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-medium truncate max-w-[200px]">{activeReportName}</span>
              <button
                onClick={handleClear}
                className="ml-1 text-[#0000CC]/50 hover:text-[#0000CC] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Report counter / panel toggle */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              panelOpen
                ? 'bg-[#0000CC] text-white border-[#0000CC]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span className="tabular-nums">{reports.length}</span>
            <span className="text-[10px] opacity-60">/10</span>
          </button>

          {/* Save / Update button */}
          {activeReportId ? (
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[#0000CC] text-white hover:bg-[#0000aa] disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update
            </button>
          ) : (
            <button
              onClick={openSaveBar}
              disabled={saveBarOpen}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                atLimit
                  ? 'bg-gray-100 text-gray-400 border border-gray-200'
                  : 'bg-[#0000CC] text-white hover:bg-[#0000aa]'
              }`}
            >
              <Save className="w-4 h-4" />
              {atLimit ? '10/10' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* ---- Inline Save Bar ---- */}
      {saveBarOpen && (
        <div className="mb-4 flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Report name..."
            maxLength={100}
            autoFocus
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all"
          />
          <button
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[#0000CC] text-white hover:bg-[#0000aa] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            onClick={() => setSaveBarOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {saveError && (
            <span className="text-sm text-red-500 font-medium">{saveError}</span>
          )}
        </div>
      )}

      {/* ---- Slide-over Panel ---- */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setPanelOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Saved Reports</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {totalCount} of 10 saves used
                </p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Capacity bar */}
            <div className="px-5 py-3 border-b border-gray-50">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    totalCount >= 10 ? 'bg-red-400' : totalCount >= 7 ? 'bg-amber-400' : 'bg-[#0000CC]'
                  }`}
                  style={{ width: `${(totalCount / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Report list */}
            <div className="flex-1 overflow-y-auto">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">No saved reports</p>
                  <p className="text-xs text-gray-400">
                    Fill in the calculator and save to keep your analysis.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {reports.map((report) => {
                    const isActive = report.id === activeReportId;
                    const isLoading = loadingId === report.id;
                    const isDeleting = deletingId === report.id;

                    return (
                      <div
                        key={report.id}
                        className={`px-5 py-4 transition-colors ${
                          isActive ? 'bg-[#0000CC]/[0.03]' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${isActive ? 'text-[#0000CC]' : 'text-gray-900'}`}>
                              {report.name}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(report.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <MetricPills toolSlug={toolSlug} results={report.results} />
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            <button
                              onClick={() => handleLoad(report.id)}
                              disabled={isLoading || isActive}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isActive
                                  ? 'text-[#0000CC]/40 cursor-default'
                                  : 'text-[#0000CC] hover:bg-[#0000CC]/10'
                              }`}
                              title={isActive ? 'Currently loaded' : 'Load report'}
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(report.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete report"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---- Calculator ---- */}
      <CalculatorComponent ref={calcRef} />

      {/* ---- Toast ---- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
