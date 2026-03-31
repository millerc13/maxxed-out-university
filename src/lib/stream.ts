function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signToken(videoId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPrivateKey, createSign } = require('crypto');

  const KEY_ID = process.env.CLOUDFLARE_STREAM_KEY_ID!;
  const PRIVATE_KEY_B64 = process.env.CLOUDFLARE_STREAM_PRIVATE_KEY!;

  const der = Buffer.from(PRIVATE_KEY_B64, 'base64');
  const privateKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });

  const exp = Math.floor(Date.now() / 1000) + 7200;
  const nbf = Math.floor(Date.now() / 1000) - 60;
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: KEY_ID }));
  const payload = b64url(JSON.stringify({ sub: videoId, kid: KEY_ID, exp, nbf }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = b64url(signer.sign(privateKey));
  return `${header}.${payload}.${sig}`;
}

const SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN!;

export function getSignedStreamUrl(videoId: string): string {
  const token = signToken(videoId);
  return `https://${SUBDOMAIN}/${token}/iframe`;
}

export function parseStreamId(videoUrl: string): string | null {
  if (videoUrl.startsWith('stream:')) return videoUrl.slice(7);
  return null;
}

export function isStreamVideo(videoUrl: string | null): boolean {
  return !!videoUrl && videoUrl.startsWith('stream:');
}
