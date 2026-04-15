/**
 * Idempotently registers a Fanbasis webhook subscription.
 *
 * Usage:
 *   FANBASIS_API_KEY=... FANBASIS_BASE_URL=... \
 *     npx tsx scripts/register-fanbasis-webhook.ts <webhook_url>
 *
 * Examples:
 *   # Sandbox (development deployment)
 *   FANBASIS_API_KEY=$FANBASIS_SANDBOX_TEST_KEY \
 *   FANBASIS_BASE_URL=https://qa.dev-fan-basis.com \
 *     npx tsx scripts/register-fanbasis-webhook.ts \
 *     https://development.university.maxxedout.com/api/webhooks/fanbasis
 *
 *   # Production
 *   FANBASIS_API_KEY=$FANBASIS_REAL_KEY \
 *   FANBASIS_BASE_URL=https://www.fanbasis.com/public-api \
 *     npx tsx scripts/register-fanbasis-webhook.ts \
 *     https://university.maxxedout.com/api/webhooks/fanbasis
 *
 * The Fanbasis API returns the webhook signing secret EXACTLY ONCE on
 * creation. This script prints it loudly — paste it into the matching
 * Vercel env as FANBASIS_WEBHOOK_SECRET. If lost, delete the subscription
 * and re-create it.
 */

const EVENT_TYPES = [
  'payment.succeeded',
  'product.purchased',
  'payment.failed',
  'payment.expired',
  'payment.canceled',
];

async function main() {
  const apiKey = process.env.FANBASIS_API_KEY;
  const baseUrl = process.env.FANBASIS_BASE_URL;
  const webhookUrl = process.argv[2];

  if (!apiKey) throw new Error('FANBASIS_API_KEY env var is required');
  if (!baseUrl) throw new Error('FANBASIS_BASE_URL env var is required');
  if (!webhookUrl) throw new Error('Pass the webhook URL as the first argument');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': apiKey,
  };

  console.log(`\nFanbasis API: ${baseUrl}`);
  console.log(`Target webhook URL: ${webhookUrl}\n`);

  // 1. Idempotency check — list existing subscriptions.
  const listRes = await fetch(`${baseUrl}/webhook-subscriptions`, { headers });
  const listBody = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`Failed to list subscriptions (${listRes.status}): ${JSON.stringify(listBody)}`);
  }

  const existing = (listBody.data as Array<{ id: string; webhook_url: string; event_types: string[] }>).find(
    (s) => s.webhook_url === webhookUrl
  );

  if (existing) {
    console.log(`✔  Webhook already registered (id=${existing.id})`);
    console.log(`   Subscribed events: ${existing.event_types.join(', ')}`);
    const missing = EVENT_TYPES.filter((e) => !existing.event_types.includes(e));
    if (missing.length) {
      console.log(`\n⚠  Missing event types: ${missing.join(', ')}`);
      console.log(`   Delete this subscription in Fanbasis and re-run to recreate with the full event list.`);
    }
    console.log(`\n   The webhook secret is NOT recoverable via the API.`);
    console.log(`   If FANBASIS_WEBHOOK_SECRET is missing in your env, delete and re-create the subscription.`);
    return;
  }

  // 2. Create.
  const createRes = await fetch(`${baseUrl}/webhook-subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ webhook_url: webhookUrl, event_types: EVENT_TYPES }),
  });
  const createBody = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create subscription (${createRes.status}): ${JSON.stringify(createBody)}`);
  }

  console.log('✔  Webhook subscription created');
  console.log('\nResponse:');
  console.log(JSON.stringify(createBody, null, 2));

  // The signing secret should be in createBody.data — surface it loudly.
  const data = createBody.data ?? {};
  const secret = data.secret || data.webhook_secret || data.signing_secret;
  if (secret) {
    console.log('\n' + '='.repeat(72));
    console.log('FANBASIS_WEBHOOK_SECRET (save this NOW — Fanbasis will not show it again):');
    console.log('');
    console.log(`  ${secret}`);
    console.log('');
    console.log('Add it to Vercel for the matching environment:');
    console.log('  vercel env add FANBASIS_WEBHOOK_SECRET production   # or  development');
    console.log('='.repeat(72) + '\n');
  } else {
    console.log('\n⚠  No `secret` field in response. Inspect the JSON above for the secret field name and update this script.\n');
  }
}

main().catch((err) => {
  console.error('\n✗  ' + (err instanceof Error ? err.message : err));
  process.exit(1);
});
