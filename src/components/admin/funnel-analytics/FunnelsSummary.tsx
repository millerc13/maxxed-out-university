'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ShoppingCart, GraduationCap, TrendingUp, MousePointerClick, BarChart2, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface SummaryData {
  totals: {
    views: number;
    checkouts: number;
    enrollments: number;
    ctaClicks: number;
    conversionRate: number;
  };
  programs: {
    program: string;
    views: number;
    checkouts: number;
    enrollments: number;
    conversionRate: number;
  }[];
  sparklines: Record<string, number[]>;
  dailyChart: Record<string, unknown>[];
}

const PROGRAM_COLORS: Record<string, string> = {
  'Real Estate Blueprint': '#1E40AF',
  'Done With You': '#D97706',
  'Mentorship': '#059669',
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E9EEF6] rounded ${className}`} />;
}

function formatDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FunnelsSummary() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/funnels/analytics')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4" style={{ fontFamily: "'Fira Sans', system-ui, sans-serif" }}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-[#DBEAFE]"><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-[#DBEAFE]"><CardContent className="p-6"><Skeleton className="h-56 w-full" /></CardContent></Card>
          <Card className="border-[#DBEAFE]"><CardContent className="p-6"><Skeleton className="h-56 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { totals, programs, dailyChart } = data;

  const kpis = [
    { label: 'Total Views', value: totals.views.toLocaleString(), icon: Eye, bg: 'bg-[#1E40AF]' },
    { label: 'CTA Clicks', value: totals.ctaClicks.toLocaleString(), icon: MousePointerClick, bg: 'bg-[#3B82F6]' },
    { label: 'Checkouts', value: totals.checkouts.toLocaleString(), icon: ShoppingCart, bg: 'bg-[#6366F1]' },
    { label: 'Enrollments', value: totals.enrollments.toLocaleString(), icon: GraduationCap, bg: 'bg-emerald-600' },
    { label: 'Conversion', value: `${(totals.conversionRate * 100).toFixed(2)}%`, icon: TrendingUp, bg: 'bg-[#D97706]' },
  ];

  const programNames = programs.map(p => p.program);

  return (
    <div className="space-y-4" style={{ fontFamily: "'Fira Sans', system-ui, sans-serif" }}>
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map(stat => (
          <Card key={stat.label} className="border-[#DBEAFE] hover:shadow-md transition-shadow duration-200">
            <CardContent className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg} shrink-0`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{stat.label}</p>
                  <p className="text-lg font-extrabold text-[#1E3A8A] tabular-nums leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Line Chart: Daily views by program */}
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-5">
            <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-[#1E40AF]" />
              Daily Views by Program
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">Last 14 days</p>

            {dailyChart.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EEF6" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDay}
                    tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'Fira Code', monospace" }}
                    axisLine={{ stroke: '#DBEAFE' }}
                    tickLine={false}
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
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: "'Fira Sans', system-ui" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {programNames.map(name => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={PROGRAM_COLORS[name] ?? '#1E40AF'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart: Per-program funnel comparison */}
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-5">
            <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-[#1E40AF]" />
              Funnel Comparison by Program
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">Views → Checkouts → Enrollments (30 days)</p>

            {programs.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={programs} barGap={4} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EEF6" vertical={false} />
                  <XAxis
                    dataKey="program"
                    tick={{ fontSize: 10, fill: '#64748B', fontFamily: "'Fira Sans', system-ui" }}
                    axisLine={{ stroke: '#DBEAFE' }}
                    tickLine={false}
                    tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + '...' : v}
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
                    labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                    cursor={{ fill: '#E9EEF6' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: "'Fira Sans', system-ui" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="views" name="Views" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkouts" name="Checkouts" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enrollments" name="Enrollments" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
