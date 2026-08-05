/**
 * Step funnel: each row shows count, bar scaled to the first step, and
 * conversion from the previous step printed as text.
 */
export function FunnelSteps({
  steps,
  color = '#3B5BDB',
}: {
  steps: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const first = steps[0]?.value ?? 0;
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const prev = i === 0 ? step.value : steps[i - 1].value;
        const rate = i === 0 ? null : prev > 0 ? (step.value / prev) * 100 : 0;
        const width = first > 0 ? Math.max(2, (step.value / first) * 100) : 2;
        return (
          <div key={step.label}>
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-[#4B5563]">{step.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-[#1F2937]">
                <span className="font-semibold">{step.value.toLocaleString()}</span>
                {rate !== null ? (
                  <span className="ml-1.5 text-[#9CA3AF]">{rate.toFixed(rate < 10 ? 1 : 0)}%</span>
                ) : null}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-sm bg-[#EEF0F3]">
              <div className="h-full rounded-sm" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
