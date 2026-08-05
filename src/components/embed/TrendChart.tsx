'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export type TrendSeries = { key: string; label: string; color: string };

/**
 * Time-series chart (line or stacked bar) with crosshair tooltip.
 * One y-axis, recessive grid, legend only when there are >= 2 series.
 */
export function TrendChart({
  data,
  series,
  kind = 'line',
  height = 180,
  valueFormatter,
}: {
  data: Array<Record<string, string | number>>;
  series: TrendSeries[];
  kind?: 'line' | 'bar';
  height?: number;
  /** e.g. cents -> "$1.2k" for tooltips + axis. */
  valueFormatter?: 'usd-cents' | 'count';
}) {
  const fmt = (v: number) =>
    valueFormatter === 'usd-cents'
      ? v >= 100_000
        ? `$${Math.round(v / 10_000) / 10}k`
        : `$${Math.round(v / 100).toLocaleString()}`
      : v.toLocaleString();

  const tooltipFmt = (v: unknown) => fmt(Number(v ?? 0));

  const common = {
    data,
    margin: { top: 4, right: 4, bottom: 0, left: -14 },
  };
  const axes = (
    <>
      <CartesianGrid stroke="#EEF0F3" vertical={false} />
      <XAxis
        dataKey="day"
        tick={{ fontSize: 10, fill: '#9CA3AF' }}
        tickLine={false}
        axisLine={{ stroke: '#E5E7EB' }}
        tickFormatter={(d: string) => d.slice(5)}
        minTickGap={24}
      />
      <YAxis
        tick={{ fontSize: 10, fill: '#9CA3AF' }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v: number) => fmt(v)}
        width={54}
      />
      <Tooltip
        formatter={tooltipFmt}
        labelStyle={{ fontSize: 11, color: '#4B5563' }}
        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
      />
      {series.length >= 2 ? <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} /> : null}
    </>
  );

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        {kind === 'bar' ? (
          <BarChart {...common}>
            {axes}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} maxBarSize={22} />
            ))}
          </BarChart>
        ) : (
          <LineChart {...common}>
            {axes}
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
