const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN!;

/**
 * Returns the HLS manifest URL for a Stream video (unsigned).
 * Requires requireSignedURLs = false in Cloudflare Stream dashboard.
 */
export function getSignedStreamUrl(videoId: string): string {
  return `https://${SUBDOMAIN}/${videoId}/manifest/video.m3u8`;
}

/**
 * Returns the Cloudflare Stream iframe embed URL (unsigned).
 */
export function getSignedEmbedUrl(videoId: string): string {
  return `https://customer-${SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;
}

export function parseStreamId(videoUrl: string): string | null {
  if (videoUrl.startsWith('stream:')) return videoUrl.slice(7);
  return null;
}

export function isStreamVideo(videoUrl: string | null): boolean {
  return !!videoUrl && videoUrl.startsWith('stream:');
}
