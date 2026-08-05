/**
 * Horizontal labeled bar list — magnitude comparison across a handful of
 * named items. Server-renderable (pure CSS widths). Values are printed
 * as text so identity/quantity never rides on color alone.
 */
export function BarList({
  items,
  color = '#3B5BDB',
}: {
  items: Array<{ label: string; value: number; display: string; color?: string }>;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} title={`${item.label}: ${item.display}`}>
          <div className="mb-0.5 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs text-[#4B5563]">{item.label}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-[#1F2937]">{item.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-[#EEF0F3]">
            <div
              className="h-full rounded-sm"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, backgroundColor: item.color ?? color }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-[#9CA3AF]">No data yet</p> : null}
    </div>
  );
}
