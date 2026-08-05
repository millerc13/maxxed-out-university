/**
 * Chart + status colors for embed widgets.
 *
 * The categorical palette is validated (dataviz six-checks: lightness
 * band, chroma floor, CVD separation, normal-vision floor, contrast on
 * white) — assign hues in this fixed order, never cycled. More than 5
 * series folds into "Other".
 */
export const CHART_COLORS = ['#3B5BDB', '#B08C1E', '#0CA678', '#E03131', '#9C36B5'] as const;

export const STATUS = {
  good: '#15803D',
  warning: '#B45309',
  serious: '#DC2626',
  neutral: '#64748B',
} as const;

export const INK = {
  primary: '#1F2937',
  secondary: '#4B5563',
  muted: '#9CA3AF',
} as const;

export function chartColor(index: number): string {
  return CHART_COLORS[Math.min(index, CHART_COLORS.length - 1)];
}
