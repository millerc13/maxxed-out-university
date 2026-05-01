/**
 * In-repo SMS notification path for lead / sale alerts.
 *
 * Today this calls the GHL Conversations API using the same `GHL_API_KEY`
 * + `GHL_LOCATION_ID` env vars already configured for tagging / opportunity
 * creation — no new credentials needed. The GHL number that's already
 * provisioned for the location is the "from" number.
 *
 * To swap to Twilio direct (or any other provider) later: change the body
 * of `sendSms()`. The orchestrator (`notifyRecipients`) doesn't care.
 */

import { prisma } from './prisma';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

/** Normalize a phone string to E.164 (e.g. "9375551234" -> "+19375551234").
 *  GHL silently no-ops SMS sends to non-E.164 numbers — must normalize. */
export function normalizePhoneE164(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return trimmed; // unknown shape — pass through, caller handles failures
}

interface SendResult {
  ok: boolean;
  error?: string;
  /** GHL contact ID we used (cached after first send). */
  contactId?: string;
}

/**
 * Send a single SMS to one phone number. Caches the GHL contact ID
 * back to the recipient row so subsequent sends don't re-upsert.
 */
export async function sendSmsToRecipient(recipient: {
  id: string;
  phone: string;
  label?: string | null;
  ghlContactId?: string | null;
}, body: string): Promise<SendResult> {
  const apiKey = process.env.GHL_API_KEY?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!apiKey || !locationId) {
    return { ok: false, error: 'GHL not configured' };
  }

  const e164 = normalizePhoneE164(recipient.phone);
  if (!e164) return { ok: false, error: 'Invalid phone number' };

  // Step 1 — make sure we have a GHL contactId. Use the cached one if
  // present, otherwise upsert by phone so SMS-only recipients (no email)
  // still resolve to a valid contact.
  let contactId = recipient.ghlContactId ?? '';
  if (!contactId) {
    try {
      const upsertRes = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: GHL_API_VERSION,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId,
          phone: e164,
          firstName: recipient.label ?? 'Notification recipient',
          tags: ['notification-recipient'],
        }),
        cache: 'no-store',
      });
      const upsertJson = (await upsertRes.json().catch(() => ({}))) as {
        contact?: { id?: string };
      };
      if (!upsertRes.ok || !upsertJson.contact?.id) {
        return {
          ok: false,
          error: `GHL contact upsert failed (${upsertRes.status})`,
        };
      }
      contactId = upsertJson.contact.id;
      // Cache it on the recipient row so we don't re-upsert next time.
      try {
        await prisma.notificationRecipient.update({
          where: { id: recipient.id },
          data: { ghlContactId: contactId },
        });
      } catch {
        /* cache miss is ok — next send will re-resolve */
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Upsert error',
      };
    }
  }

  // Step 2 — send the SMS through the GHL conversations API.
  // If the cached contactId is stale (GHL returns 400/404 "contact not
  // found"), invalidate the cache, re-upsert by phone, and retry once.
  // Without this, every notify-lead silently fails after a contact gets
  // deleted/merged in GHL.
  const sendOnce = async (cid: string) => {
    const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: GHL_API_VERSION,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'SMS', contactId: cid, message: body }),
      cache: 'no-store',
    });
    return res;
  };

  try {
    let res = await sendOnce(contactId);

    // Stale-cache recovery — GHL returns 400 with "Contact not found" when
    // the cached id no longer exists. Drop the cache, re-upsert by phone,
    // retry the send once.
    if (!res.ok && (res.status === 400 || res.status === 404)) {
      const errText = await res.clone().text().catch(() => '');
      if (/contact not found/i.test(errText) || /not\s+found/i.test(errText)) {
        console.warn('[sms] Cached ghlContactId stale — re-upserting by phone', {
          recipientId: recipient.id,
          staleContactId: contactId,
        });
        try {
          await prisma.notificationRecipient.update({
            where: { id: recipient.id },
            data: { ghlContactId: null },
          });
        } catch { /* cache clear failure is non-fatal */ }

        // Re-upsert by phone to get a fresh contactId.
        const upsertRes = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Version: GHL_API_VERSION,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId,
            phone: e164,
            firstName: recipient.label ?? 'Notification recipient',
            tags: ['notification-recipient'],
          }),
          cache: 'no-store',
        });
        const upsertJson = (await upsertRes.json().catch(() => ({}))) as {
          contact?: { id?: string };
        };
        const freshId = upsertJson.contact?.id;
        if (!upsertRes.ok || !freshId) {
          return {
            ok: false,
            error: `GHL re-upsert after stale cache failed (${upsertRes.status})`,
          };
        }
        contactId = freshId;
        try {
          await prisma.notificationRecipient.update({
            where: { id: recipient.id },
            data: { ghlContactId: contactId },
          });
        } catch { /* re-cache failure is non-fatal */ }

        // Retry the send with the fresh id.
        res = await sendOnce(contactId);
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        error: `GHL send failed (${res.status}): ${text.slice(0, 200)}`,
        contactId,
      };
    }
    return { ok: true, contactId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Send error',
      contactId,
    };
  }
}

/** Known notification source identifiers. Used by recipients to scope
 *  which traffic they get alerts for. The string literals here must
 *  match the values passed by callers (funnel /api/apply uses program
 *  detected from Host header; university /api/apply uses 'university'). */
export type NotificationSource =
  | 'blueprint'
  | 'mentorship'
  | 'donewithyou'
  | 'university'
  | string; // allow future sources without a schema change

/**
 * Fan out a notification SMS to every active recipient that opted into
 * this event AND this source. Recipients with `sources = []` receive
 * alerts from ALL sources (default); recipients with a non-empty
 * sources array only get alerts whose source is in their list.
 *
 * Returns per-recipient results so the caller can log / surface them.
 * Never throws — callers can fire-and-forget.
 */
export async function notifyRecipients(
  event: 'lead' | 'sale',
  body: string,
  source?: NotificationSource
): Promise<Array<{ recipientId: string; phone: string; label: string | null; ok: boolean; error?: string }>> {
  const eventClause =
    event === 'lead' ? { notifyOnLead: true } : { notifyOnSale: true };

  // Fetch all active recipients for this event, then filter by source
  // in JS — Prisma's array filters can be finicky and the recipient
  // count is small, so this is cheaper than fighting the query DSL.
  let recipients: Array<{
    id: string;
    phone: string;
    label: string | null;
    sources: string[];
    ghlContactId: string | null;
  }> = [];
  try {
    recipients = await prisma.notificationRecipient.findMany({
      where: { active: true, ...eventClause },
      select: {
        id: true,
        phone: true,
        label: true,
        sources: true,
        ghlContactId: true,
      },
    });
  } catch (err) {
    console.error('[sms] failed to load recipients', err);
    return [];
  }

  // source=undefined means "broadcast to all active recipients regardless
  //   of their per-source subscription" (used by the test-send button).
  // source=string means "only recipients whose sources array is empty
  //   (subscribe-all) OR explicitly includes this source".
  const matched = source
    ? recipients.filter((r) => r.sources.length === 0 || r.sources.includes(source))
    : recipients;

  if (matched.length === 0) {
    console.log(
      `[sms] No active recipients for event=${event} source=${source ?? '(any)'} — skipping ` +
        `(${recipients.length} total recipients in DB, none matched filter)`
    );
    return [];
  }

  console.log(
    `[sms] Notifying ${matched.length} recipient(s) for event=${event} source=${source ?? '(any)'}`
  );
  const results = await Promise.all(
    matched.map(async (r) => {
      const out = await sendSmsToRecipient(r, body);
      return {
        recipientId: r.id,
        phone: r.phone,
        label: r.label,
        ok: out.ok,
        error: out.error,
      };
    })
  );
  for (const r of results) {
    if (r.ok) {
      console.log(`[sms] ✓ ${r.label ?? r.phone}`);
    } else {
      console.error(`[sms] ✗ ${r.label ?? r.phone}: ${r.error}`);
    }
  }
  return results;
}
