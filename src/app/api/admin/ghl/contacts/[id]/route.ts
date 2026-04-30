import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Delete a GHL contact by id. Used by /admin/messages to refine the leads
 * list. Admin-only. Does NOT touch the local university User row — only the
 * GHL contact + their conversations.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Contact id required' }, { status: 400 });
  }

  const apiKey = process.env.GHL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GHL_API_KEY is not configured' },
      { status: 503 }
    );
  }

  const res = await fetch(`https://services.leadconnectorhq.com/contacts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    },
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    console.error('[GHL] delete contact failed', { id, status: res.status, body: text.slice(0, 300) });
    return NextResponse.json(
      { error: `GHL responded ${res.status}`, detail: text.slice(0, 300) },
      { status: res.status === 404 ? 404 : 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
