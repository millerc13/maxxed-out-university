import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Server-only e-sign helpers. Anything that touches Node's 'crypto' lives
// here so the browser bundle never tries to import it. Render-side helpers
// (markdownToHtml, decorateContractHtml, extractTokens, renderMarkdown,
// TokenValues) live in esign-render.ts and are safe to use client-side.
//
// We re-export them below so existing server callers can keep importing
// from '@/lib/esign-tokens'.

export {
  extractTokens,
  renderMarkdown,
  markdownToHtml,
  decorateContractHtml,
  type TokenValues,
} from './esign-render';

import type { TokenValues } from './esign-render';

export function generateSigningToken(): string {
  return randomBytes(32).toString('hex');
}

// Canonical signature payload hash. Anyone can recompute this from the
// stored DocumentSignature row and verify the row hasn't been tampered.
// Sort token keys so re-running with the same data produces the same hash.
export function computeSignatureHash(input: {
  renderedHtml: string;
  tokens: TokenValues;
  signedName: string;
  signedAt: Date;
  signedFromIp: string;
  // PNG of the actual signature mark (typed-cursive render OR drawn).
  // Hashed alongside the rest so any future swap of the image bytes
  // invalidates the hash. Optional — older rows without a PNG still
  // verify correctly.
  signedSignaturePng?: string | null;
}): string {
  const canonical = {
    renderedHtml: input.renderedHtml,
    tokens: sortKeys(input.tokens),
    signedName: input.signedName,
    signedAt: input.signedAt.toISOString(),
    signedFromIp: input.signedFromIp,
    signedSignaturePng: input.signedSignaturePng ?? null,
  };
  const payload = JSON.stringify(canonical);
  return createHash('sha256').update(payload).digest('hex');
}

function sortKeys<T extends Record<string, unknown>>(obj: T): T {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted as T;
}

// ── Post-sign download tokens ────────────────────────────────
// After a recipient signs, the success page exposes a "Download a
// copy" link. The original signingToken can't be reused — it's
// revoked at sign time. Issue a short-lived HMAC-signed token over
// the documentId instead. Format: base64url(payload).base64url(sig)
// where payload is JSON `{ d: documentId, exp: unixSeconds }` and
// sig is HMAC-SHA256(payload, AUTH_SECRET).

// Default for the post-sign in-browser success page (24 hours is
// plenty for a single-session "Download a copy" link). Email-bound
// links should pass a longer TTL via the helper's argument so the
// recipient can come back days/weeks later and still download.
const DEFAULT_DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 60 * 24;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is required to sign download tokens');
  }
  return secret;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signDownloadToken(
  documentId: string,
  ttlSeconds: number = DEFAULT_DOWNLOAD_TOKEN_TTL_SECONDS,
): string {
  const payload = { d: documentId, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac('sha256', getSecret()).update(payloadB).digest();
  return `${payloadB}.${b64url(sig)}`;
}

export function verifyDownloadToken(token: string): { documentId: string } | null {
  const [payloadB, sigB] = token.split('.');
  if (!payloadB || !sigB) return null;
  const expected = createHmac('sha256', getSecret()).update(payloadB).digest();
  let received: Buffer;
  try {
    received = fromB64url(sigB);
  } catch {
    return null;
  }
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }
  let payload: { d?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(fromB64url(payloadB).toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.d !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { documentId: payload.d };
}
