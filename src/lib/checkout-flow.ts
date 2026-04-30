// Resolution helpers for the "show checkout after qualifying questions"
// feature. The course is the single source of truth — funnels just
// inherit. The legacy FunnelConfig.checkoutAfterApplyOverride column is
// retained in the schema but no longer consulted.

interface CourseLike {
  checkoutAfterApply?: boolean | null;
}

interface FunnelConfigLike {
  checkoutAfterApplyOverride?: boolean | null;
}

/** Resolve the effective `checkoutAfterApply` for a funnel + course pair.
 *  Always reads from the course; the funnel-level override is ignored.
 */
export function resolveCheckoutAfterApply(
  _funnelConfig: FunnelConfigLike | null | undefined,
  course: CourseLike | null | undefined
): boolean {
  return !!course?.checkoutAfterApply;
}
