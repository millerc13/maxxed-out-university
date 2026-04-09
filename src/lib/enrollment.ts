import { prisma } from '@/lib/prisma';

/**
 * Check if a user is effectively enrolled in a course.
 * A user is "effectively enrolled" if they have a direct enrollment
 * OR if they are enrolled in a bundle that includes this course.
 */
export async function isEffectivelyEnrolled(userId: string, courseId: string): Promise<boolean> {
  // Check direct enrollment
  const direct = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (direct) return true;

  // Check if this course belongs to a bundle the user is enrolled in
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { bundleId: true },
  });

  if (course?.bundleId) {
    const bundleEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.bundleId } },
    });
    if (bundleEnrollment) return true;
  }

  return false;
}

/**
 * Check if a user has an active bundle enrollment.
 */
export async function hasActiveBundleEnrollment(userId: string): Promise<boolean> {
  const bundleCourses = await prisma.course.findMany({
    where: { isBundle: true, published: true },
    select: { id: true },
  });

  if (bundleCourses.length === 0) return false;

  const bundleEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: { in: bundleCourses.map((c) => c.id) },
    },
  });

  return !!bundleEnrollment;
}

/**
 * Get the IDs of bundle courses the user is enrolled in.
 */
export async function getEnrolledBundleIds(userId: string): Promise<Set<string>> {
  const bundleCourses = await prisma.course.findMany({
    where: { isBundle: true, published: true },
    select: { id: true },
  });

  if (bundleCourses.length === 0) return new Set();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      courseId: { in: bundleCourses.map((c) => c.id) },
    },
    select: { courseId: true },
  });

  return new Set(enrollments.map((e) => e.courseId));
}

/**
 * Get the set of course IDs a user is effectively enrolled in.
 * Includes direct enrollments + bundle child courses for any enrolled bundles.
 */
export async function getEffectiveEnrollments(userId: string): Promise<Set<string>> {
  const directEnrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { courseId: true },
  });

  const enrolledIds = new Set(directEnrollments.map((e) => e.courseId));

  // Check if any of their enrollments is a bundle course
  const bundleCourses = await prisma.course.findMany({
    where: { isBundle: true, published: true },
    select: { id: true },
  });

  const hasBundleEnrollment = bundleCourses.some((bc) => enrolledIds.has(bc.id));

  if (hasBundleEnrollment) {
    // Add only the bundle's child courses
    const childCourses = await prisma.course.findMany({
      where: {
        published: true,
        bundleId: { in: bundleCourses.filter((bc) => enrolledIds.has(bc.id)).map((bc) => bc.id) },
      },
      select: { id: true },
    });
    for (const c of childCourses) {
      enrolledIds.add(c.id);
    }
  }

  return enrolledIds;
}

/**
 * When enrolling in a bundle course, also enroll in its child courses.
 */
export async function enrollInBundle(userId: string, bundleCourseId: string, source: string, transactionId?: string) {
  const childCourses = await prisma.course.findMany({
    where: { bundleId: bundleCourseId, published: true },
    select: { id: true },
  });

  const courseIds = [bundleCourseId, ...childCourses.map((c) => c.id)];

  for (const courseId of courseIds) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        source,
        transactionId: transactionId || null,
      },
      update: {},
    });
  }
}
