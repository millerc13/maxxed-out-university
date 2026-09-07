'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, Handshake, MessageCircle, Youtube, Instagram, Facebook, CheckCircle2 } from 'lucide-react';

const SOCIALS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@toddpultzofficial', Icon: Youtube },
  { label: 'Instagram', href: 'https://www.instagram.com/toddpultzofficial', Icon: Instagram },
  { label: 'Facebook', href: 'https://www.facebook.com/todd.pultz', Icon: Facebook },
];

type Intent = 'connect' | 'social';

const INPUT =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-[#0000FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0000FF]/20';

export function ConnectClient() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [sending, setSending] = useState<Intent | null>(null);
  const [done, setDone] = useState<Intent | null>(null);
  const [smsSent, setSmsSent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = async (intent: Intent) => {
    setError(null);
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (phone.replace(/\D/g, '').length < 10) { setError('Enter a valid phone number'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address'); return; }
    setSending(intent);
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, intent, company }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong — try again'); return; }
      setSmsSent(data.smsSent !== false);
      setDone(intent);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Network error — try again');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-md px-5 pb-10 pt-8">

        {/* Header */}
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0000FF]">
          Maxxed Out
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-[1.1] text-gray-900">
          Great meeting you
          <br />in Kansas.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
          Drop your info and choose how you want to connect with Todd.
        </p>

        {done ? (
          /* ---------- success ---------- */
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/60">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
              {done === 'connect' ? (
                <div>
                  <p className="text-lg font-bold text-gray-900">You&apos;re on the list, {name.split(' ')[0]}!</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Todd or his team will be in touch soon. We just sent a confirmation to your phone.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-bold text-gray-900">Check your texts, {name.split(' ')[0]}!</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {smsSent ? "We just texted you Todd's links. They're also right here:" : "Here are Todd's links:"}
                  </p>
                </div>
              )}
            </div>
            {done === 'social' ? (
              <div className="mt-4 space-y-2.5">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 font-semibold text-gray-800 transition-colors active:bg-blue-50"
                  >
                    <Icon className="h-5 w-5 text-[#0000FF]" />
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          /* ---------- form ---------- */
          <div className="mt-6">
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={INPUT} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Cell phone" type="tel" autoComplete="tel" inputMode="tel" className={INPUT} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" inputMode="email" className={INPUT} />
              {/* Honeypot — humans never see it */}
              <input value={company} onChange={(e) => setCompany(e.target.value)} name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            </div>

            {error ? (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>
            ) : null}

            <div className="mt-5 space-y-3">
              <button
                onClick={() => submit('connect')}
                disabled={sending !== null}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#0000FF] px-4 py-4 text-[16px] font-bold text-white shadow-lg shadow-blue-600/25 transition-colors active:bg-[#0000CC] disabled:opacity-60"
              >
                {sending === 'connect' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Handshake className="h-5 w-5" />}
                Work directly with Todd
              </button>
              <button
                onClick={() => submit('social')}
                disabled={sending !== null}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-[16px] font-bold text-gray-900 transition-colors active:border-[#0000FF] active:bg-blue-50 disabled:opacity-60"
              >
                {sending === 'social' ? <Loader2 className="h-5 w-5 animate-spin text-[#0000FF]" /> : <MessageCircle className="h-5 w-5 text-[#0000FF]" />}
                Text me Todd&apos;s socials
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-400">
              By submitting, you agree to receive text messages from Maxxed Out.
              Msg &amp; data rates may apply. Reply STOP to opt out.
            </p>
          </div>
        )}

        {/* Flyer — supporting, below the action */}
        <div className="mt-8">
          <Image
            src="/images/kansas-flyer.jpg"
            alt="Becoming The Better You Tour — Leavenworth, Kansas. How to Create Wealth Through Vertical Integration and Real Estate with Todd Pultz."
            width={1000}
            height={1000}
            className="w-full rounded-2xl border border-gray-100 shadow-sm"
          />
          <p className="mt-4 text-center text-xs font-medium tracking-wide text-gray-400">
            MAXXED OUT · Real Estate | Business | Freedom
          </p>
        </div>
      </main>
    </div>
  );
}
