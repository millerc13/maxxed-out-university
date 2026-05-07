// Shared types for the sales tracker. Server pages serialize Prisma
// Decimals to numbers before passing to client components — these types
// reflect the post-serialization shape, not the raw Prisma row.

export interface SessionRow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: { entries: number };
  stats?: {
    closedCount: number;
    totalCommissionCents: number;
    paidCents: number;
    unpaidCents: number;
  };
}

export type TriState = 'YES' | 'NO' | 'PENDING';

export interface EntryRow {
  id: string;
  sessionId: string;
  position: number;

  tag: string | null;

  name: string | null;
  email: string | null;
  phone: string | null;

  contactDate: string | null;
  contactTime: string | null;

  didShow: TriState | null;
  didClose: TriState | null;

  dealAmountCents: number | null;
  commissionRate: number | null;
  commissionAmountCents: number | null; // null = use auto-calc; non-null = manual override
  commissionDue: string | null;
  commissionPaid: boolean;

  notes: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * The auto-calculated commission for a row. Returned in cents to match
 * how the value is stored. Returns null when we don't have enough info
 * to calculate.
 */
export function autoCommissionCents(entry: {
  dealAmountCents: number | null;
  commissionRate: number | null;
}): number | null {
  if (entry.dealAmountCents == null || entry.commissionRate == null) return null;
  return Math.round(entry.dealAmountCents * entry.commissionRate);
}

/**
 * The amount to display for commission: the override if set, else the
 * auto-calc. Returns null when neither is available.
 */
export function effectiveCommissionCents(entry: {
  dealAmountCents: number | null;
  commissionRate: number | null;
  commissionAmountCents: number | null;
}): number | null {
  if (entry.commissionAmountCents != null) return entry.commissionAmountCents;
  return autoCommissionCents(entry);
}

export function isOverridden(entry: {
  commissionAmountCents: number | null;
}): boolean {
  return entry.commissionAmountCents != null;
}

export function formatUSD(cents: number | null | undefined): string {
  if (cents == null) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPct(rate: number | null | undefined): string {
  if (rate == null) return '';
  return `${(rate * 100).toFixed(2)}%`;
}

// Curated palette of named color choices. Each entry is a Tailwind
// color family — bar uses -700 (always passes AA contrast against
// white), pill uses -100 (soft pairing for inline usage). The order
// matters: it's also the visual order in the ColorPicker.
export type TagColorName =
  | 'rose'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'pink';

export const TAG_COLOR_NAMES: TagColorName[] = [
  'rose',
  'orange',
  'amber',
  'yellow',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'pink',
];

interface ColorTriple {
  bar: string;
  barText: string;
  pill: string;
  // Plain hex/utility for the swatch in the picker. Not interpolated,
  // just a literal class so Tailwind picks it up at build time.
  swatch: string;
}

// Bar shades chosen for **guaranteed** WCAG AA contrast with white
// text. Yellow and amber jumped to -800 because their -700 shades sit
// in the 4:1 borderline range that some monitors render as
// "white-on-white" — every other hue is solid at -700.
const COLOR_MAP: Record<TagColorName, ColorTriple> = {
  rose:    { bar: 'bg-rose-700',    barText: 'text-white', pill: 'bg-rose-100 text-rose-800 ring-rose-200',          swatch: 'bg-rose-500' },
  orange:  { bar: 'bg-orange-700',  barText: 'text-white', pill: 'bg-orange-100 text-orange-800 ring-orange-200',    swatch: 'bg-orange-500' },
  amber:   { bar: 'bg-amber-800',   barText: 'text-white', pill: 'bg-amber-100 text-amber-800 ring-amber-200',       swatch: 'bg-amber-500' },
  yellow:  { bar: 'bg-yellow-800',  barText: 'text-white', pill: 'bg-yellow-100 text-yellow-800 ring-yellow-200',    swatch: 'bg-yellow-500' },
  lime:    { bar: 'bg-lime-700',    barText: 'text-white', pill: 'bg-lime-100 text-lime-800 ring-lime-200',          swatch: 'bg-lime-500' },
  emerald: { bar: 'bg-emerald-700', barText: 'text-white', pill: 'bg-emerald-100 text-emerald-800 ring-emerald-200', swatch: 'bg-emerald-500' },
  teal:    { bar: 'bg-teal-700',    barText: 'text-white', pill: 'bg-teal-100 text-teal-800 ring-teal-200',          swatch: 'bg-teal-500' },
  cyan:    { bar: 'bg-cyan-700',    barText: 'text-white', pill: 'bg-cyan-100 text-cyan-800 ring-cyan-200',          swatch: 'bg-cyan-500' },
  sky:     { bar: 'bg-sky-700',     barText: 'text-white', pill: 'bg-sky-100 text-sky-800 ring-sky-200',             swatch: 'bg-sky-500' },
  blue:    { bar: 'bg-blue-700',    barText: 'text-white', pill: 'bg-blue-100 text-blue-800 ring-blue-200',          swatch: 'bg-blue-500' },
  indigo:  { bar: 'bg-indigo-700',  barText: 'text-white', pill: 'bg-indigo-100 text-indigo-800 ring-indigo-200',    swatch: 'bg-indigo-500' },
  violet:  { bar: 'bg-violet-700',  barText: 'text-white', pill: 'bg-violet-100 text-violet-800 ring-violet-200',    swatch: 'bg-violet-500' },
  pink:    { bar: 'bg-pink-700',    barText: 'text-white', pill: 'bg-pink-100 text-pink-800 ring-pink-200',          swatch: 'bg-pink-500' },
};

// The default ("Auto") palette — used when no explicit color is set.
// Hashes the tag name to pick a stable color so the same tag always
// renders identically across reloads.
const AUTO_PALETTE: TagColorName[] = [
  'rose', 'orange', 'amber', 'emerald', 'teal',
  'sky', 'blue', 'indigo', 'violet', 'pink',
];

export const UNCATEGORIZED_TAG = '';

export function tagSwatch(name: TagColorName): string {
  return COLOR_MAP[name].swatch;
}

/**
 * Get the tag's display style. If `explicitColor` is provided, use it.
 * Otherwise fall back to the deterministic hash-based palette.
 */
export function tagStyles(
  tag: string | null,
  explicitColor?: TagColorName | null
) {
  if (!tag || tag === UNCATEGORIZED_TAG) {
    return {
      bar: 'bg-gray-200',
      barText: 'text-gray-700',
      pill: 'bg-gray-100 text-gray-600 ring-gray-200',
      swatch: 'bg-gray-300',
    };
  }
  if (explicitColor && COLOR_MAP[explicitColor]) {
    return COLOR_MAP[explicitColor];
  }
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return COLOR_MAP[AUTO_PALETTE[h % AUTO_PALETTE.length]];
}

export type TagColorMap = Partial<Record<string, TagColorName>>;
