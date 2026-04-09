import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Maxxed Out University <learn@maxxedout.com>';
const BASE_URL = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');

export async function sendMagicLinkEmail({
  to,
  name,
  token,
  courseName,
  courseThumbnail,
}: {
  to: string;
  name: string;
  token: string;
  courseName: string;
  courseThumbnail?: string | null;
}) {
  const activateUrl = `${BASE_URL}/auth/activate?token=${token}`;
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  const firstName = name.split(' ')[0] || 'there';
  const thumbnailBlock = courseThumbnail
    ? `<tr><td style="padding:0 0 28px;"><img src="${courseThumbnail}" alt="${courseName}" width="520" style="display:block;width:100%;max-width:520px;border-radius:10px;" /></td></tr>`
    : '';

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${courseName} access is ready`,
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
                      Your course is ready, ${firstName}!
                    </h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      You've been enrolled in <strong style="color:#111827;">${courseName}</strong>. Click below to set up your account and start learning.
                    </p>
                  </td>
                </tr>

                <!-- Course Thumbnail -->
                ${thumbnailBlock}

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
}

export async function sendCourseAddedEmail({
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
  const thumbnailBlock = courseThumbnail
    ? `<tr><td style="padding:0 0 28px;"><img src="${courseThumbnail}" alt="${courseName}" width="520" style="display:block;width:100%;max-width:520px;border-radius:10px;" /></td></tr>`
    : '';

  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've been enrolled in ${courseName}`,
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
                      New course unlocked, ${firstName}!
                    </h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      You've been enrolled in <strong style="color:#111827;">${courseName}</strong>. It's ready and waiting in your dashboard.
                    </p>
                  </td>
                </tr>

                <!-- Course Thumbnail -->
                ${thumbnailBlock}

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

  return resend.emails.send({
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
