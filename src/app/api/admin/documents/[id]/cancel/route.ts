import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { cancelDocument } from '@/lib/esign-flow';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 });
  }

  let reason: string | undefined;
  try {
    const body = await request.json().catch(() => null);
    if (body && typeof body.reason === 'string') reason = body.reason.trim() || undefined;
  } catch {
    // body optional
  }

  try {
    await cancelDocument(id, session.user.id, reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cancel failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
