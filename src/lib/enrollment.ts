import { prisma } from '@/lib/prisma';

/**
 * Check if a user is effectively enrolled in a course.
 * A user is "effectively enrolled" if they have a direct enrollment
 * OR if they are enrolled in any bundle course (isBundle=true).
 */
export async function isEffectivelyEnrolled(userId: string, courseId: string): Promise<boolean> {
  // Check direct enrollment
  const direct = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (direct) return true;

  // Check if enrolled in any bundle course
  return hasActiveBundleEnrollment(userId);
}

/**
 * Check if a user has an active bundle enrollment.
 * Cached per-request via the function — call freely.
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
 * Get the set of course IDs a user is effectively enrolled in.
 * Includes direct enrollments + all published courses if user has a bundle.
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
    // Add ALL published courses
    const allCourses = await prisma.course.findMany({
      where: { published: true },
      select: { id: true },
    });
    for (const c of allCourses) {
      enrolledIds.add(c.id);
    }
  }

  return enrolledIds;
}

/**
 * When enrolling in a bundle course, also enroll in all published courses.
 */
export async function enrollInBundle(userId: string, bundleCourseId: string, source: string, transactionId?: string) {
  const allCourses = await prisma.course.findMany({
    where: { published: true },
    select: { id: true },
  });

  for (const course of allCourses) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      create: {
        userId,
        courseId: course.id,
        source,
        transactionId: transactionId || null,
      },
      update: {},
    });
  }
}
