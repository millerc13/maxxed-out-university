'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink, DollarSign, Trash2 } from 'lucide-react';

interface SyncResult {
  courseId: string;
  courseTitle: string;
  success: boolean;
  ghlProductId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

interface SyncResponse {
  success: boolean;
  message: string;
  summary: {
    total: number;
    created?: number;
    updated?: number;
    recreated?: number;
    skipped?: number;
    failed: number;
  };
  results: SyncResult[];
}

type ActionType = 'sync' | 'update' | 'recreate';

export function GHLSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [response, setResponse] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: ActionType) => {
    if (action === 'recreate') {
      const confirmed = window.confirm(
        'This will DELETE all course products in GHL and recreate them with correct prices. Continue?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setActionType(action);
    setError(null);
    setResponse(null);

    try {
      const method = action === 'sync' ? 'POST' : action === 'update' ? 'PUT' : 'DELETE';
      const res = await fetch('/api/admin/sync-ghl-products', { method });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} products`);
      }

      setResponse(data);

      // Refresh page to show new mappings
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleAction('sync')}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-maxxed-blue text-white hover:bg-maxxed-blue-dark'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading && actionType === 'sync' ? 'animate-spin' : ''}`} />
          {loading && actionType === 'sync' ? 'Syncing...' : 'Sync New Courses'}
        </button>

        <button
          onClick={() => handleAction('update')}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          <DollarSign className={`w-4 h-4 ${loading && actionType === 'update' ? 'animate-spin' : ''}`} />
          {loading && actionType === 'update' ? 'Updating...' : 'Fix All Prices'}
        </button>

        <button
          onClick={() => handleAction('recreate')}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          <Trash2 className={`w-4 h-4 ${loading && actionType === 'recreate' ? 'animate-spin' : ''}`} />
          {loading && actionType === 'recreate' ? 'Recreating...' : 'Delete & Recreate All'}
        </button>

        <a
          href="https://app.gohighlevel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-maxxed-blue"
        >
          Open GHL Dashboard
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Sync Failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {response && (
        <div className="space-y-3">
          {/* Summary */}
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              response.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            {response.success ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-gray-900">{response.message}</p>
              <div className="flex gap-4 mt-2 text-sm">
                {response.summary.created !== undefined && (
                  <span className="text-green-600">
                    {response.summary.created} created
                  </span>
                )}
                {response.summary.updated !== undefined && (
                  <span className="text-green-600">
                    {response.summary.updated} updated
                  </span>
                )}
                {response.summary.recreated !== undefined && (
                  <span className="text-green-600">
                    {response.summary.recreated} recreated
                  </span>
                )}
                {response.summary.skipped !== undefined && response.summary.skipped > 0 && (
                  <span className="text-gray-500">
                    {response.summary.skipped} skipped
                  </span>
                )}
                {response.summary.failed > 0 && (
                  <span className="text-red-600">
                    {response.summary.failed} failed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          {response.results.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b">
                <p className="text-sm font-medium text-gray-700">Sync Details</p>
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {response.results.map((result) => (
                  <div
                    key={result.courseId}
                    className="px-4 py-2 flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-900">{result.courseTitle}</span>
                    <div className="flex items-center gap-2">
                      {result.skipped ? (
                        <span className="text-gray-500">Skipped</span>
                      ) : result.success ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {actionType === 'recreate' ? 'Recreated' : actionType === 'update' ? 'Updated' : 'Created'}
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1" title={result.error}>
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
