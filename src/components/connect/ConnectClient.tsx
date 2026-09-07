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
    } catch {
      setError('Network error — try again');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 sm:py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12">

        {/* Flyer */}
        <div className="w-full max-w-sm shrink-0 lg:max-w-md">
          <Image
            src="/images/kansas-flyer.jpg"
            alt="Becoming The Better You Tour — Leavenworth, Kansas. How to Create Wealth Through Vertical Integration and Real Estate with Todd Pultz."
            width={1000}
            height={1000}
            priority
            className="w-full rounded-2xl shadow-2xl shadow-blue-900/40 ring-1 ring-white/10"
          />
        </div>

        {/* Card */}
        <div className="w-full max-w-md">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Becoming The Better You Tour · Kansas
          </p>
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Let&apos;s keep it{' '}
            <span className="text-[#4D6BFF]">going.</span>
          </h1>

          {done ? (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
                {done === 'connect' ? (
                  <div>
                    <p className="text-lg font-bold text-gray-900">You&apos;re on the list, {name.split(' ')[0]}!</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Todd or his team will be in touch soon. Watch your phone — we just sent you a confirmation text.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-gray-900">Check your texts, {name.split(' ')[0]}!</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {smsSent
                        ? "We just texted you Todd's links. They're also right here:"
                        : "Here are Todd's links:"}
                    </p>
                  </div>
                )}
              </div>
              {done === 'social' ? (
                <div className="mt-4 space-y-2">
                  {SOCIALS.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-800 transition-colors hover:border-[#0000FF] hover:bg-blue-50"
                    >
                      <Icon className="h-5 w-5 text-[#0000FF]" />
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-xl">
              <p className="text-sm font-medium text-gray-600">
                Drop your info, then pick how you want to connect with Todd.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[16px] focus:border-[#0000FF] focus:outline-none focus:ring-1 focus:ring-[#0000FF]"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Cell phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[16px] focus:border-[#0000FF] focus:outline-none focus:ring-1 focus:ring-[#0000FF]"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[16px] focus:border-[#0000FF] focus:outline-none focus:ring-1 focus:ring-[#0000FF]"
                />
                {/* Honeypot — humans never see it */}
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
              </div>

              {error ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <div className="mt-4 space-y-2.5">
                <button
                  onClick={() => submit('connect')}
                  disabled={sending !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0000FF] px-4 py-3.5 font-bold text-white transition-colors hover:bg-[#0000CC] disabled:opacity-60"
                >
                  {sending === 'connect' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Handshake className="h-5 w-5" />}
                  Work directly with Todd
                </button>
                <button
                  onClick={() => submit('social')}
                  disabled={sending !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0000FF] px-4 py-3 font-bold text-[#0000FF] transition-colors hover:bg-blue-50 disabled:opacity-60"
                >
                  {sending === 'social' ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                  Text me Todd&apos;s socials
                </button>
              </div>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-400">
                By submitting, you agree to receive text messages from Maxxed Out.
                Msg &amp; data rates may apply. Reply STOP to opt out.
              </p>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-white/40">
            MAXXED OUT · Real Estate | Business | Freedom
          </p>
        </div>
      </div>
    </div>
  );
}
