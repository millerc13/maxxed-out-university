/**
 * Module-level gating rules for bundle courses.
 *
 * For bundle courses (isBundle=true) — specifically the Real Estate Empire
 * Blueprint — a student must pass the quiz at the end of module N before
 * they can access any lessons in module N+1.
 *
 * Non-bundle courses (standalone or bundle *children*) have no gating —
 * users who purchase individual courses should be unaffected.
 */

interface MinimalCourse {
  isBundle: boolean;
  quizzes: Array<{ id: string; order: number }>;
}

interface MinimalAttempt {
  quizId: string;
  passed: boolean;
}

/**
 * Returns a function that tells whether a given module index is unlocked
 * for this user based on their quiz attempts.
 *
 * Rules:
 * - If course.isBundle is false → always unlocked (no gating for individual courses)
 * - If isAdmin → always unlocked
 * - Module 0 → always unlocked
 * - Module N (N >= 1) → unlocked iff the quiz with order === N-1 has a passed attempt,
 *                       OR no such quiz exists (defensive: don't block on missing quizzes)
 */
export function getModuleAccess(
  course: MinimalCourse,
  attempts: MinimalAttempt[],
  isAdmin: boolean
): (moduleIndex: number) => boolean {
  if (!course.isBundle || isAdmin) {
    return () => true;
  }

  const passedQuizIds = new Set(attempts.filter((a) => a.passed).map((a) => a.quizId));

  return (moduleIndex: number) => {
    if (moduleIndex <= 0) return true;
    const priorQuiz = course.quizzes.find((q) => q.order === moduleIndex - 1);
    if (!priorQuiz) return true; // no quiz to gate on
    return passedQuizIds.has(priorQuiz.id);
  };
}

/**
 * For a locked module, find the ID of the quiz the user must pass to unlock it.
 * Returns null if no such quiz exists (so the module would be auto-unlocked).
 */
export function getRequiredQuizForModule(
  course: MinimalCourse,
  moduleIndex: number
): string | null {
  if (moduleIndex <= 0) return null;
  const priorQuiz = course.quizzes.find((q) => q.order === moduleIndex - 1);
  return priorQuiz?.id ?? null;
}
