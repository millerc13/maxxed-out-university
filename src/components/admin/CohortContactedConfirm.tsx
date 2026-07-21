'use client';

import { useState } from 'react';

/**
 * Explicit tap, same as the send pages — a link unfurler or mobile prefetch
 * hitting the GET must not collapse a lead card nobody has actually worked.
 */
export function CohortContactedConfirm({
  id,
  by,
  token,
  name,
}: {
  id: string;
  by: string;
  token: string;
  name: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function mark() {
    setState('sending');
    try {
      const res = await fetch(`/api/cohort-application/${id}/contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by, token }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || 'Failed');
      setState('done');
      setMsg(
        d.already
          ? `Already marked by ${d.contactedBy}`
          : d.slack?.collapsed
            ? 'Moved to #cohort-contacted'
            : d.slack?.error
              ? `Saved — Slack: ${d.slack.error}`
              : 'Saved'
      );
    } catch (e) {
      setState('error');
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-5 rounded-xl bg-emerald-50 p-5 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-2 text-lg font-extrabold text-emerald-900">{name} marked contacted</p>
        <p className="mt-1 text-sm font-semibold text-emerald-700">{msg}</p>
        <p className="mt-3 text-xs text-emerald-600">You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        onClick={mark}
        disabled={state === 'sending'}
        className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {state === 'sending' ? 'Marking…' : `✅ Mark ${name} contacted`}
      </button>
      {state === 'error' && (
        <p className="mt-2 text-center text-sm font-semibold text-red-600">{msg}</p>
      )}
    </div>
  );
}
