#!/usr/bin/env node
/**
 * Migrates all filesafe.space video URLs to Cloudflare R2.
 * Run after setting R2 env vars in .env.local:
 *
 *   set -a && source .env.local && set +a && node scripts/migrate-videos-to-r2.mjs
 *
 * What it does:
 *   1. Finds all lessons with a direct video URL (not already on R2)
 *   2. Downloads each video from filesafe.space
 *   3. Uploads to R2 as videos/{lessonId}.mp4
 *   4. Updates the DB videoUrl to "r2:videos/{lessonId}.mp4"
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function downloadAndUpload(url, key) {
  console.log(`  Downloading ${url.slice(0, 60)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const sizeKb = Math.round(buffer.length / 1024);
  console.log(`  Downloaded ${sizeKb}KB — uploading to R2 as ${key}`);

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
  }));

  console.log(`  ✓ Uploaded`);
}

async function main() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !BUCKET) {
    console.error('Missing R2 env vars. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
  }

  // Find all lessons with a non-R2 video URL
  const lessons = await prisma.lesson.findMany({
    where: {
      videoUrl: { not: null },
      NOT: { videoUrl: { startsWith: 'r2:' } },
    },
    select: { id: true, title: true, videoUrl: true },
  });

  console.log(`Found ${lessons.length} lessons to migrate\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const lesson of lessons) {
    const key = `videos/${lesson.id}.mp4`;
    console.log(`[${lessons.indexOf(lesson) + 1}/${lessons.length}] ${lesson.title}`);

    try {
      // Skip if already uploaded
      if (await objectExists(key)) {
        console.log(`  Already in R2 — updating DB ref`);
        skipped++;
      } else {
        await downloadAndUpload(lesson.videoUrl, key);
      }

      // Update DB to use R2 key
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { videoUrl: `r2:${key}` },
      });

      console.log(`  DB updated → r2:${key}\n`);
      success++;
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
      failed++;
    }
  }

  console.log('─'.repeat(50));
  console.log(`Done: ${success} migrated, ${skipped} already existed, ${failed} failed`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
