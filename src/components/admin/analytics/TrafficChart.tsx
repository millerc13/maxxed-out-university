'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface TrafficPoint {
  day: string;
  views: number;
  visitors: number;
}

function formatDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Daily traffic trend — pageviews + unique visitors over the window.
 * Server component passes the already-aggregated PostHog series in.
 */
export function TrafficChart({ data }: { data: TrafficPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No traffic data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={formatDay}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          width={38}
          allowDecimals={false}
        />
        <Tooltip
          itemStyle={{ color: '#fff' }}
          contentStyle={{ background: '#1E3A8A', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
          labelFormatter={(v) => formatDay(String(v))}
          labelStyle={{ color: '#BFDBFE', marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="views" name="Pageviews" stroke="#1E40AF" strokeWidth={2} fill="url(#gViews)" />
        <Area type="monotone" dataKey="visitors" name="Unique visitors" stroke="#059669" strokeWidth={2} fill="url(#gVisitors)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
