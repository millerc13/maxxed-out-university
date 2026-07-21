'use client';

import { useState } from 'react';

/**
 * The actual send button on the signed one-tap page. Kept as an explicit tap
 * (rather than firing on page load) so link previews and mobile prefetch can't
 * text an applicant by accident.
 */
export function CohortSendConfirm({
  id,
  token,
  promo,
  channel = 'both',
  firstName,
}: {
  id: string;
  token: string;
  promo: boolean;
  channel?: 'sms' | 'email' | 'both';
  firstName: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function send() {
    setState('sending');
    try {
      const res = await fetch(`/api/cohort-application/${id}/send-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promo, token, channel }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || d.smsError || 'Send failed');
      setState('done');
      const part = (v: boolean | null, label: string) =>
        v === null ? null : `${label} ${v ? 'sent ✓' : 'FAILED ✗'}`;
      setMsg([part(d.sms, 'Text'), part(d.email, 'Email')].filter(Boolean).join(' · '));
    } catch (e) {
      setState('error');
      setMsg(e instanceof Error ? e.message : 'Send failed');
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-5 rounded-xl bg-emerald-50 p-5 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-2 text-lg font-extrabold text-emerald-900">Sent to {firstName}</p>
        <p className="mt-1 text-sm font-semibold text-emerald-700">{msg}</p>
        <p className="mt-3 text-xs text-emerald-600">You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        onClick={send}
        disabled={state === 'sending'}
        className={`w-full rounded-xl px-6 py-4 text-base font-extrabold text-white shadow-lg transition disabled:opacity-60 ${
          promo ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {state === 'sending'
          ? 'Sending…'
          : `${channel === 'email' ? '✉️ Email' : '📲 Text'} ${firstName} the ${promo ? 'Coupon' : 'Checkout'}`}
      </button>
      {state === 'error' && (
        <p className="mt-2 text-center text-sm font-semibold text-red-600">{msg}</p>
      )}
    </div>
  );
}
