'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ShoppingCart, GraduationCap, TrendingUp, BarChart2 } from 'lucide-react';

interface OverviewData {
  kpis: { pageviews: number; checkoutStarts: number; enrollments: number; conversionRate: number };
  daily: { day: string; pageviews: number; checkouts: number; enrollments: number }[];
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

export function OverviewTab({ funnelId }: { funnelId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/funnels/${funnelId}/analytics/overview`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [funnelId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-44 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!data) return <div className="text-gray-400 text-sm py-12 text-center">Failed to load data</div>;

  const { kpis, daily } = data;
  const maxPV = Math.max(...daily.map(d => d.pageviews), 1);

  const stats = [
    { label: 'Page Views', value: kpis.pageviews.toLocaleString(), icon: Eye, bg: 'bg-[#1E40AF]', sub: 'last 30 days' },
    { label: 'Checkout Starts', value: kpis.checkoutStarts.toLocaleString(), icon: ShoppingCart, bg: 'bg-[#3B82F6]', sub: 'last 30 days' },
    { label: 'Enrollments', value: kpis.enrollments.toLocaleString(), icon: GraduationCap, bg: 'bg-emerald-600', sub: 'last 30 days' },
    { label: 'Conversion Rate', value: `${(kpis.conversionRate * 100).toFixed(2)}%`, icon: TrendingUp, bg: 'bg-[#D97706]', sub: 'views \u2192 enrolled' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="border-[#DBEAFE] hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-[#1E3A8A] mt-1.5 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Trend Chart */}
      <Card className="border-[#DBEAFE]">
        <CardContent className="p-6">
          <h2 className="font-bold text-[#1E3A8A] mb-1 flex items-center gap-2 text-sm">
            <BarChart2 className="w-4 h-4 text-[#1E40AF]" />
            Daily Page Views
          </h2>
          <p className="text-xs text-gray-400 mb-6">Last 30 days</p>

          {daily.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-400 text-sm">
              No data yet — events will appear once visitors interact with the funnel.
            </div>
          ) : (
            <>
              <div className="flex items-end gap-[3px] h-40" role="img" aria-label="Daily page views bar chart">
                {daily.map((day, i) => {
                  const pct = (day.pageviews / maxPV) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                      <div
                        className="w-full rounded-t transition-colors duration-150 group-hover:bg-[#D97706]"
                        style={{
                          height: `${pct}%`,
                          minHeight: day.pageviews > 0 ? '3px' : '0',
                          background: '#1E40AF',
                        }}
                      />
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1E3A8A] text-white text-[11px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10 transition-opacity duration-150 shadow-lg" style={{ fontFamily: "'Fira Code', monospace" }}>
                        <span className="font-bold">{day.pageviews}</span>
                        <span className="text-white/60 ml-1">{new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-medium text-gray-400 tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                <span>{new Date(daily[0].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                {daily.length > 15 && (
                  <span>{new Date(daily[Math.floor(daily.length / 2)].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
                <span>{new Date(daily[daily.length - 1].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              {/* Gridlines */}
              <p className="text-[10px] text-gray-300 mt-2 text-right tabular-nums" style={{ fontFamily: "'Fira Code', monospace" }}>
                max: {maxPV}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
