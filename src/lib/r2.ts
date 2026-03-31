import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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
