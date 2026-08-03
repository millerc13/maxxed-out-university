'use client';

import { useState, useTransition } from 'react';
import { ddLeadMarkDone, ddLeadSend, type DdSendChannel, type DdSendKind } from './actions';

interface Props {
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  initialContacted: boolean;
  /** Rendered server-side so prices live in one place (cohort-checkout). */
  labels: { checkout: string; coupon: string };
}

const BUTTONS: Array<{
  kind: DdSendKind;
  channel: DdSendChannel;
  label: string;
  confirmVerb: string;
}> = [
  { kind: 'checkout', channel: 'sms', label: '📲 Text Checkout', confirmVerb: 'Text the checkout link' },
  { kind: 'checkout', channel: 'email', label: '✉️ Email Checkout', confirmVerb: 'Email the checkout link' },
  { kind: 'coupon', channel: 'sms', label: '📲 Text Coupon', confirmVerb: 'Text the coupon code' },
  { kind: 'coupon', channel: 'email', label: '✉️ Email Coupon', confirmVerb: 'Email the coupon code' },
];

export function LeadSendButtons({
  contactId,
  name,
  phone,
  email,
  initialContacted,
  labels,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [contacted, setContacted] = useState(initialContacted);
  const [doneBusy, setDoneBusy] = useState(false);

  const toggleDone = () => {
    const next = !contacted;
    if (next && !window.confirm(`Mark ${name} as contacted?`)) return;
    setDoneBusy(true);
    setStatus(null);
    startTransition(async () => {
      const res = await ddLeadMarkDone({ contactId, done: next });
      if (res.ok) setContacted(next);
      else setStatus(res);
      setDoneBusy(false);
    });
  };

  const detail = (kind: DdSendKind) => (kind === 'coupon' ? labels.coupon : labels.checkout);

  const fire = (kind: DdSendKind, channel: DdSendChannel, confirmVerb: string) => {
    const target = channel === 'sms' ? phone : email;
    if (!target) return;
    if (!window.confirm(`${confirmVerb} to ${name}?\n\n${detail(kind)}\n→ ${target}`)) return;
    const key = `${kind}:${channel}`;
    setBusyKey(key);
    setStatus(null);
    startTransition(async () => {
      const res = await ddLeadSend({ contactId, name, phone, email, kind, channel });
      setStatus(res);
      setBusyKey(null);
    });
  };

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-1.5">
        {BUTTONS.map(({ kind, channel, label, confirmVerb }) => {
          const disabled =
            pending || (channel === 'sms' && !phone) || (channel === 'email' && !email);
          const key = `${kind}:${channel}`;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => fire(kind, channel, confirmVerb)}
              className="rounded-lg bg-gray-100 py-2.5 text-[12px] font-bold text-gray-700 active:bg-gray-200 disabled:opacity-40"
            >
              {busyKey === key ? 'Sending…' : label}
            </button>
          );
        })}
      </div>
      {contacted ? (
        <div className="mt-1.5 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
          <span className="text-[13px] font-bold text-emerald-700">✅ Contacted</span>
          <button
            type="button"
            disabled={doneBusy}
            onClick={toggleDone}
            className="text-[12px] font-semibold text-emerald-600 underline disabled:opacity-40"
          >
            {doneBusy ? '…' : 'Undo'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={doneBusy}
          onClick={toggleDone}
          className="mt-1.5 w-full rounded-xl bg-gray-900 py-2.5 text-center text-[13px] font-bold text-white active:bg-gray-700 disabled:opacity-40"
        >
          {doneBusy ? 'Saving…' : '✅ Mark as Contacted'}
        </button>
      )}
      {status && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-[12px] font-semibold ${
            status.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {status.ok ? '✅' : '⚠️'} {status.message}
        </p>
      )}
    </div>
  );
}
