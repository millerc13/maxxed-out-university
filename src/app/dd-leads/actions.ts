'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  DD_LEADS_COOKIE,
  ddLeadsCookieValue,
  verifyDdLeadsCookie,
  verifyDdLeadsPassword,
  setDdContactedTag,
  bustDdLeadsCache,
  DD_OVERRIDE_COOKIE,
  parseOverrideCookie,
} from '@/lib/dd-leads';
import { sendCohortCheckout } from '@/lib/cohort-send';

export async function ddLeadsLogin(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  if (!verifyDdLeadsPassword(password)) {
    redirect('/dd-leads?error=1');
  }
  const value = ddLeadsCookieValue();
  if (!value) redirect('/dd-leads?error=1');
  const jar = await cookies();
  jar.set(DD_LEADS_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days — sales guy shouldn't retype weekly
    path: '/dd-leads',
  });
  redirect('/dd-leads');
}

export type DdSendKind = 'checkout' | 'coupon';
export type DdSendChannel = 'sms' | 'email';

export interface DdSendResult {
  ok: boolean;
  message: string;
}

/**
 * Send the Medicaid cohort checkout / coupon link to a DD
 * lead, same messages the Slack closer buttons send (cohort-send). The lead
 * is a raw GHL contact — sendCohortCheckout's CohortApplication audit stamp
 * no-ops for them (its update is best-effort) and SMS goes out through the
 * GHL conversations API using the contact id we already have.
 */
export async function ddLeadSend(input: {
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  kind: DdSendKind;
  channel: DdSendChannel;
}): Promise<DdSendResult> {
  const jar = await cookies();
  if (!verifyDdLeadsCookie(jar.get(DD_LEADS_COOKIE)?.value)) {
    return { ok: false, message: 'Not signed in — refresh and re-enter the password.' };
  }

  const { contactId, name, phone, email, kind, channel } = input;
  if (channel === 'sms' && !phone) return { ok: false, message: 'No phone on file.' };
  if (channel === 'email' && !email) return { ok: false, message: 'No email on file.' };

  const app = {
    id: contactId,
    name: name || 'there',
    phone: phone ?? '',
    email: email ?? '',
    status: 'called',
    closerNotes: null,
    ghlContactId: contactId,
  };

  try {
    const outcome = await sendCohortCheckout({ app, channel, withPromo: kind === 'coupon' });
    if (!outcome.ok) {
      return {
        ok: false,
        message: outcome.smsError ? `Send failed: ${outcome.smsError}` : 'Send failed.',
      };
    }
    return { ok: true, message: channel === 'sms' ? 'Text sent' : 'Email sent' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Send failed.' };
  }
}

/**
 * Toggle the "contacted" state for a lead. Stored as a GHL tag so the CRM
 * reflects it and every device sees the same state.
 */
export async function ddLeadMarkDone(input: {
  contactId: string;
  done: boolean;
}): Promise<DdSendResult> {
  const jar = await cookies();
  if (!verifyDdLeadsCookie(jar.get(DD_LEADS_COOKIE)?.value)) {
    return { ok: false, message: 'Not signed in — refresh and re-enter the password.' };
  }
  try {
    await setDdContactedTag(input.contactId, input.done);
    bustDdLeadsCache();
    // Mirror the toggle into a cookie so this device's next page load agrees
    // even when it lands on a different serverless instance (see dd-leads.ts).
    const entries = parseOverrideCookie(jar.get(DD_OVERRIDE_COOKIE)?.value).filter(
      (e) => e.id !== input.contactId
    );
    entries.push({ id: input.contactId, c: input.done ? 1 : 0, at: Date.now() });
    jar.set(DD_OVERRIDE_COOKIE, JSON.stringify(entries.slice(-60)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/dd-leads',
    });
    return { ok: true, message: input.done ? 'Marked contacted' : 'Marked not contacted' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Update failed.' };
  }
}
