import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { resendDocument } from '@/lib/esign-flow';

export async function POST(
  _request: NextRequest,
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

  try {
    await resendDocument(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
