/** KPI stat tile. `tone` colors the value (status colors only for real states). */
export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'warning' | 'serious' | 'brand';
}) {
  const valueColor = {
    default: 'text-[#1F2937]',
    good: 'text-[#15803D]',
    warning: 'text-[#B45309]',
    serious: 'text-[#DC2626]',
    brand: 'text-[#3B5BDB]',
  }[tone];

  return (
    <div className="rounded-xl bg-white p-3 shadow-sm sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{sub}</p> : null}
    </div>
  );
}

export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' }[cols];
  return <div className={`grid gap-2 sm:gap-3 ${grid}`}>{children}</div>;
}
