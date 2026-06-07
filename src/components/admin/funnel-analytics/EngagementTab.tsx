'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MousePointerClick, ArrowDown, PlayCircle, Undo2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

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
  instructor: 'Meet Todd',
  final: 'Final CTA',
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
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-56 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-gray-400 text-sm py-12 text-center">Failed to load data</div>;

  const ctaChartData = data.ctaClicks.map(cta => ({
    location: LOCATION_LABELS[cta.location] ?? cta.location,
    clicks: cta.clicks,
    text: cta.text,
  }));

  const scrollChartData = data.scrollDepth.map(({ depth, users }) => ({
    depth: `${depth}%`,
    users,
  }));

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
        {/* CTA Clicks Bar Chart */}
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-5">
            <h2 className="font-bold text-[#1E3A8A] flex items-center gap-2 text-sm mb-1">
              <MousePointerClick className="w-4 h-4 text-[#1E40AF]" />
              CTA Clicks by Location
            </h2>
            <p className="text-[10px] text-gray-400 mb-4">Which buttons drive the most traffic to checkout</p>

            {ctaChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No CTA clicks yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(ctaChartData.length * 44, 180)}>
                <BarChart data={ctaChartData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EEF6" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'Fira Code', monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="location"
                    type="category"
                    tick={{ fontSize: 11, fill: '#1E3A8A', fontFamily: "'Fira Sans', system-ui" }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    itemStyle={{ color: '#fff' }}
                    contentStyle={{
                      background: '#1E3A8A',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: "'Fira Code', monospace",
                      color: '#fff',
                    }}
                    cursor={{ fill: '#E9EEF6' }}
                  />
                  <Bar dataKey="clicks" fill="#1E40AF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Scroll Depth Bar Chart */}
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-5">
            <h2 className="font-bold text-[#1E3A8A] flex items-center gap-2 text-sm mb-1">
              <ArrowDown className="w-4 h-4 text-[#1E40AF]" />
              Scroll Depth
            </h2>
            <p className="text-[10px] text-gray-400 mb-4">How far visitors scroll on the landing page</p>

            {scrollChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No scroll data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(scrollChartData.length * 50, 180)}>
                <BarChart data={scrollChartData} layout="vertical" barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EEF6" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'Fira Code', monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="depth"
                    type="category"
                    tick={{ fontSize: 12, fill: '#1E3A8A', fontWeight: 600, fontFamily: "'Fira Code', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    itemStyle={{ color: '#fff' }}
                    contentStyle={{
                      background: '#1E3A8A',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: "'Fira Code', monospace",
                      color: '#fff',
                    }}
                    formatter={(value) => [`${value} visitors`, 'Reached']}
                    cursor={{ fill: '#E9EEF6' }}
                  />
                  <Bar
                    dataKey="users"
                    radius={[0, 6, 6, 0]}
                    fill="#3B82F6"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
