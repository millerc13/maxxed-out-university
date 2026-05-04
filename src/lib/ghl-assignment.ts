/**
 * Round-robin assignment of GHL contacts to closers based on funnel
 * source. Single source of truth: env-var IDs + a per-scope counter
 * row in `AssignmentCounter`.
 *
 * Default behavior — every funnel goes to Rebecca. Exceptions are
 * declared in `ASSIGNMENT_RULES` and use the counter to pick next.
 *
 * Env vars (all optional — unset = no assignment, contact stays
 * unassigned in GHL like the old Netlify functions did):
 *   GHL_USER_REBECCA_ID
 *   GHL_USER_RAFAEL_ID
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

const RULES: AssignmentRule[] = [
  // DD healthcare — alternates Rebecca / Rafael per submission.
  {
    sources: ['dd-healthcare', 'dd_application', 'healthcare', 'dd'],
    candidates: [
      process.env.GHL_USER_REBECCA_ID,
      process.env.GHL_USER_RAFAEL_ID,
    ],
    scope: 'dd-healthcare',
  },
];

/**
 * Default fallback — used for every funnel that doesn't match a
 * specific rule (mentorship / business-mentorship / blueprint /
 * accelerator / university / etc).
 */
const DEFAULT_CANDIDATES: (string | undefined)[] = [process.env.GHL_USER_REBECCA_ID];
const DEFAULT_SCOPE = 'default-rebecca';

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
