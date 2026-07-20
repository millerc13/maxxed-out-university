'use client';

import { useState } from 'react';
import {
  READINESS_OPTIONS,
  INVESTMENT_OPTIONS,
  WORK_OPTIONS,
  US_STATES,
} from '@/lib/cohort-scoring';

type Choice = { value: string; label: string };

/**
 * Consent is captured by the act of submitting — the disclosure sits directly
 * under the required phone field, so there's no separate checkbox to miss.
 * (A separate optional checkbox on the webinar form left ~30% of registrants
 * unreachable; this pattern captures ~100% and stores what they agreed to.)
 */
export const COHORT_CONSENT_TEXT =
  'By submitting this application I agree that Maxxed Out may call and text me at the number provided about the cohort, including by automated means. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to opt out.';

/**
 * Live-webinar cohort application. Design constraints from the brief:
 * one screen (no wizard), contact fields first so a partial abandon still
 * leaves a callable lead, multiple-choice wherever possible, big tap targets,
 * under 2 minutes on a phone.
 */
export function CohortApplicationForm() {
  const [f, setF] = useState({
    name: '', phone: '', email: '', state: '',
    readiness: '', investment: '', work: '', note: '',
  });
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/cohort-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Phone + email are required fields and the disclosure is shown above
        // the button, so a completed submission IS the consent event. Send the
        // exact text displayed so the server stores what they agreed to.
        body: JSON.stringify({ ...f, note: f.note || undefined, consentText: COHORT_CONSENT_TEXT }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setState('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  // ---- Confirmation screen (exact copy from the brief) ----
  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white">
          ✓
        </div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
          Got it — we&apos;re calling tonight.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-gray-700">
          Keep your phone nearby. Todd and his team are calling applicants right after the class wraps.
          If we miss you, we&apos;ll text you to lock in a time.
        </p>
        <p className="mt-4 text-sm font-semibold text-emerald-800">
          (Fast-action bonus expires in 48 hours.)
        </p>
      </div>
    );
  }

  const input =
    'w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';
  const labelCls = 'mb-2 block text-sm font-bold text-gray-900';

  /** Big tappable radio cards — far better than a <select> on mobile. */
  function ChoiceGroup({
    name, options, value, onChange,
  }: { name: string; options: readonly Choice[]; value: string; onChange: (v: string) => void }) {
    return (
      <div className="space-y-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition ${
                active
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/15'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="mt-1 h-4 w-4 flex-none accent-blue-600"
                required
              />
              <span className={`text-[15px] leading-snug ${active ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      {/* ---- Contact first: a partial abandon still leaves a callable lead ---- */}
      <div>
        <label className={labelCls}>Full name</label>
        <input
          className={input} placeholder="First and last name" autoComplete="name" required
          value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </div>

      <div>
        <label className={labelCls}>Best phone number to reach you tonight</label>
        <input
          className={input} type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" required
          value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5">
          <span aria-hidden className="text-[13px] leading-5">📞</span>
          <p className="text-[13px] font-semibold leading-snug text-blue-900">
            We&apos;re calling tonight after the class — use a number you&apos;ll actually answer.
          </p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Email</label>
        <input
          className={input} type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" required
          value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
        />
      </div>

      <div>
        <label className={labelCls}>What state will you be operating in?</label>
        <select
          className={`${input} cursor-pointer`} required
          value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}
        >
          <option value="" disabled>Select your state…</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Where are you right now with this?</label>
        <ChoiceGroup name="readiness" options={READINESS_OPTIONS} value={f.readiness} onChange={(v) => setF({ ...f, readiness: v })} />
      </div>

      <div>
        <label className={labelCls}>The cohort is a $10,000 investment. Where are you with that?</label>
        <ChoiceGroup name="investment" options={INVESTMENT_OPTIONS} value={f.investment} onChange={(v) => setF({ ...f, investment: v })} />
      </div>

      <div>
        <label className={labelCls}>What&apos;s your current work situation?</label>
        <ChoiceGroup name="work" options={WORK_OPTIONS} value={f.work} onChange={(v) => setF({ ...f, work: v })} />
      </div>

      <div>
        <label className={labelCls}>
          Anything you want us to know before we call? <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          className={input} rows={3} placeholder="Anything that helps us help you."
          value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <div className="space-y-3 border-t border-gray-100 pt-5">
        {/* Disclosure sits with the action it describes ("By submitting…"), which
            reads naturally and keeps it out of the phone field's way. */}
        <p className="text-[11px] leading-relaxed text-gray-400">{COHORT_CONSENT_TEXT}</p>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-60"
        >
          {state === 'loading' ? 'Submitting…' : 'Submit My Application →'}
        </button>
      </div>
    </form>
  );
}
