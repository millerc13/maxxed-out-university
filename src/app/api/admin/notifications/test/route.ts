import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { notifyRecipients } from '@/lib/sms';

export const runtime = 'nodejs';

/**
 * Sends a sample lead-notification SMS to all active recipients with
 * `notifyOnLead = true`. Used by the "Send test SMS" button on
 * /admin/notifications so admins can verify the path without filing a
 * real /apply.
 */
export async function POST() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
    return NextResponse.json(
      { error: 'GHL not configured (GHL_API_KEY / GHL_LOCATION_ID missing)' },
      { status: 503 }
    );
  }

  const body =
    `New Maxxed Out application — TEST\n\n` +
    `🧪 This is a test send from /admin/notifications.\n` +
    `If you got this, the in-repo notification path is working.\n\n` +
    `Real lead SMS will arrive in this rich-note format whenever\n` +
    `someone submits /apply on a funnel or on the university site.`;

  // No source filter on test sends — fires to ALL active lead recipients
  // regardless of their per-source subscription, so admins can verify
  // the path even when their recipient row is scoped to specific funnels.
  const results = await notifyRecipients('lead', body);
  const successes = results.filter((r) => r.ok).length;
  const failures = results.filter((r) => !r.ok);

  return NextResponse.json({
    sent: successes,
    total: results.length,
    failures: failures.map((r) => ({ phone: r.phone, label: r.label, error: r.error })),
  });
}
