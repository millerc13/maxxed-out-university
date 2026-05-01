'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Lock, X, AlertCircle, Sparkles } from 'lucide-react';

interface PayPageClientProps {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  coursePrice: number;
  courseThumbnail: string | null;
  shortDesc: string | null;
  checkoutBullets: string[];
  promoEnabled: boolean;
}

interface PromoState {
  code: string;
  finalPrice: number;
  message: string;
}

const ACCENT = '#0000FF';

export function PayPageClient({
  courseId,
  courseTitle,
  courseSlug,
  coursePrice,
  courseThumbnail,
  shortDesc,
  checkoutBullets,
  promoEnabled,
}: PayPageClientProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<PromoState | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  const finalPrice = promoApplied?.finalPrice ?? coursePrice;
  const formValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /^[^@]+@[^@]+\.[^@]+$/.test(email.trim()) &&
    phone.trim().length >= 7;

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoValidating(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/funnel/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, courseId }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setPromoError(json.error || 'Invalid code');
        return;
      }
      const newPrice: number = json.finalPrice ?? coursePrice;
      const savings = coursePrice - newPrice;
      setPromoApplied({
        code,
        finalPrice: newPrice,
        message: savings > 0 ? `${formatUsd(savings)} off applied` : 'Code applied',
      });
      setPromoInput('');
    } catch {
      setPromoError('Could not validate. Try again.');
    } finally {
      setPromoValidating(false);
    }
  };

  const removePromo = () => {
    setPromoApplied(null);
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setAlreadyOwned(false);

    try {
      const res = await fetch('/api/checkout/fanbasis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          guestEmail: email.trim(),
          guestName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          guestPhone: phone.trim(),
          promoCode: promoApplied?.code,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.alreadyOwned) {
        setAlreadyOwned(true);
        setSubmitError(json.error || 'You already own this course.');
        return;
      }
      if (!res.ok || !json.paymentLink) {
        setSubmitError(json.error || 'Could not start checkout. Try again.');
        return;
      }
      window.location.href = json.paymentLink;
    } catch {
      setSubmitError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Course summary card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="p-4 sm:p-5 flex items-start gap-4">
          {courseThumbnail && (
            <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden ring-1 ring-gray-200 bg-gray-50 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={courseThumbnail} alt={courseTitle} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">You&rsquo;re purchasing</p>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight mt-1">{courseTitle}</h1>
            {shortDesc && <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{shortDesc}</p>}
          </div>
        </div>
        {checkoutBullets.length > 0 && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
            <ul className="space-y-2">
              {checkoutBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-gray-700">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} strokeWidth={3} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 space-y-5">
          {/* Your info */}
          <div>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-500 mb-3">Your information</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Last name" required>
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Email" required>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Phone" required>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 555-5555"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
            </div>
          </div>

          {/* Promo code */}
          {promoEnabled && (
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-500 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Promo code
                <span className="text-[10px] font-medium tracking-normal normal-case text-gray-400">(optional)</span>
              </h2>
              {promoApplied ? (
                <div
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(0,0,255,0.05)', border: '1px solid rgba(0,0,255,0.15)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-4 h-4 shrink-0" style={{ color: ACCENT }} strokeWidth={3} />
                    <span className="font-black text-sm tracking-widest truncate" style={{ color: ACCENT }}>
                      {promoApplied.code}
                    </span>
                    <span className="text-[12px] text-gray-600 truncate">— {promoApplied.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removePromo}
                    className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 -mr-1"
                    aria-label="Remove promo code"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyPromo();
                      }
                    }}
                    placeholder="ENTER CODE"
                    autoCapitalize="characters"
                    className={`${inputClass} font-mono uppercase tracking-widest`}
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={promoValidating || !promoInput.trim()}
                    className="px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wide rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ background: '#0c1829' }}
                  >
                    {promoValidating ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {promoError && (
                <p className="text-[12px] text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {promoError}
                </p>
              )}
            </div>
          )}

          {/* Total */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-500">Total today</span>
            <div className="text-right">
              {promoApplied && finalPrice !== coursePrice && (
                <p className="text-xs text-gray-400 line-through font-semibold">{formatUsd(coursePrice)}</p>
              )}
              <p className="text-2xl font-black text-gray-900">{formatUsd(finalPrice)}</p>
            </div>
          </div>
        </div>

        {/* Errors */}
        {submitError && !alreadyOwned && (
          <div className="px-4 sm:px-6 pb-3">
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          </div>
        )}
        {alreadyOwned && (
          <div className="px-4 sm:px-6 pb-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-800 text-sm">
              <p>{submitError}</p>
              <a
                href="/login"
                className="inline-flex items-center gap-1 mt-2 text-[12px] font-bold uppercase tracking-wide underline hover:no-underline"
              >
                Go to login →
              </a>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-4 sm:px-6 pb-5">
          <button
            type="submit"
            disabled={!formValid || submitting}
            className="w-full py-4 font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer"
            style={{ background: '#0c1829', color: '#ffffff' }}
          >
            {submitting ? (
              'Redirecting to Fanbasis…'
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                Pay <span className="text-white/70">{formatUsd(finalPrice)}</span> with{' '}
                <img src="/images/new-fanbasis-white.png" alt="Fanbasis" className="h-5 w-auto" />
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-2 text-[11px] mt-2 text-gray-500">
            <Lock className="w-3 h-3" />
            <span>You&rsquo;ll be redirected to Fanbasis to enter card details</span>
          </div>
        </div>
      </form>

      <p className="text-[11px] text-center text-gray-400 mt-4 px-2">
        By continuing you agree to the Maxxed Out{' '}
        <a href="/terms" className="underline hover:text-gray-700">Terms</a> and{' '}
        <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>.
        Course slug: <span className="font-mono">{courseSlug}</span>
      </p>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-600 block mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
