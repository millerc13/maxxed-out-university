import { NextRequest, NextResponse } from 'next/server';
import { upsertGhlContactByPhone, sendGhlSms } from '@/lib/ghl';
import { normalizePhoneE164 } from '@/lib/sms';

/**
 * POST /api/connect — Kansas event QR funnel (connect.maxxedout.com).
 *
 * Creates/updates a GHL contact from the two-option form:
 *  - intent "connect" → tag `kansas-connect`, text the lead a
 *    "team will reach out" confirmation, and text Todd the lead's
 *    name + number.
 *  - intent "social"  → tag `kansas-social`, text the lead Todd's
 *    YouTube / Instagram / Facebook links.
 *
 * Public + unauthenticated by nature (QR scan at a live event), so it
 * carries a honeypot field and a small in-memory rate limit to keep
 * SMS-pump abuse off the GHL number.
 */

const SOCIALS_SMS = [
  "It's Todd Pultz — great connecting! Follow me here:",
  'YouTube: https://www.youtube.com/@toddpultzofficial',
  'Instagram: https://www.instagram.com/toddpultzofficial',
  'Facebook: https://www.facebook.com/todd.pultz',
].join('\n');

const CONNECT_SMS =
  "This is Todd Pultz's team — we got your request. Someone from our team will reach out shortly to talk about working directly with Todd!";

// Todd's GHL contact (btttillc@gmail.com, +19374786858). Overridable so
// lead alerts can be pointed at a tester without a code change.
const NOTIFY_CONTACT_ID =
  process.env.CONNECT_NOTIFY_CONTACT_ID ?? 'zUTJGbQUix5h1TJicjG9';

const TAG_BY_INTENT: Record<string, string> = {
  connect: 'kansas-connect',
  social: 'kansas-social',
};

// ---- tiny in-memory rate limiter (per warm lambda instance) ----
const hits = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return true;
  arr.push(now);
  hits.set(key, arr);
  return false;
}

async function addTagsV2(contactId: string, tags: string[]): Promise<boolean> {
  const apiKey = process.env.GHL_API_KEY?.trim();
  if (!apiKey) return false;
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/tags`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim().slice(0, 80);
    const rawPhone = String(body.phone ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 120);
    const intent = String(body.intent ?? '');
    const honeypot = String(body.company ?? '');

    // Bots fill every field; humans never see this one.
    if (honeypot) return NextResponse.json({ success: true });

    const tag = TAG_BY_INTENT[intent];
    if (!tag) return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const phone = normalizePhoneE164(rawPhone);
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (rateLimited(`ip:${ip}`, 8, 10 * 60_000) || rateLimited(`ph:${phone}:${intent}`, 2, 5 * 60_000)) {
      return NextResponse.json({ error: 'Too many requests — try again in a few minutes' }, { status: 429 });
    }

    const [firstName, ...rest] = name.split(/\s+/);
    const contactId = await upsertGhlContactByPhone({
      phone,
      email,
      firstName,
      lastName: rest.join(' ') || null,
    });
    if (!contactId) {
      return NextResponse.json({ error: 'Could not save your info — try again' }, { status: 502 });
    }

    const tagged = await addTagsV2(contactId, [tag]);

    // Text the lead. Failure here is non-fatal for the page (their
    // contact is already saved + tagged), but reported so the UI can
    // show the socials on-screen as fallback.
    let smsSent = false;
    try {
      await sendGhlSms(contactId, intent === 'social' ? SOCIALS_SMS : CONNECT_SMS);
      smsSent = true;
    } catch (err) {
      console.error('[connect] lead SMS failed', { contactId, error: err instanceof Error ? err.message : err });
    }

    // "Work with Todd" leads ping Todd directly with name + number.
    if (intent === 'connect') {
      try {
        await sendGhlSms(
          NOTIFY_CONTACT_ID,
          `New lead: ${name} (${phone}, ${email}) wants to work with you. Tagged kansas-connect in GHL.`
        );
      } catch (err) {
        console.error('[connect] Todd alert SMS failed', { error: err instanceof Error ? err.message : err });
      }
    }

    console.log('[connect] lead captured', { contactId, tag, tagged, smsSent });
    return NextResponse.json({ success: true, smsSent });
  } catch (error) {
    console.error('[connect] failed', error);
    return NextResponse.json({ error: 'Something went wrong — try again' }, { status: 500 });
  }
}
