/**
 * Cloudflare Stream signed URL utilities
 *
 * HOW IT WORKS
 * ────────────
 * Cloudflare Stream can require signed tokens (JWTs) before serving video.
 * When `requireSignedURLs` is enabled on a video, every iframe/manifest
 * request must include a signed token in the URL path.
 *
 * The signed embed URL format is:
 *   https://{CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}/{signedToken}/iframe
 *
 * The token is a standard RS256 JWT where:
 *   - header: { alg: "RS256", kid: KEY_ID }
 *   - payload: { sub: videoId, kid: KEY_ID, exp: <unix>, nbf: <unix> }
 *
 * GENERATING A NEW KEY PAIR (when things break)
 * ─────────────────────────────────────────────
 * 1. Create a new key pair via Cloudflare API:
 *      curl -X POST "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/stream/keys" \
 *        -H "Authorization: Bearer {CLOUDFLARE_STREAM_TOKEN}"
 *    → Save the returned `id` as CLOUDFLARE_STREAM_KEY_ID
 *    → Save the returned `pem` (it's base64-encoded — decode it first)
 *
 * 2. Convert the PEM (PKCS#1) to PKCS#8 DER, then base64-encode it:
 *      echo "{pem_field_value}" | base64 --decode > /tmp/key.pem
 *      openssl pkcs8 -topk8 -nocrypt -in /tmp/key.pem -outform DER -out /tmp/key.der
 *      base64 -i /tmp/key.der | tr -d '\n'   # ← this is CLOUDFLARE_STREAM_PRIVATE_KEY
 *
 * 3. Update Vercel env vars (Preview + Development) and redeploy:
 *      echo "{KEY_ID}" | vercel env add CLOUDFLARE_STREAM_KEY_ID preview --scope {team}
 *      echo "{KEY_ID}" | vercel env add CLOUDFLARE_STREAM_KEY_ID development --scope {team}
 *      # Same for CLOUDFLARE_STREAM_PRIVATE_KEY
 *
 * COMMON PITFALLS
 * ───────────────
 * - `echo` adds a trailing newline to env vars stored via pipe — always call .trim()
 *   on env values (already done below). Without it, Cloudflare rejects the token
 *   with 401 "failed to fetch verification key" because the kid doesn't match.
 *
 * - The private key must be PKCS#8 DER format (not PEM, not PKCS#1). Cloudflare
 *   returns PKCS#1 PEM — the openssl conversion above is required.
 *
 * - This file MUST only run in Node.js runtime (not Edge). The API route that
 *   calls getSignedStreamUrl() must have `export const runtime = 'nodejs'`.
 *   Edge Runtime doesn't support Node.js `crypto` module.
 *
 * - CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN looks like:
 *   "customer-xxxxxxxxxxxx.cloudflarestream.com" (no https://, no trailing slash)
 *   Already trimmed below to guard against newlines from CLI env setup.
 */

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signToken(videoId: string): string {
  // require() instead of top-level import — keeps this file importable in
  // contexts where the module is analyzed but not executed (e.g. build time).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPrivateKey, createSign } = require('crypto');

  // .trim() is critical — `echo "..." | vercel env add` appends a newline,
  // which gets embedded in the JWT kid and causes Cloudflare 401 errors.
  const KEY_ID = process.env.CLOUDFLARE_STREAM_KEY_ID!.trim();
  const PRIVATE_KEY_B64 = process.env.CLOUDFLARE_STREAM_PRIVATE_KEY!.trim();

  const der = Buffer.from(PRIVATE_KEY_B64, 'base64');
  const privateKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: KEY_ID }));
  const payload = b64url(JSON.stringify({ sub: videoId, kid: KEY_ID, exp: now + 7200, nbf: now - 60 }));

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = b64url(signer.sign(privateKey));

  return `${header}.${payload}.${sig}`;
}

// Trim guards against newlines from CLI-piped `vercel env add` commands.
const SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN!.trim();

export function getSignedStreamUrl(videoId: string): string {
  const token = signToken(videoId);
  return `https://${SUBDOMAIN}/${token}/iframe`;
}

/** Videos stored in DB as "stream:{videoId}" — parse the ID out. */
export function parseStreamId(videoUrl: string): string | null {
  if (videoUrl.startsWith('stream:')) return videoUrl.slice(7);
  return null;
}

export function isStreamVideo(videoUrl: string | null): boolean {
  return !!videoUrl && videoUrl.startsWith('stream:');
}
