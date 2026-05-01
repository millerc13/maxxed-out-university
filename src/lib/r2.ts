import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

// Public base URL for the bucket. Either the R2.dev subdomain
// (https://pub-xxxxx.r2.dev) or a custom domain bound to the bucket. No
// trailing slash. When this is unset, uploaded images won't be reachable
// from the browser — the upload route enforces that it's configured.
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';

// Returns a signed URL valid for 2 hours
export async function getSignedVideoUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 7200 });
}

// R2 object keys are stored as "r2:videos/lesson-id.mp4"
// This helper strips the prefix to get the raw key
export function parseVideoKey(videoUrl: string): string | null {
  if (videoUrl.startsWith('r2:')) {
    return videoUrl.slice(3); // "videos/lesson-id.mp4"
  }
  return null;
}

export function isR2Video(videoUrl: string | null): boolean {
  return !!videoUrl && videoUrl.startsWith('r2:');
}

// Uploads a file (course thumbnails, etc.) to R2 and returns its public URL.
// Caller is responsible for picking a stable, conflict-free `key`.
export async function uploadPublicFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (!R2_PUBLIC_BASE_URL) {
    throw new Error('R2_PUBLIC_BASE_URL is not configured');
  }
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // 1 year — files are content-addressed by timestamp/cuid so they're immutable.
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return `${R2_PUBLIC_BASE_URL}/${key}`;
}
