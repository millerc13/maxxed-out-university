'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Check, Tag, X, Lock, ArrowRight, ChevronLeft } from 'lucide-react';

interface FunnelCheckoutProps {
  publishableKey: string;
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  courseSlug: string;
  courseThumbnail?: string | null;
  promoEnabled?: boolean;
  enabledProviders?: string[];
  accentColor?: string;
  isAuthenticated?: boolean;
  prefillEmail?: string | null;
  prefillName?: string | null;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function PaymentForm({
  courseTitle,
  coursePrice,
  finalPrice,
  courseSlug,
  contact,
  isExistingUser,
  isAuthenticated,
  onBack,
}: {
  courseTitle: string;
  coursePrice: number;
  finalPrice: number;
  courseSlug: string;
  contact: ContactInfo;
  isExistingUser: boolean;
  isAuthenticated: boolean;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'An error occurred');
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?courseSlug=${courseSlug}${isExistingUser ? '&existing=1' : ''}`,
        payment_method_data: {
          billing_details: {
            name: `${contact.firstName} ${contact.lastName}`.trim() || undefined,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
          },
        },
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    }
  }

  const hasDiscount = finalPrice < coursePrice;

  return (
    <form onSubmit={handleSubmit}>
      {hasDiscount && (
        <div
          className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3"
          style={{ background: 'rgba(0,0,255,0.05)', border: '1px solid rgba(0,0,255,0.15)' }}
        >
          <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#0000FF' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#0000FF' }}>Promo code applied!</p>
            <p className="text-xs text-gray-500">
              You&apos;re saving {formatPrice(coursePrice - finalPrice)} on this enrollment
            </p>
          </div>
        </div>
      )}

      <PaymentElement
        options={{
          layout: { type: 'accordion', defaultCollapsed: false, spacedAccordionItems: false },
          defaultValues: {
            billingDetails: {
              name: `${contact.firstName} ${contact.lastName}`.trim() || undefined,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
            },
          },
        }}
      />

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="mt-6 w-full py-4 text-white font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-opacity disabled:opacity-60 hover:opacity-90"
        style={{ background: '#0000FF' }}
      >
        {processing
          ? 'Processing…'
          : `Complete Enrollment — ${formatPrice(finalPrice)}`}
      </button>

      {!isAuthenticated && (
        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full py-3 text-gray-500 text-sm font-medium hover:text-gray-700 flex items-center justify-center gap-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to your information
        </button>
      )}

      <div className="flex items-center justify-center gap-1.5 mt-4 text-gray-400 text-xs">
        <Lock className="w-3 h-3" />
        256-bit SSL · Your card info never touches our servers
      </div>
    </form>
  );
}

export function FunnelCheckout({
  publishableKey,
  courseId,
  courseTitle,
  coursePrice: coursePriceProp,
  courseSlug,
  courseThumbnail,
  promoEnabled = false,
  enabledProviders = ['stripe'],
  accentColor = '#D4AF37',
  isAuthenticated = false,
  prefillEmail = null,
  prefillName = null,
}: FunnelCheckoutProps) {
  const showStripe = enabledProviders.includes('stripe');
  const showFanbasis = enabledProviders.includes('fanbasis');
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  // Signed-in users skip the contact step — we already know who they are.
  const [step, setStep] = useState<'contact' | 'payment'>(isAuthenticated ? 'payment' : 'contact');

  const [firstPrefill, lastPrefill] = (() => {
    const parts = (prefillName ?? '').trim().split(/\s+/);
    return [parts[0] ?? '', parts.slice(1).join(' ')];
  })();

  const [contact, setContact] = useState<ContactInfo>({
    firstName: firstPrefill,
    lastName: lastPrefill,
    email: prefillEmail ?? '',
    phone: '',
  });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [coursePrice, setCoursePrice] = useState(coursePriceProp);
  const [finalPrice, setFinalPrice] = useState(coursePriceProp);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const [fanbasisLoading, setFanbasisLoading] = useState(false);
  const [fanbasisError, setFanbasisError] = useState<string | null>(null);

  const canContinue = isAuthenticated || (contact.firstName && contact.lastName && contact.email);

  // For signed-in users, auto-create the payment intent on mount so they see the payment form immediately.
  useEffect(() => {
    if (isAuthenticated && showStripe && !clientSecret && !loading) {
      initStripeIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, showStripe]);

  async function initStripeIntent() {
    setLoading(true);
    setInitError(null);
    try {
      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          ...(isAuthenticated
            ? {}
            : {
                guestEmail: contact.email,
                guestName: `${contact.firstName} ${contact.lastName}`.trim(),
                guestPhone: contact.phone,
              }),
          promoCode: promoApplied || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
      setClientSecret(data.clientSecret);
      if (data.originalAmount) setCoursePrice(data.originalAmount);
      if (data.amount) setFinalPrice(data.amount);
      setIsExistingUser(!!data.isExistingUser);
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await fetch('/api/funnel/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), courseId }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoApplied(promoInput.trim().toUpperCase());
        setFinalPrice(data.finalPrice);
        setPromoSuccess(
          data.discountType === 'PERCENTAGE'
            ? `${data.discountValue}% off applied — ${formatPrice(data.discountAmount)} savings`
            : `${formatPrice(data.discountAmount)} off applied`
        );
      } else {
        setPromoError(data.error || 'Invalid or expired promo code');
      }
    } catch {
      setPromoError('Could not validate promo code. Try again.');
    }
    setPromoValidating(false);
  }

  function removePromo() {
    setPromoApplied(null);
    setPromoInput('');
    setFinalPrice(coursePrice);
    setPromoSuccess(null);
    setPromoError(null);
  }

  async function handleContinue() {
    if (!canContinue) return;
    setLoading(true);
    setInitError(null);
    try {
      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          guestEmail: contact.email,
          guestName: `${contact.firstName} ${contact.lastName}`.trim(),
          guestPhone: contact.phone,
          promoCode: promoApplied || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
      setClientSecret(data.clientSecret);
      if (data.originalAmount) setCoursePrice(data.originalAmount);
      if (data.amount) setFinalPrice(data.amount);
      setIsExistingUser(!!data.isExistingUser);
      setStep('payment');
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleFanbasisCheckout() {
    if (!canContinue) return;
    setFanbasisLoading(true);
    setFanbasisError(null);
    try {
      const res = await fetch('/api/checkout/fanbasis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          ...(isAuthenticated
            ? {}
            : {
                guestEmail: contact.email,
                guestName: `${contact.firstName} ${contact.lastName}`.trim(),
                guestPhone: contact.phone,
              }),
          promoCode: promoApplied || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');
      window.location.href = data.paymentLink;
    } catch (err: unknown) {
      setFanbasisError(err instanceof Error ? err.message : 'Something went wrong');
      setFanbasisLoading(false);
    }
  }

  const hasDiscount = finalPrice < coursePrice;

  return (
    <div className="w-full max-w-[960px] grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] rounded-none sm:rounded-2xl overflow-hidden shadow-none sm:shadow-2xl border-0 sm:border" style={{ borderColor: '#e0e0e0' }}>

      {/* ── LEFT: Course summary ── */}
      <div style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
        {courseThumbnail && (
          <div className="aspect-video overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={courseThumbnail} alt={courseTitle} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5 sm:p-8">
          <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-5" style={{ color: accentColor }}>
            Maxxed Out University
          </p>
          <h1 className="font-black text-xl text-white leading-snug mb-6">{courseTitle}</h1>

          <div className="mb-6">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/40 mb-1">
              {hasDiscount ? 'Original Price' : 'Your Investment'}
            </p>
            {hasDiscount && (
              <p className="text-white/40 font-black text-xl line-through mb-0.5">
                {formatPrice(coursePrice)}
              </p>
            )}
            <p className="font-black text-3xl sm:text-[2.5rem] text-white leading-none" style={{ letterSpacing: '-0.02em' }}>
              {formatPrice(finalPrice)}
            </p>
            <p className="text-white/30 text-xs mt-1.5">One-time payment · No recurring fees</p>
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/35 mb-3">
            What&apos;s Included
          </p>
          <ul className="space-y-2.5 flex-1">
            {[
              'Immediate access upon enrollment',
              'Dedicated 1-on-1 time with Todd',
              'Certificate of completion',
              'Lifetime access on all devices',
              '30-day money back guarantee',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-white/50" strokeWidth={3} />
                <span className="text-white/70 text-[13px] leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── RIGHT: Form ── */}
      <div className="p-5 sm:p-8 lg:p-10" style={{ background: '#fafafa' }}>
        <div className="mb-7">
          <h2 className="font-black text-gray-900 text-2xl mb-1">Complete your enrollment</h2>
          <p className="text-gray-400 text-sm">One-time payment · Instant access · No recurring fees</p>
        </div>

        {/* Step indicator — only for guests (signed-in users jump straight to payment) */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2 mb-7">
            {(['contact', 'payment'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{
                    background: step === s || (s === 'contact' && step === 'payment') ? accentColor : '#e5e7eb',
                    color: step === s || (s === 'contact' && step === 'payment') ? '#fff' : '#9ca3af',
                  }}
                >
                  {s === 'contact' && step === 'payment' ? '✓' : i + 1}
                </div>
                <span className="text-[12px] font-semibold capitalize" style={{ color: step === s ? '#0c1829' : '#9ca3af' }}>
                  {s}
                </span>
                {i === 0 && <span className="text-gray-300 mx-1">→</span>}
              </div>
            ))}
          </div>
        )}

        {/* Contact step — guests only */}
        {!isAuthenticated && step === 'contact' && (
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-500 mb-4">
              Your Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 mb-1">First Name *</label>
                <input
                  value={contact.firstName}
                  onChange={e => setContact(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="John"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#0000FF' } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 mb-1">Last Name *</label>
                <input
                  value={contact.lastName}
                  onChange={e => setContact(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Smith"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 mb-1">Email *</label>
              <input
                type="email"
                value={contact.email}
                onChange={e => setContact(p => ({ ...p, email: e.target.value }))}
                placeholder="john@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={contact.phone}
                onChange={e => setContact(p => ({ ...p, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>

            {promoEnabled && (
              <div className="mb-5 border border-gray-100 rounded-xl p-4 bg-gray-50">
                <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 mb-2">
                  <Tag className="w-3 h-3" />
                  Promo Code
                </label>

                {promoApplied ? (
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ background: 'rgba(0,0,255,0.05)', border: '1px solid rgba(0,0,255,0.15)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" style={{ color: '#0000FF' }} strokeWidth={3} />
                      <span className="font-black text-sm tracking-widest" style={{ color: '#0000FF' }}>{promoApplied}</span>
                    </div>
                    <button onClick={removePromo} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                      onKeyDown={e => e.key === 'Enter' && applyPromo()}
                      placeholder="ENTER CODE"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-base font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoValidating || !promoInput.trim()}
                      className="px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wide rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                      style={{ background: '#0c1829' }}
                    >
                      {promoValidating ? '…' : 'Apply'}
                    </button>
                  </div>
                )}

                {promoSuccess && (
                  <p className="text-[11px] font-semibold mt-2" style={{ color: '#0000FF' }}>✓ {promoSuccess}</p>
                )}
                {promoError && (
                  <p className="text-[11px] text-red-500 mt-2">{promoError}</p>
                )}
              </div>
            )}

            {initError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
                {initError}
              </div>
            )}

            {fanbasisError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
                {fanbasisError}
              </div>
            )}

            {showStripe && (
              <button
                onClick={handleContinue}
                disabled={!canContinue || loading || fanbasisLoading}
                className="w-full py-4 text-white font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-all duration-200 disabled:opacity-50 hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: accentColor }}
              >
                {loading ? 'Setting up secure checkout…' : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {showStripe && showFanbasis && (
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {showFanbasis && (
              <>
                <button
                  onClick={handleFanbasisCheckout}
                  disabled={!canContinue || fanbasisLoading || loading}
                  className="w-full py-4 font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-all duration-200 disabled:opacity-50 hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                  style={{ background: '#0c1829', color: '#ffffff' }}
                >
                  {fanbasisLoading ? 'Redirecting…' : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      Pay with <img src="/images/new-fanbasis-white.png" alt="Fanbasis" className="h-5 w-auto" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 text-[11px] mt-2" style={{ color: '#9ca3af' }}>
                  <Lock className="w-3 h-3" />
                  <span>You&apos;ll be redirected to Fanbasis to complete payment</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Payment step — signed-in users land here directly; guests arrive after contact step */}
        {step === 'payment' && (
          <div>
            {/* Authenticated users get a compact promo code input above the payment form */}
            {isAuthenticated && promoEnabled && (
              <div className="mb-5 border border-gray-100 rounded-xl p-4 bg-gray-50">
                <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 mb-2">
                  <Tag className="w-3 h-3" />
                  Promo Code
                </label>
                {promoApplied ? (
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ background: 'rgba(0,0,255,0.05)', border: '1px solid rgba(0,0,255,0.15)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" style={{ color: '#0000FF' }} strokeWidth={3} />
                      <span className="font-black text-sm tracking-widest" style={{ color: '#0000FF' }}>{promoApplied}</span>
                    </div>
                    <button onClick={removePromo} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                      onKeyDown={e => e.key === 'Enter' && applyPromo()}
                      placeholder="ENTER CODE"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-base font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoValidating || !promoInput.trim()}
                      className="px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wide rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                      style={{ background: '#0c1829' }}
                    >
                      {promoValidating ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
                {promoSuccess && <p className="text-[11px] font-semibold mt-2" style={{ color: '#0000FF' }}>✓ {promoSuccess}</p>}
                {promoError && <p className="text-[11px] text-red-500 mt-2">{promoError}</p>}
              </div>
            )}

            {initError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
                {initError}
              </div>
            )}

            {showFanbasis && (
              <>
                <button
                  onClick={handleFanbasisCheckout}
                  disabled={fanbasisLoading || loading}
                  className="mb-4 w-full py-4 font-black text-[12px] tracking-[0.15em] uppercase rounded-xl transition-all duration-200 disabled:opacity-50 hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                  style={{ background: '#0c1829', color: '#ffffff' }}
                >
                  {fanbasisLoading ? 'Redirecting…' : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      Pay with <img src="/images/new-fanbasis-white.png" alt="Fanbasis" className="h-5 w-auto" />
                    </>
                  )}
                </button>
                {fanbasisError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
                    {fanbasisError}
                  </div>
                )}
              </>
            )}

            {showStripe && showFanbasis && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">or pay with card</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {showStripe && !clientSecret && loading && (
              <div className="text-center py-10 text-gray-400 text-sm">
                Setting up secure checkout…
              </div>
            )}

            {showStripe && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0000FF',
                      colorText: '#0c1829',
                      colorTextSecondary: '#6b7280',
                      borderRadius: '8px',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSizeBase: '16px',
                      spacingUnit: '5px',
                    },
                    rules: {
                      '.Input': { border: '1.5px solid #e5e7eb' },
                      '.Input:focus': { border: '1.5px solid #0000FF', boxShadow: '0 0 0 3px rgba(0,0,255,0.08)' },
                      '.Tab--selected': { border: '1.5px solid #0000FF', boxShadow: '0 0 0 2px rgba(0,0,255,0.08)' },
                      '.Label': { fontWeight: '700', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280' },
                    },
                  },
                }}
              >
                <PaymentForm
                  courseTitle={courseTitle}
                  coursePrice={coursePrice}
                  finalPrice={finalPrice}
                  courseSlug={courseSlug}
                  contact={contact}
                  isExistingUser={isExistingUser}
                  isAuthenticated={isAuthenticated}
                  onBack={() => setStep('contact')}
                />
              </Elements>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
