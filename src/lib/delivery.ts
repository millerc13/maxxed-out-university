/**
 * Post-purchase delivery copy + token rendering. Single source of truth
 * for the SMS / email body the buyer receives after a successful
 * checkout. The Course row carries optional admin-edited overrides
 * (welcomeSmsBody, welcomeEmailSubject, welcomeEmailBody); when those
 * are unset we fall back to the defaults below.
 *
 * Tokens supported in any field:
 *   {{firstName}}    – buyer's first name
 *   {{customerName}} – buyer's full name
 *   {{courseTitle}}  – course they purchased
 *   {{shortUrl}}     – SMS-friendly /a/{6char} magic-link URL
 *   {{activateUrl}}  – full /auth/activate?token=… URL (use in email)
 */

export interface DeliveryTokens {
  firstName: string;
  customerName: string;
  courseTitle: string;
  shortUrl: string;
  activateUrl: string;
}

export interface DeliveryCourse {
  title: string;
  // Apply→checkout courses are high-ticket "team will reach out"
  // programs (mentorship, DWY, accelerator); the default copy nudges
  // buyers to use Blueprint while they wait. Self-serve courses just
  // say "your course is ready."
  checkoutAfterApply?: boolean | null;
  isBundle?: boolean | null;
  // Optional admin-edited overrides. NULL/empty → use defaults.
  welcomeSmsBody?: string | null;
  welcomeEmailSubject?: string | null;
  welcomeEmailBody?: string | null;
}

const BLUEPRINT_TITLE = 'Real Estate Empire Blueprint';

export function renderTokens(template: string, tokens: DeliveryTokens): string {
  return template
    .replaceAll('{{firstName}}', tokens.firstName)
    .replaceAll('{{customerName}}', tokens.customerName)
    .replaceAll('{{courseTitle}}', tokens.courseTitle)
    .replaceAll('{{shortUrl}}', tokens.shortUrl)
    .replaceAll('{{activateUrl}}', tokens.activateUrl);
}

/**
 * Default SMS body chosen by course nature. Three variants:
 *   - High-ticket (apply→checkout):  "team will reach out, dive into Blueprint while you wait"
 *   - Blueprint itself:              "your full library is ready"
 *   - Self-serve add-on:             "your course is ready, plus full Blueprint access"
 */
export function defaultSmsBody(course: Pick<DeliveryCourse, 'title' | 'checkoutAfterApply' | 'isBundle'>): string {
  const isBlueprint = course.title.trim().toLowerCase() === BLUEPRINT_TITLE.toLowerCase()
    || (course.isBundle === true && course.title.toLowerCase().includes('blueprint'));

  if (isBlueprint) {
    return `Hey {{firstName}}, this is Todd's team at Maxxed Out. Welcome to {{courseTitle}} — your full course library is ready. Tap to set up your account and dive in: {{shortUrl}}`;
  }
  if (course.checkoutAfterApply) {
    return `Hey {{firstName}}, this is Todd's team at Maxxed Out — welcome to {{courseTitle}}! We'll be in touch soon to schedule your first session. While you wait, you've got full access to our ${BLUEPRINT_TITLE} course library. Tap to log in and dive in: {{shortUrl}}`;
  }
  return `Hey {{firstName}}, this is Todd's team at Maxxed Out. Your {{courseTitle}} access is ready — and you've also got our full ${BLUEPRINT_TITLE} course library included. Tap to set up your account: {{shortUrl}}`;
}

export function defaultEmailSubject(course: Pick<DeliveryCourse, 'title'>): string {
  return `Welcome to ${course.title} — set up your account`;
}

/**
 * Default email body — kept as a short paragraph admin can extend.
 * The full HTML wrapper (logo, CTA button, footer) is built by the
 * email helper; this is just the "body copy" that lives between the
 * hero and the activation button.
 */
export function defaultEmailBody(course: Pick<DeliveryCourse, 'title' | 'checkoutAfterApply'>): string {
  if (course.checkoutAfterApply) {
    return `You're in — welcome to ${course.title}. Our team will reach out within one business day to schedule your first session. While you wait, click below to set up your account password and dive into the full ${BLUEPRINT_TITLE} course library, included free with your enrollment.`;
  }
  return `You're in — your ${course.title} access is ready, along with our full ${BLUEPRINT_TITLE} course library. Click below to set up your account password and start watching.`;
}

/** Render the SMS body for a course + tokens, using admin-edited copy if present. */
export function buildSmsBody(course: DeliveryCourse, tokens: DeliveryTokens): string {
  const template = (course.welcomeSmsBody && course.welcomeSmsBody.trim().length > 0)
    ? course.welcomeSmsBody
    : defaultSmsBody(course);
  return renderTokens(template, tokens);
}

/** Render the email subject for a course + tokens. */
export function buildEmailSubject(course: DeliveryCourse, tokens: DeliveryTokens): string {
  const template = (course.welcomeEmailSubject && course.welcomeEmailSubject.trim().length > 0)
    ? course.welcomeEmailSubject
    : defaultEmailSubject(course);
  return renderTokens(template, tokens);
}

/** Render the email body for a course + tokens. */
export function buildEmailBody(course: DeliveryCourse, tokens: DeliveryTokens): string {
  const template = (course.welcomeEmailBody && course.welcomeEmailBody.trim().length > 0)
    ? course.welcomeEmailBody
    : defaultEmailBody(course);
  return renderTokens(template, tokens);
}
