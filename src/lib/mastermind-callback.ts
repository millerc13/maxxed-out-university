/**
 * Notifies the mastermind-stripe-dashboard app that a prospect completed an
 * enrollment. Used to flip SentOffer records there from 'sent' to 'enrolled'
 * when a Stage Offer checkout link converts.
 *
 * Fire-and-forget (never throws, never blocks the webhook flow). Config via:
 *   - MASTERMIND_WEBHOOK_URL         (e.g. https://mastermind.maxxedout.com/api/stage-offers/webhook)
 *   - MAXXED_INTERNAL_WEBHOOK_SECRET (shared secret; must match mastermind's env)
 *
 * Both vars optional — if either is missing, the helper silently no-ops.
 */
export async function notifyMastermindEnrolled(params: {
  email: string;
  courseId: string;
  transactionId: string;
}) {
  const url = process.env.MASTERMIND_WEBHOOK_URL;
  const secret = process.env.MAXXED_INTERNAL_WEBHOOK_SECRET;

  if (!url || !secret) {
    console.log('[mastermind-callback] Skipping — MASTERMIND_WEBHOOK_URL or MAXXED_INTERNAL_WEBHOOK_SECRET unset');
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-maxxed-internal': secret,
      },
      body: JSON.stringify({
        email: params.email,
        courseId: params.courseId,
        transactionId: params.transactionId,
        enrolledAt: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[mastermind-callback] Non-2xx response', { status: res.status, body: body.slice(0, 300) });
      return;
    }
    console.log('[mastermind-callback] Notified mastermind', { email: params.email, courseId: params.courseId });
  } catch (err) {
    console.error('[mastermind-callback] Fetch failed', { error: err instanceof Error ? err.message : err });
  }
}
