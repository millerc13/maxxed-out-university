'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface CalendlyLog {
  id: string;
  event: string;
  status: string;
  errorMessage: string | null;
  processedAt: string;
  payload: {
    email?: string | null;
    name?: string | null;
    scheduledStart?: string | null;
    eventUri?: string | null;
  } | null;
}

const EVENT_LABEL: Record<string, string> = {
  'invitee.created': 'Call booked',
  'invitee.canceled': 'Call canceled',
  'invitee_no_show.created': 'No-show',
};

export function CalendlySection() {
  const [logs, setLogs] = useState<CalendlyLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notifications/calendly-logs', {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setLogs(json.logs ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-maxxed-blue" />
            Calendly Webhook Activity
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
            Mirrored from the funnel&apos;s Calendly webhook (booked / canceled /
            no-show). Read-only history — the funnel still owns the real
            handler that updates GHL.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {error ? (
          <p className="px-4 py-6 text-[13px] text-red-600">{error}</p>
        ) : loading && logs === null ? (
          <p className="px-4 py-6 text-[13px] text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : logs && logs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <CalendarClock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">
              No Calendly events yet
            </p>
            <p className="text-[12px] text-gray-500 mt-1">
              Events appear here once someone books, cancels, or no-shows a
              call on any funnel.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
            {logs?.map((log) => {
              const label = EVENT_LABEL[log.event] ?? log.event;
              const booked = log.event === 'invitee.created';
              return (
                <div
                  key={log.id}
                  className="px-4 py-3 flex items-start gap-3 text-[13px]"
                >
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      booked
                        ? 'bg-emerald-100 text-emerald-700'
                        : log.event === 'invitee.canceled'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {booked ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : log.event === 'invitee.canceled' ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {log.payload?.name || log.payload?.email || 'Unknown invitee'}
                    </p>
                    {log.payload?.email && log.payload?.name && (
                      <p className="text-[11px] text-gray-500 truncate">
                        {log.payload.email}
                      </p>
                    )}
                    {log.payload?.scheduledStart && (
                      <p className="text-[11px] text-gray-500">
                        Scheduled:{' '}
                        {new Date(log.payload.scheduledStart).toLocaleString()}
                      </p>
                    )}
                    {log.errorMessage && (
                      <p className="text-[11px] text-red-600 font-mono break-all mt-0.5">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                    {new Date(log.processedAt).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
