import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Maxxed Out University <learn@maxxedout.com>';
const BASE_URL = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');

/**
 * Wraps `resend.emails.send` with an env guard.
 *
 * Sends for real ONLY when `VERCEL_ENV === 'production'` — preview /
 * development / local deploys log what would have been sent and return
 * a stub success object so callers' result.data.id reads don't crash.
 *
 * Override with `RESEND_FORCE_SEND=true` if you actually need a real
 * send from a non-prod env (rare — usually you don't).
 */
type ResendSendArgs = Parameters<typeof resend.emails.send>[0];
type ResendSendResult = Awaited<ReturnType<typeof resend.emails.send>>;

async function safeSend(args: ResendSendArgs): Promise<ResendSendResult> {
  // Trim values defensively — Vercel env values that go in via
  // `echo "true" | vercel env add` end up with a trailing \n that
  // breaks strict-equality comparison. Match case-insensitively too.
  const vercelEnv = (process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  const forceSendRaw = process.env.RESEND_FORCE_SEND ?? '';
  const forceSend = forceSendRaw.trim().toLowerCase() === 'true';
  const isProd = vercelEnv === 'production';
  const willSend = isProd || forceSend;
  const hasApiKey = !!process.env.RESEND_API_KEY;

  console.log('[resend] safeSend decision', {
    to: (args as { to?: string | string[] }).to,
    subject: (args as { subject?: string }).subject,
    vercelEnv: process.env.VERCEL_ENV ?? '(unset)',
    rawForceSend: JSON.stringify(forceSendRaw),
    forceSendParsed: forceSend,
    isProd,
    hasApiKey,
    willSend,
  });

  if (!willSend) {
    console.log('[resend] Skipping send — non-prod env (set RESEND_FORCE_SEND=true to override)');
    return {
      data: { id: 'skipped-non-prod' },
      error: null,
    } as ResendSendResult;
  }

  if (!hasApiKey) {
    console.error('[resend] Cannot send — RESEND_API_KEY is missing');
    return {
      data: null,
      error: { name: 'missing_api_key', message: 'RESEND_API_KEY not configured' },
    } as unknown as ResendSendResult;
  }

  const result = await resend.emails.send(args);
  console.log('[resend] send result', {
    id: result?.data?.id,
    error: result?.error ? JSON.stringify(result.error) : null,
  });
  return result;
}

/**
 * Escape HTML for safe interpolation inside the email template. The
 * admin-edited body is plain text; we render it as paragraphs in the
 * branded wrapper, so untrusted/quirky punctuation can't break layout.
 */
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Convert a plain-text body into HTML paragraphs (preserves blank-line splits). */
function textToParagraphs(s: string): string {
  return s
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(para).replaceAll('\n', '<br />')}</p>`,
    )
    .join('');
}

export async function sendMagicLinkEmail({
  to,
  name,
  token,
  courseName,
  courseThumbnail,
  bonusBox,
  teamReachOutNote,
  subjectOverride,
  bodyOverride,
}: {
  to: string;
  name: string;
  token: string;
  courseName: string;
  courseThumbnail?: string | null;
  /** Optional callout shown above the CTA — used to mention bonus content like included Blueprint access for DWY/Mentorship buyers. */
  bonusBox?: { title: string; body: string } | null;
  /** When true, adds a note explaining a team member will reach out separately for onboarding. */
  teamReachOutNote?: boolean;
  /** Per-course admin override for the subject line (already token-substituted by caller). */
  subjectOverride?: string | null;
  /** Per-course admin override for the heading body paragraph (already token-substituted by caller). Plain text — rendered as paragraphs in the branded wrapper. */
  bodyOverride?: string | null;
}) {
  const activateUrl = `${BASE_URL}/auth/activate?token=${token}`;
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  const firstName = name.split(' ')[0] || 'there';
  const thumbnailBlock = courseThumbnail
    ? `<tr><td style="padding:0 0 28px;"><img src="${courseThumbnail}" alt="${courseName}" width="520" style="display:block;width:100%;max-width:520px;border-radius:10px;" /></td></tr>`
    : '';
  const bonusBoxBlock = bonusBox
    ? `<tr><td style="padding:0 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
          <tr><td style="padding:18px 22px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;">Included with your purchase</p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">${bonusBox.title}</p>
            <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.55;">${bonusBox.body}</p>
          </td></tr>
        </table>
      </td></tr>`
    : '';
  const teamNoteBlock = teamReachOutNote
    ? `<tr><td style="padding:0 0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.55;">
              <strong style="color:#1e3a8a;">Watch for a separate email.</strong>
              A member of Todd's team will reach out within one business day to schedule your onboarding call and walk you through your custom plan.
            </p>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const subject = (subjectOverride && subjectOverride.trim())
    || `Your ${courseName} access is ready`;
  const headingHtml = `Your course is ready, ${escapeHtml(firstName)}!`;
  const bodyHtml = (bodyOverride && bodyOverride.trim())
    ? textToParagraphs(bodyOverride)
    : `<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">You've been enrolled in <strong style="color:#111827;">${escapeHtml(courseName)}</strong>. ${bonusBox ? 'Click below to set up your account and start exploring.' : 'Click below to set up your account and start learning.'}</p>`;

  console.log('[resend] Sending magic link email', { from: FROM, to, subject, activateUrl });
  const result = await safeSend({
    from: FROM,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 32px;">
              <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;line-height:1.3;">
                      ${headingHtml}
                    </h1>
                    ${bodyHtml}
                  </td>
                </tr>

                <!-- Course Thumbnail -->
                ${thumbnailBlock}

                <!-- Bonus content callout -->
                ${bonusBoxBlock}

                <!-- Team reach-out note -->
                ${teamNoteBlock}

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;border-radius:10px;">
                          <a href="${activateUrl}"
                             style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                            Access My Course
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:20px 0 0;">
                    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;line-height:1.5;">
                      This link will log you in automatically — no password needed. It expires in 48 hours.
                    </p>
                    <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
                      ${activateUrl}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
  console.log('[resend] Magic link email result', { emailId: result?.data?.id, error: result?.error });
  return result;
}

export async function sendCourseAddedEmail({
  to,
  name,
  courseName,
  loginUrl,
  courseThumbnail,
  bonusBox,
  teamReachOutNote,
  subjectOverride,
  bodyOverride,
}: {
  to: string;
  name: string;
  courseName: string;
  loginUrl: string;
  courseThumbnail?: string | null;
  bonusBox?: { title: string; body: string } | null;
  teamReachOutNote?: boolean;
  /** Per-course admin override for the subject (already token-substituted by caller). */
  subjectOverride?: string | null;
  /** Per-course admin override for the heading body paragraph (already token-substituted by caller). */
  bodyOverride?: string | null;
}) {
  const firstName = name.split(' ')[0] || 'there';
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  const thumbnailBlock = courseThumbnail
    ? `<tr><td style="padding:0 0 28px;"><img src="${courseThumbnail}" alt="${courseName}" width="520" style="display:block;width:100%;max-width:520px;border-radius:10px;" /></td></tr>`
    : '';
  const bonusBoxBlock = bonusBox
    ? `<tr><td style="padding:0 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
          <tr><td style="padding:18px 22px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;">Included with your purchase</p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">${bonusBox.title}</p>
            <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.55;">${bonusBox.body}</p>
          </td></tr>
        </table>
      </td></tr>`
    : '';
  const teamNoteBlock = teamReachOutNote
    ? `<tr><td style="padding:0 0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.55;">
              <strong style="color:#1e3a8a;">Watch for a separate email.</strong>
              A member of Todd's team will reach out within one business day to schedule your onboarding call and walk you through your custom plan.
            </p>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const subject = (subjectOverride && subjectOverride.trim())
    || `You've been enrolled in ${courseName}`;
  const headingHtml = `New course unlocked, ${escapeHtml(firstName)}!`;
  const bodyHtml = (bodyOverride && bodyOverride.trim())
    ? textToParagraphs(bodyOverride)
    : `<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">You've been enrolled in <strong style="color:#111827;">${escapeHtml(courseName)}</strong>. It's ready and waiting in your dashboard.</p>`;

  return safeSend({
    from: FROM,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 32px;">
              <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;line-height:1.3;">
                      ${headingHtml}
                    </h1>
                    ${bodyHtml}
                  </td>
                </tr>

                <!-- Course Thumbnail -->
                ${thumbnailBlock}

                <!-- Bonus content callout -->
                ${bonusBoxBlock}

                <!-- Team reach-out note -->
                ${teamNoteBlock}

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;border-radius:10px;">
                          <a href="${loginUrl}"
                             style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                            Go to My Courses
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:20px 0 0;">
                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      Log in with your existing account to start learning right away. If you didn't make this purchase, please contact us.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

export async function sendAlreadyOwnedEmail({
  to,
  name,
  courseName,
  loginUrl,
  courseThumbnail,
}: {
  to: string;
  name: string;
  courseName: string;
  loginUrl: string;
  courseThumbnail?: string | null;
}) {
  const firstName = name.split(' ')[0] || 'there';
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  const forgotUrl = `${BASE_URL}/forgot-password`;
  const thumbnailBlock = courseThumbnail
    ? `<tr><td style="padding:0 0 28px;"><img src="${courseThumbnail}" alt="${courseName}" width="520" style="display:block;width:100%;max-width:520px;border-radius:10px;" /></td></tr>`
    : '';

  console.log('[resend] Sending already-owned email', { from: FROM, to, subject: `You already own ${courseName}` });
  const result = await safeSend({
    from: FROM,
    to,
    subject: `You already own ${courseName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 32px;">
              <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;line-height:1.3;">
                      Hey ${firstName} — you already own this!
                    </h1>
                    <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.6;">
                      You already have access to <strong style="color:#111827;">${courseName}</strong>. Your card was <strong>not</strong> charged.
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Log in below to jump back in and pick up where you left off.
                    </p>
                  </td>
                </tr>
                ${thumbnailBlock}
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;border-radius:10px;">
                          <a href="${loginUrl}" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                            Log In To My Account
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:20px 0 0;">
                    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;line-height:1.5;">
                      Forgot your password? <a href="${forgotUrl}" style="color:#2563eb;text-decoration:none;">Reset it here</a>.
                    </p>
                    <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      Didn't mean to make this purchase attempt? You can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
  console.log('[resend] Already-owned email result', { emailId: result?.data?.id, error: result?.error });
  return result;
}

export async function sendModuleQuizPassedEmail({
  to,
  name,
  courseName,
  moduleName,
  moduleNumber,
  totalModules,
  score,
  nextLessonUrl,
}: {
  to: string;
  name: string;
  courseName: string;
  moduleName: string;
  moduleNumber: number;
  totalModules: number;
  score: number;
  nextLessonUrl: string | null;
}) {
  const firstName = name.split(' ')[0] || 'there';
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  const isLastModule = moduleNumber >= totalModules;
  const percentComplete = Math.round((moduleNumber / totalModules) * 100);

  // Pick a fresh hype line
  const hypeLines = [
    "Momentum looks good on you.",
    "That's the sound of progress.",
    "One more module in the books.",
    "Keep that streak alive.",
    "You're building real knowledge — block by block.",
  ];
  const hype = hypeLines[moduleNumber % hypeLines.length];

  const ctaText = isLastModule ? 'Take the Final Exam' : 'Continue to the Next Module';
  const fallbackUrl = `${BASE_URL}/dashboard`;
  const ctaUrl = nextLessonUrl ?? fallbackUrl;

  console.log('[resend] Sending module-passed email', { from: FROM, to, moduleNumber, moduleName, score });
  const result = await safeSend({
    from: FROM,
    to,
    subject: `Nice — you crushed Module ${moduleNumber}: ${moduleName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 32px;">
              <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-top:4px solid #2563eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#2563eb;letter-spacing:0.2em;text-transform:uppercase;">
                      Module ${moduleNumber} Complete
                    </p>
                    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#111827;line-height:1.3;">
                      Nice work, ${firstName} — ${hype}
                    </h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      You just passed the quiz for
                      <strong style="color:#111827;">Module ${moduleNumber}: ${moduleName}</strong>
                      with a score of <strong style="color:#111827;">${score}%</strong>.
                      ${isLastModule ? "You're at the final step — the exam awaits." : 'Keep your momentum going and jump into the next module.'}
                    </p>
                  </td>
                </tr>

                <!-- Progress -->
                <tr>
                  <td style="padding:0 0 28px;">
                    <div style="background:#f3f4f6;border-radius:10px;padding:14px 16px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:12px;color:#6b7280;font-weight:600;">
                            ${moduleNumber} of ${totalModules} modules complete
                          </td>
                          <td align="right" style="font-size:12px;color:#111827;font-weight:800;">
                            ${percentComplete}%
                          </td>
                        </tr>
                      </table>
                      <div style="margin-top:10px;height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                        <div style="width:${percentComplete}%;height:8px;background:linear-gradient(90deg,#2563eb,#60a5fa);border-radius:999px;"></div>
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;border-radius:10px;">
                          <a href="${ctaUrl}" style="display:inline-block;padding:16px 44px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                            ${ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:20px 0 0;">
                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      You're working through ${courseName}. Stay consistent — the hardest part is starting, and you're already past it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
  console.log('[resend] Module-passed email result', { emailId: result?.data?.id, error: result?.error });
  return result;
}

export async function sendCertificateEmail({
  to,
  name,
  courseName,
  certificateId,
  courseThumbnail,
}: {
  to: string;
  name: string;
  courseName: string;
  certificateId: string;
  courseThumbnail?: string | null;
}) {
  const firstName = name.split(' ')[0] || 'there';
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  const viewUrl = `${BASE_URL}/certificates/${certificateId}`;
  const pdfUrl = `${BASE_URL}/api/certificates/${certificateId}/pdf`;
  const thumbnailBlock = courseThumbnail
    ? `<tr><td style="padding:0 0 28px;"><img src="${courseThumbnail}" alt="${courseName}" width="520" style="display:block;width:100%;max-width:520px;border-radius:10px;" /></td></tr>`
    : '';

  console.log('[resend] Sending certificate email', { from: FROM, to, certificateId, courseName });
  const result = await safeSend({
    from: FROM,
    to,
    subject: `🏆 Your certificate is ready — ${courseName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 32px;">
              <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-top:4px solid #D4AF37;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 16px;">
                    <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#B8941F);line-height:56px;font-size:28px;">🏆</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#B8941F;letter-spacing:0.2em;text-transform:uppercase;text-align:center;">Certificate Earned</p>
                    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#111827;line-height:1.3;text-align:center;">
                      Congratulations, ${firstName}!
                    </h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;text-align:center;">
                      You've passed the final exam and earned your Certificate of Completion for
                      <strong style="color:#111827;">${courseName}</strong>.
                    </p>
                  </td>
                </tr>
                ${thumbnailBlock}
                <tr>
                  <td align="center" style="padding:0 0 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;border-radius:10px;">
                          <a href="${viewUrl}" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                            View Certificate
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <a href="${pdfUrl}" style="font-size:13px;color:#6b7280;text-decoration:underline;">
                      Download PDF
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:20px 0 0;text-align:center;">
                    <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;line-height:1.5;">
                      Certificate ID: <strong style="color:#111827;font-family:monospace;letter-spacing:0.05em;">${certificateId}</strong>
                    </p>
                    <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">
                      Share your achievement — the link above is public.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
  console.log('[resend] Certificate email result', { emailId: result?.data?.id, error: result?.error });
  return result;
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  const firstName = name.split(' ')[0] || 'there';
  const logoUrl = `${BASE_URL}/downloads/logo.png`;

  return safeSend({
    from: FROM,
    to,
    subject: 'Reset your password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 32px;">
              <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;line-height:1.3;">
                      Password reset, ${firstName}
                    </h1>
                    <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.6;">
                      We received a request to reset your password. Click the button below to choose a new one.
                    </p>
                    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                      This link expires in <strong style="color:#111827;">1 hour</strong>. If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;border-radius:10px;">
                          <a href="${resetUrl}"
                             style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:20px 0 0;">
                    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;line-height:1.5;">
                      If the button doesn't work, copy and paste this link:
                    </p>
                    <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
