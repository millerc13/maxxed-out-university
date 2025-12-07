/**
 * GoHighLevel Integration Utilities
 *
 * Setup Instructions:
 *
 * 1. In GHL, go to Settings → Webhooks
 * 2. Add a new webhook:
 *    - URL: https://university.maxxedout.com/api/webhooks/ghl
 *    - Events: Order/Invoice Created, Payment Success
 *
 * 3. In your database, create ProductMapping records:
 *    - ghlProductId: The product ID from GHL (find in URL when editing product)
 *    - courseId: Your internal course ID from the Course table
 *    - grantAll: Set to true for "all access" bundles
 */

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

interface GHLContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
}

/**
 * Add a tag to a GHL contact (e.g., when they complete a course)
 */
export async function addTagToContact(contactId: string, tag: string): Promise<boolean> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    console.warn('GHL_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tags: [tag],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to add tag to GHL contact:', error);
    return false;
  }
}

/**
 * Get contact details from GHL
 */
export async function getContact(contactId: string): Promise<GHLContact | null> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    console.warn('GHL_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.contact;
  } catch (error) {
    console.error('Failed to get GHL contact:', error);
    return null;
  }
}

/**
 * Common tags to add based on course progress
 */
export const GHL_TAGS = {
  // Enrollment tags
  ENROLLED_PREFIX: 'enrolled-',           // e.g., "enrolled-real-estate-101"

  // Progress tags
  STARTED_PREFIX: 'started-',             // e.g., "started-real-estate-101"
  HALFWAY_PREFIX: 'halfway-',             // e.g., "halfway-real-estate-101"
  COMPLETED_PREFIX: 'completed-',         // e.g., "completed-real-estate-101"

  // Achievement tags
  FIRST_COURSE: 'completed-first-course',
  POWER_LEARNER: 'power-learner',         // Completed 3+ courses
  ALL_COURSES: 'completed-all-courses',

  // Engagement tags
  ACTIVE_STUDENT: 'active-student',       // Logged in within 7 days
  INACTIVE_STUDENT: 'inactive-student',   // No login for 30+ days
};

/**
 * Generate a tag name for a course event
 */
export function getCourseTag(prefix: string, courseSlug: string): string {
  return `${prefix}${courseSlug}`;
}

/**
 * Sync course completion to GHL
 * Call this when a student completes a course
 */
export async function syncCourseCompletion(
  ghlContactId: string | null,
  courseSlug: string
): Promise<void> {
  if (!ghlContactId) return;

  const tag = getCourseTag(GHL_TAGS.COMPLETED_PREFIX, courseSlug);
  await addTagToContact(ghlContactId, tag);
}

/**
 * Sync course start to GHL
 * Call this when a student starts their first lesson
 */
export async function syncCourseStart(
  ghlContactId: string | null,
  courseSlug: string
): Promise<void> {
  if (!ghlContactId) return;

  const tag = getCourseTag(GHL_TAGS.STARTED_PREFIX, courseSlug);
  await addTagToContact(ghlContactId, tag);
}
