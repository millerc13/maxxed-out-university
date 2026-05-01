import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

/**
 * Admin-only diagnostic. Returns the env state the running serverless
 * function sees for the variables that gate outbound delivery (Resend
 * email, GHL SMS, e-sign email). Use this when a webhook ran cleanly
 * but no email or SMS arrived — the value here tells you whether the
 * deployed function is reading the env vars you set in Vercel, with
 * the right bytes.
 */
export async function GET() {
  await requireAdmin();

  const inspect = (name: string) => {
    const raw = process.env[name];
    if (raw == null) return { name, set: false };
    return {
      name,
      set: true,
      length: raw.length,
      json: JSON.stringify(raw),
      trimmedLowercased: raw.trim().toLowerCase(),
    };
  };

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? '(unset)',
    nextauthUrl: process.env.NEXTAUTH_URL ?? '(unset)',
    flags: [
      inspect('RESEND_FORCE_SEND'),
      inspect('GHL_SMS_FORCE_SEND'),
    ],
    secretsPresent: {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      GHL_API_KEY: !!process.env.GHL_API_KEY,
      GHL_LOCATION_ID: !!process.env.GHL_LOCATION_ID,
      ESIGN_ADMIN_NOTIFY_EMAIL: !!process.env.ESIGN_ADMIN_NOTIFY_EMAIL,
      FANBASIS_WEBHOOK_SECRET: !!process.env.FANBASIS_WEBHOOK_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
    },
  });
}
