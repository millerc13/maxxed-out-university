import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getConversationHistoryByContactId,
  searchGhlContactByEmail,
  type GHLContactDetail,
  type GHLMessage,
} from '@/lib/ghl';

export const runtime = 'nodejs';

/**
 * Admin-gated proxy for the conversation viewer.
 *
 *   GET /api/admin/ghl/conversations?contactId=...
 *   GET /api/admin/ghl/conversations?email=...
 *
 * Returns the merged SMS + email thread from GHL for the resolved contact.
 * Read-only — never sends messages. The GHL API key never leaves the server.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
    return NextResponse.json(
      { error: 'GHL not configured (GHL_API_KEY / GHL_LOCATION_ID missing)' },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const contactIdParam = searchParams.get('contactId')?.trim() || '';
  const emailParam = searchParams.get('email')?.trim() || '';

  if (!contactIdParam && !emailParam) {
    return NextResponse.json(
      { error: 'contactId or email is required' },
      { status: 400 }
    );
  }

  // Resolve contactId from email when not provided directly.
  let contactId = contactIdParam;
  let resolvedContact: GHLContactDetail | null = null;
  if (!contactId && emailParam) {
    try {
      resolvedContact = await searchGhlContactByEmail(emailParam);
      if (!resolvedContact) {
        return NextResponse.json(
          { contact: null, messages: [], error: 'No GHL contact found for that email' },
          {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
          }
        );
      }
      contactId = resolvedContact.id;
    } catch (err) {
      return NextResponse.json(
        {
          contact: null,
          messages: [],
          error: err instanceof Error ? err.message : 'Lookup failed',
        },
        { status: 502 }
      );
    }
  }

  const result = await getConversationHistoryByContactId(contactId);
  // Surface a 200 with the partial result so the viewer can render the
  // contact header + an empty state when there are no messages.
  return NextResponse.json(
    {
      contact: result.contact ?? resolvedContact,
      messages: result.messages as GHLMessage[],
      error: result.error ?? null,
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  );
}
