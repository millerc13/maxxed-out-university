'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MousePointerClick, ArrowDown, PlayCircle, Undo2 } from 'lucide-react';

interface EngagementData {
  ctaClicks: { location: string; text: string; clicks: number }[];
  scrollDepth: { depth: number; users: number }[];
  videoPlays: number;
  videoViews: number;
  videoPlayRate: number;
  stepBacks: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

const LOCATION_LABELS: Record<string, string> = {
  hero: 'Hero Section',
  nav: 'Navigation Bar',
  sidebar: 'Sidebar Card',
  features: 'Features Section',
  instructor: 'Meet Todd Section',
  final: 'Final CTA Section',
  for_you: 'For You Section',
};

export function EngagementTab({ funnelId }: { funnelId: string }) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/funnels/${funnelId}/analytics/engagement`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [funnelId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-gray-400 text-sm py-12 text-center">Failed to load data</div>;

  const maxClicks = data.ctaClicks[0]?.clicks || 1;
  const maxScroll = Math.max(...data.scrollDepth.map(s => s.users), 1);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-[#DBEAFE] hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Video Play Rate</p>
                <p className="text-2xl font-extrabold text-[#1E3A8A] mt-1.5 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {(data.videoPlayRate * 100).toFixed(1)}%
                </p>
                <p className="text-[11px] text-gray-400 mt-1 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {data.videoPlays} plays / {data.videoViews} views
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#6366F1] shrink-0">
                <PlayCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#DBEAFE] hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Checkout Step-Backs</p>
                <p className="text-2xl font-extrabold text-[#1E3A8A] mt-1.5 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {data.stepBacks}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">returned to contact info</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#D97706] shrink-0">
                <Undo2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CTA Clicks */}
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-[#DBEAFE]">
              <h2 className="font-bold text-[#1E3A8A] flex items-center gap-2 text-sm">
                <MousePointerClick className="w-4 h-4 text-[#1E40AF]" />
                CTA Clicks by Location
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Which buttons drive the most traffic to checkout</p>
            </div>
            {data.ctaClicks.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">No CTA clicks yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.ctaClicks.map((cta, i) => (
                  <div key={i} className="px-6 py-3.5 hover:bg-[#F8FAFC] transition-colors duration-150">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-[#1E3A8A]">
                        {LOCATION_LABELS[cta.location] ?? cta.location}
                      </span>
                      <span className="text-sm font-bold text-[#1E40AF] tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                        {cta.clicks}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#E9EEF6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1E40AF] rounded-full transition-all duration-300"
                        style={{ width: `${(cta.clicks / maxClicks) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 truncate">&ldquo;{cta.text}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scroll Depth */}
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-[#DBEAFE]">
              <h2 className="font-bold text-[#1E3A8A] flex items-center gap-2 text-sm">
                <ArrowDown className="w-4 h-4 text-[#1E40AF]" />
                Scroll Depth
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">How far visitors scroll on the landing page</p>
            </div>
            {data.scrollDepth.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">No scroll data yet</div>
            ) : (
              <div className="p-6 space-y-5">
                {data.scrollDepth.map(({ depth, users }) => {
                  const color = depth >= 90 ? '#059669' : depth >= 75 ? '#1E40AF' : depth >= 50 ? '#3B82F6' : '#94A3B8';
                  return (
                    <div key={depth}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums" style={{ color, fontFamily: "'Fira Code', monospace" }}>
                            {depth}%
                          </span>
                          <span className="text-xs text-gray-400">depth</span>
                        </div>
                        <span className="text-sm font-bold text-[#1E3A8A] tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {users}
                          <span className="text-gray-400 font-normal ml-1 text-xs">visitors</span>
                        </span>
                      </div>
                      <div className="h-3 bg-[#E9EEF6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(users / maxScroll) * 100}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
