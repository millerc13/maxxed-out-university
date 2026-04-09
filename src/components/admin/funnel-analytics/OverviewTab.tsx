'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ShoppingCart, GraduationCap, TrendingUp, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface OverviewData {
  kpis: { pageviews: number; checkoutStarts: number; enrollments: number; conversionRate: number };
  daily: { day: string; pageviews: number; checkouts: number; enrollments: number }[];
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

function formatDay(day: string) {
  return new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        <Card><CardContent className="p-6"><Skeleton className="h-56 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!data) return <div className="text-gray-400 text-sm py-12 text-center">Failed to load data</div>;

  const { kpis, daily } = data;

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
            Daily Activity
          </h2>
          <p className="text-xs text-gray-400 mb-4">Last 30 days · Page views, checkouts, and enrollments</p>

          {daily.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
              No data yet — events will appear once visitors interact with the funnel.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={daily} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EEF6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'Fira Code', monospace" }}
                  axisLine={{ stroke: '#DBEAFE' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'Fira Code', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E3A8A',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: "'Fira Code', monospace",
                    color: '#fff',
                  }}
                  labelFormatter={(v) => formatDay(String(v))}
                  labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                  cursor={{ fill: '#E9EEF6' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontFamily: "'Fira Sans', system-ui" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="pageviews" name="Page Views" fill="#1E40AF" radius={[3, 3, 0, 0]} />
                <Bar dataKey="checkouts" name="Checkouts" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="enrollments" name="Enrollments" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
