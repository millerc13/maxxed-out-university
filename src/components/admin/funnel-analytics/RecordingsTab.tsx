'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Play, Loader2, ChevronUp, Clock, MousePointerClick } from 'lucide-react';

interface Recording {
  id: string;
  distinct_id: string;
  start_time: string;
  recording_duration: number;
  click_count: number;
  keypress_count: number;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

export function RecordingsTab({ funnelId }: { funnelId: string }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/funnels/${funnelId}/analytics/recordings`)
      .then(r => r.json())
      .then(data => setRecordings(data.results ?? []))
      .finally(() => setLoading(false));
  }, [funnelId]);

  async function loadRecording(recordingId: string) {
    if (expandedId === recordingId) {
      setExpandedId(null);
      setEmbedUrl(null);
      return;
    }

    setExpandedId(recordingId);
    setEmbedUrl(null);
    setSharing(true);

    const res = await fetch(`/api/admin/funnels/${funnelId}/analytics/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId }),
    });
    const data = await res.json();
    setEmbedUrl(data.embedUrl ?? null);
    setSharing(false);
  }

  if (loading) {
    return (
      <Card className="border-[#DBEAFE]">
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#DBEAFE]">
      <CardContent className="p-0">
        <div className="px-6 py-4 border-b border-[#DBEAFE]">
          <h2 className="font-bold text-[#1E3A8A] flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-[#1E40AF]" />
            Session Recordings
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last 7 days · {recordings.length} session{recordings.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {recordings.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Video className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No session recordings yet</p>
            <p className="text-gray-400 text-xs mt-1">Recordings will appear once visitors interact with the funnel.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recordings.map(rec => (
              <div key={rec.id}>
                <button
                  onClick={() => loadRecording(rec.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F8FAFC] cursor-pointer transition-colors duration-150 text-left"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    {/* Date */}
                    <div className="text-sm font-medium text-[#1E3A8A] whitespace-nowrap">
                      {new Date(rec.start_time).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                      })}
                      <span className="text-gray-400 ml-1 text-xs">
                        {new Date(rec.start_time).toLocaleTimeString('en-US', {
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Visitor ID */}
                    <span className="text-xs text-gray-400 truncate max-w-[140px] tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {rec.distinct_id.slice(0, 16)}...
                    </span>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    {/* Duration */}
                    <span className="flex items-center gap-1 text-xs text-gray-500 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      <Clock className="w-3 h-3" />
                      {formatDuration(rec.recording_duration)}
                    </span>

                    {/* Clicks */}
                    <span className="flex items-center gap-1 text-xs text-gray-500 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                      <MousePointerClick className="w-3 h-3" />
                      {rec.click_count}
                    </span>

                    {/* Watch button */}
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF] min-w-[70px] justify-end">
                      {expandedId === rec.id ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Watch
                        </>
                      )}
                    </span>
                  </div>
                </button>

                {/* Expanded recording embed */}
                {expandedId === rec.id && (
                  <div className="px-6 pb-6">
                    {sharing ? (
                      <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm bg-[#F8FAFC] rounded-xl border border-[#DBEAFE]">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1E40AF]" />
                        <span>Loading recording...</span>
                      </div>
                    ) : embedUrl ? (
                      <div className="rounded-xl overflow-hidden border border-[#DBEAFE] shadow-sm">
                        <iframe
                          src={embedUrl}
                          width="100%"
                          height="500"
                          frameBorder="0"
                          allowFullScreen
                          title={`Session recording from ${new Date(rec.start_time).toLocaleDateString()}`}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400 text-sm bg-[#F8FAFC] rounded-xl border border-red-200">
                        Failed to load recording. The session may no longer be available.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
