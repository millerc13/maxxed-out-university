import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Maxxed Out University <learn@courses.maxxedout.com>';
const BASE_URL = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');

export async function sendMagicLinkEmail({
  to,
  name,
  token,
  courseName,
}: {
  to: string;
  name: string;
  token: string;
  courseName: string;
}) {
  const activateUrl = `${BASE_URL}/auth/activate?token=${token}`;

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
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0c1829;border-radius:12px 12px 0 0;padding:32px 40px;border-top:4px solid #D4AF37;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#D4AF37;">Maxxed Out University</p>
              <h1 style="margin:12px 0 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
                Your course is ready, ${name.split(' ')[0]}!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                You're enrolled in <strong>${courseName}</strong>. Click the button below to set up your account and start learning immediately.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                This link will log you in automatically — no password needed yet.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:8px;">
                    <a href="${activateUrl}"
                       style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
                      Access My Course →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                Link expires in 48 hours. If you didn't purchase this course, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
                ${activateUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
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
}: {
  to: string;
  name: string;
  courseName: string;
  loginUrl: string;
}) {
  const firstName = name.split(' ')[0] || 'there';

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
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#0c1829;border-radius:12px 12px 0 0;padding:32px 40px;border-top:4px solid #D4AF37;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#D4AF37;">Maxxed Out University</p>
              <h1 style="margin:12px 0 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
                New course unlocked, ${firstName}!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                You've been enrolled in <strong>${courseName}</strong>. It's ready and waiting for you in your dashboard.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                Log in with your existing account to start learning right away.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:8px;">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
                      Go to My Courses →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                If you didn't make this purchase, please contact us immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
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
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#0c1829;border-radius:12px 12px 0 0;padding:32px 40px;border-top:4px solid #D4AF37;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#D4AF37;">Maxxed Out University</p>
              <h1 style="margin:12px 0 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
                Password reset, ${firstName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:8px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
                      Reset My Password →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                If the button doesn't work, copy and paste this link:
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Maxxed Out University. All rights reserved.
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
