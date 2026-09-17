/**
 * Round-robin assignment of GHL contacts to closers based on funnel
 * source. Single source of truth: env-var IDs + a per-scope counter
 * row in `AssignmentCounter`.
 *
 * Default behavior — every funnel goes to Jackie, who took over the
 * closer seat on 2026-09-17 when Rebecca and Rafael were removed from
 * the GHL sub-account. Exceptions are declared in `RULES` and use the
 * counter to round-robin.
 *
 * Env vars (all optional — unset falls back to the hardcoded ID so a
 * missing Vercel var can't silently leave leads unassigned):
 *   GHL_USER_JACKIE_ID
 */

import { prisma } from './prisma';

type AssignmentRule = {
  /**
   * Sources this rule applies to. Match priority is the first rule
   * whose `sources` includes the input.
   */
  sources: string[];
  /**
   * Pool of GHL user IDs to round-robin between. Single-element pool =
   * always-assign-to-this-person. Two-element = 50/50 split. Etc.
   * Falsy entries (env-var unset) are filtered out before picking.
   */
  candidates: (string | undefined)[];
  /**
   * Counter scope key — separate row in AssignmentCounter so every
   * round-robin pool tracks its own next-up index.
   */
  scope: string;
};

/**
 * Jackie Powers — the closer as of 2026-09-17. Hardcoded fallback so the
 * routing survives a missing env var; override with GHL_USER_JACKIE_ID.
 */
const JACKIE_ID = process.env.GHL_USER_JACKIE_ID || 'IhMt70Bb1ofSoWRfVj3A';

/**
 * No source-specific rules right now. DD healthcare used to round-robin
 * between two closers; with a single closer it falls through to the
 * default. Add a rule here the moment a second closer exists.
 */
const RULES: AssignmentRule[] = [];

/**
 * Default fallback — used for every funnel that doesn't match a
 * specific rule (mentorship / business-mentorship / blueprint /
 * accelerator / university / dd-healthcare / etc).
 */
const DEFAULT_CANDIDATES: (string | undefined)[] = [JACKIE_ID];
const DEFAULT_SCOPE = 'default-closer';

/**
 * Pick the next assignee for a given source. Returns null when no
 * GHL user IDs are configured (env vars unset) so callers know to
 * skip the assignedTo field entirely. Increments the counter
 * transactionally to avoid two concurrent applies stomping each
 * other and both being assigned the same person.
 */
export async function pickAssignee(source: string | null | undefined): Promise<string | null> {
  const matching = RULES.find((r) => source && r.sources.includes(source));
  const rule = matching ?? { candidates: DEFAULT_CANDIDATES, scope: DEFAULT_SCOPE, sources: [] };

  const candidates = rule.candidates.filter((c): c is string => !!c);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // ≥2 candidates: increment the counter row + pick by mod. The
  // upsert-then-update dance guarantees the counter row exists.
  // Postgres' atomic update + return guarantees no two concurrent
  // requests get the same index.
  const updated = await prisma.assignmentCounter.upsert({
    where: { scope: rule.scope },
    create: { scope: rule.scope, counter: 1 },
    update: { counter: { increment: 1 } },
  });

  return candidates[(updated.counter - 1) % candidates.length];
}

/**
 * ID → display name for Slack/SMS alerts. GHL exposes no users endpoint,
 * so this is a hand-maintained map; unknown IDs return undefined rather
 * than a wrong name. Add a row whenever a new closer gets a seat.
 */
const ASSIGNEE_NAMES: Record<string, string> = {
  [JACKIE_ID]: 'Jackie',
  mD6KeuKWijah2nMb5mlv: 'Mike',
};

export function assigneeDisplayName(userId: string): string | undefined {
  return ASSIGNEE_NAMES[userId];
}
