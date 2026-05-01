import { Resend } from 'resend';

// Baseline e-sign email senders. The HTML is mirrored on the resend.ts
// style (raw HTML strings) but the visual polish (logo, fonts, palette,
// callout boxes) lands in Phase 6 via the ui-ux-pro-max skill.

const resend = new Resend(process.env.RESEND_API_KEY);
// Personal sender name + reply-to make Gmail's classifier read this
// as a transactional 1:1 message instead of marketing — major lever
// for landing in Inbox vs Promotions.
const FROM = "Todd's Team at Maxxed Out <learn@maxxedout.com>";
const REPLY_TO = 'learn@maxxedout.com';
const BASE_URL = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');

type SendArgs = Parameters<typeof resend.emails.send>[0];
type SendResult = Awaited<ReturnType<typeof resend.emails.send>>;

async function safeSend(args: SendArgs): Promise<SendResult> {
  // Trim values defensively — env vars that go in via
  // `echo "true" | vercel env add` carry a trailing \n that breaks
  // strict-equality. Match case-insensitively.
  const vercelEnv = (process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  const forceSendRaw = process.env.RESEND_FORCE_SEND ?? '';
  const forceSend = forceSendRaw.trim().toLowerCase() === 'true';
  const isProd = vercelEnv === 'production';
  const willSend = isProd || forceSend;
  const hasApiKey = !!process.env.RESEND_API_KEY;

  console.log('[esign-email] safeSend decision', {
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
    console.log('[esign-email] Skipping send — non-prod env (set RESEND_FORCE_SEND=true to override)');
    return { data: { id: 'skipped-non-prod' }, error: null } as SendResult;
  }
  if (!hasApiKey) {
    console.error('[esign-email] Cannot send — RESEND_API_KEY is missing');
    return { data: null, error: { name: 'missing_api_key', message: 'RESEND_API_KEY not configured' } } as unknown as SendResult;
  }
  const result = await resend.emails.send(args);
  console.log('[esign-email] send result', {
    id: result?.data?.id,
    error: result?.error ? JSON.stringify(result.error) : null,
  });
  return result;
}

function adminNotifyEmail(): string {
  const v = process.env.ESIGN_ADMIN_NOTIFY_EMAIL;
  if (!v) {
    throw new Error('ESIGN_ADMIN_NOTIFY_EMAIL is not configured');
  }
  return v;
}

function shellHtml(opts: { title: string; bodyHtml: string }): string {
  const logoUrl = `${BASE_URL}/downloads/logo.png`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:0 0 32px;">
          <img src="${logoUrl}" alt="Maxxed Out" width="180" style="display:block;width:180px;" />
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:28px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Maxxed Out University. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSigningRequestEmail(args: {
  to: string;
  recipientName: string;
  courseTitle: string;
  signingUrl: string;
  expiresAt: Date;
}) {
  const firstName = args.recipientName.split(' ')[0] || 'there';
  const expiry = args.expiresAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // Plain text first — Gmail uses the presence of a multipart/alternative
  // text/plain part as a strong "this is a real email, not marketing"
  // signal. Conversational tone, no marketing-speak.
  const text = `Hi ${firstName},

Welcome to ${args.courseTitle} — quick housekeeping before we kick things off. Please review and sign your enrollment agreement here:

${args.signingUrl}

Takes about two minutes (read the terms, type your full legal name, click Sign). Link expires ${expiry}.

Reply to this email if anything looks off and I'll sort it out.

— Todd's team`;

  // HTML — kept simple. Inline anchor link instead of a colored CTA
  // button, no logo banner, no decorative table padding. Reads as a
  // 1:1 message Todd's team would send, not a marketing blast.
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;font-size:15px;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">
      Welcome to <strong>${args.courseTitle}</strong> — quick housekeeping before we kick things off.
      Please review and sign your enrollment agreement here:
    </p>
    <p style="margin:0 0 16px;">
      <a href="${args.signingUrl}" style="color:#2563eb;text-decoration:underline;">${args.signingUrl}</a>
    </p>
    <p style="margin:0 0 16px;">
      Takes about two minutes — read the terms, type your full legal name, click Sign.
      Link expires ${expiry}.
    </p>
    <p style="margin:0 0 16px;">Reply to this email if anything looks off and I'll sort it out.</p>
    <p style="margin:0;color:#6b7280;">— Todd's team</p>
  </div>
</body>
</html>`;

  return safeSend({
    from: FROM,
    replyTo: REPLY_TO,
    to: args.to,
    subject: `Quick: sign your enrollment for ${args.courseTitle}`,
    html,
    text,
  });
}

export async function sendSigningCompletedEmail(args: {
  to: string;
  recipientName: string;
  courseTitle: string;
  pdfDownloadUrl: string;
}) {
  const firstName = args.recipientName.split(' ')[0] || 'there';

  const text = `Thanks ${firstName} — your ${args.courseTitle} enrollment agreement is signed.

A copy is stored on file. Save the signed PDF here for your records:

${args.pdfDownloadUrl}

Reply to this email if you have any questions about your enrollment.

— Todd's team`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;font-size:15px;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="margin:0 0 16px;">
      Thanks ${firstName} — your <strong>${args.courseTitle}</strong> enrollment agreement is signed.
    </p>
    <p style="margin:0 0 16px;">A copy is stored on file. Save the signed PDF for your records:</p>
    <p style="margin:0 0 16px;">
      <a href="${args.pdfDownloadUrl}" style="color:#2563eb;text-decoration:underline;">${args.pdfDownloadUrl}</a>
    </p>
    <p style="margin:0 0 16px;">Reply to this email if you have any questions about your enrollment.</p>
    <p style="margin:0;color:#6b7280;">— Todd's team</p>
  </div>
</body>
</html>`;

  return safeSend({
    from: FROM,
    replyTo: REPLY_TO,
    to: args.to,
    subject: `Signed: your ${args.courseTitle} enrollment agreement`,
    html,
    text,
  });
}

export async function sendAdminSigningNotification(args: {
  courseTitle: string;
  recipientName: string;
  recipientEmail: string;
  signedAt: Date;
  adminUrl: string;
}) {
  const when = args.signedAt.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#2563eb;letter-spacing:0.2em;text-transform:uppercase;">Agreement Signed</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">
      ${args.recipientName} signed their ${args.courseTitle} agreement
    </h1>
    <p style="margin:0 0 6px;font-size:14px;color:#6b7280;">${args.recipientEmail}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${when}</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 12px;">
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#111827;border-radius:10px;">
        <a href="${args.adminUrl}" style="display:inline-block;padding:14px 40px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
          Open in Admin
        </a>
      </td></tr></table>
    </td></tr></table>
  `;
  return safeSend({
    from: FROM,
    to: adminNotifyEmail(),
    subject: `Signed: ${args.recipientName} — ${args.courseTitle}`,
    html: shellHtml({ title: 'Agreement signed', bodyHtml: body }),
  });
}
