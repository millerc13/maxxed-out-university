import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setSetting } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Whitelist of settable keys. Anything else is rejected so a stray PUT
 *  can't create arbitrary rows. Add new keys here as they're introduced. */
const ALLOWED_KEYS = new Set(['internalNotificationsEnabled', 'testPhoneOverride']);

/** GET /api/admin/settings/[key] — return one setting (or null if absent). */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await context.params;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: `Unknown key "${key}"` }, { status: 400 });
  }

  const row = await prisma.setting.findUnique({
    where: { key },
    select: { key: true, value: true, updatedAt: true },
  });
  return NextResponse.json({ setting: row });
}

/** PUT /api/admin/settings/[key] — upsert the value. Body: { value: string }. */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await context.params;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: `Unknown key "${key}"` }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body?.value !== 'string') {
    return NextResponse.json({ error: 'value (string) is required' }, { status: 400 });
  }

  await setSetting(key, body.value);
  return NextResponse.json({ ok: true, key, value: body.value });
}
