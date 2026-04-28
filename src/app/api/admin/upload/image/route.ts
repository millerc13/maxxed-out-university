import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadPublicFile, R2_PUBLIC_BASE_URL } from '@/lib/r2';
import { randomBytes } from 'crypto';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!R2_PUBLIC_BASE_URL) {
    return NextResponse.json(
      { error: 'Image upload is not configured. Set R2_PUBLIC_BASE_URL.' },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}. Use PNG, JPEG, WebP, or GIF.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1_000_000).toFixed(1)}MB). Max 8MB.` },
      { status: 400 }
    );
  }

  // Optional folder hint (e.g. "courses", "lessons") — falls back to "misc".
  const folder = (formData.get('folder') as string | null)?.replace(/[^a-z0-9-]/gi, '') || 'misc';

  // {timestamp}-{random}.{ext} — sortable, collision-proof, and lets us keep
  // multiple historical thumbnails for a course without overwrites.
  const key = `images/${folder}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadPublicFile(key, buffer, file.type);
    return NextResponse.json({ url, key });
  } catch (err) {
    console.error('R2 upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
