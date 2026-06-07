'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ShoppingCart, GraduationCap, TrendingUp, MousePointerClick, BarChart2, Activity, Globe, Smartphone, Megaphone } from 'lucide-react';
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
    ctaClicks: number;
    checkouts: number;
    enrollments: number;
    conversionRate: number;
  }[];
  sparklines: Record<string, number[]>;
  dailyChart: Record<string, unknown>[];
  sources?: { label: string; views: number }[];
  devices?: { label: string; views: number }[];
  campaigns?: { campaign: string; source: string; views: number; visitors: number }[];
}

// Colors are assigned per-funnel by index (funnel names are dynamic, so a
// fixed name→color map no longer fits).
const PALETTE = ['#1E40AF', '#D97706', '#059669', '#7C3AED', '#DC2626', '#0891B2', '#DB2777'];
const colorFor = (i: number) => PALETTE[i % PALETTE.length];

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

  const { totals, programs, dailyChart, sources = [], devices = [], campaigns = [] } = data;
  const sourcesTotal = sources.reduce((s, r) => s + r.views, 0) || 1;
  const devicesTotal = devices.reduce((s, r) => s + r.views, 0) || 1;

  const kpis = [
    { label: 'Total Views', value: totals.views.toLocaleString(), icon: Eye, bg: 'bg-[#1E40AF]' },
    { label: 'CTA Clicks', value: totals.ctaClicks.toLocaleString(), icon: MousePointerClick, bg: 'bg-[#3B82F6]' },
    { label: 'Checkouts', value: totals.checkouts.toLocaleString(), icon: ShoppingCart, bg: 'bg-[#6366F1]' },
    { label: 'Enrollments', value: totals.enrollments.toLocaleString(), icon: GraduationCap, bg: 'bg-emerald-600' },
    { label: 'CTA Rate', value: `${(totals.conversionRate * 100).toFixed(1)}%`, icon: TrendingUp, bg: 'bg-[#D97706]' },
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
              Daily Views by Funnel
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
                    itemStyle={{ color: '#fff' }}
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
                  {programNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={colorFor(i)}
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
              Funnel Comparison
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">Views → CTA clicks → Checkouts (30 days)</p>

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
                    itemStyle={{ color: '#fff' }}
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
                  <Bar dataKey="ctaClicks" name="CTA Clicks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkouts" name="Checkouts" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sources + Devices (funnel traffic only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-5">
            <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[#1E40AF]" /> Traffic Sources
            </h3>
            <BarList rows={sources} total={sourcesTotal} color="#1E40AF" />
          </CardContent>
        </Card>
        <Card className="border-[#DBEAFE]">
          <CardContent className="p-5">
            <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4 text-[#1E40AF]" /> Devices
            </h3>
            <BarList rows={devices} total={devicesTotal} color="#059669" />
          </CardContent>
        </Card>
      </div>

      {/* Ad campaigns driving funnel traffic */}
      <Card className="border-[#DBEAFE]">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-[#DBEAFE]">
            <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#1E40AF]" /> Ad Campaigns Driving Funnel Traffic
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">UTM-tagged · last 30 days</p>
          </div>
          {campaigns.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No UTM-tagged funnel traffic yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <th className="px-5 py-2.5">Campaign</th>
                    <th className="px-4 py-2.5">Source</th>
                    <th className="px-4 py-2.5 text-right">Visitors</th>
                    <th className="px-4 py-2.5 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{c.campaign}</td>
                      <td className="px-4 py-2.5"><span className="inline-block px-2 py-0.5 text-[11px] rounded bg-blue-50 text-blue-700 font-medium">{c.source}</span></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.visitors.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{c.views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BarList({ rows, total, color }: { rows: { label: string; views: number }[]; total: number; color: string }) {
  if (!rows.length) return <div className="text-sm text-gray-400 py-6 text-center">No data yet</div>;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const pct = Math.round((r.views / total) * 100);
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span className="text-gray-700 truncate pr-2">{r.label}</span>
              <span className="text-gray-500 tabular-nums shrink-0">{r.views.toLocaleString()} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
