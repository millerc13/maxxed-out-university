'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Image from 'next/image';
import { BookOpen, Lock } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  price: number;
  slug: string;
  thumbnail: string | null;
}

interface CheckoutClientProps {
  course: Course;
  publishableKey: string;
  prefillEmail: string | null;
  prefillName: string | null;
  isAuthenticated: boolean;
  enabledProviders?: string[];
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

// ── Contact Info Form (guests only) ──────────────────────────────────────────
interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function ContactFields({
  info,
  onChange,
  disabled,
}: {
  info: ContactInfo;
  onChange: (f: Partial<ContactInfo>) => void;
  disabled: boolean;
}) {
  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50';
  const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1';

  return (
    <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Your Info</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First Name</label>
          <input className={inputClass} value={info.firstName} onChange={e => onChange({ firstName: e.target.value })} disabled={disabled} placeholder="John" required />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input className={inputClass} value={info.lastName} onChange={e => onChange({ lastName: e.target.value })} disabled={disabled} placeholder="Smith" required />
        </div>
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" className={inputClass} value={info.email} onChange={e => onChange({ email: e.target.value })} disabled={disabled} placeholder="john@example.com" required />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input type="tel" className={inputClass} value={info.phone} onChange={e => onChange({ phone: e.target.value })} disabled={disabled} placeholder="+1 (555) 000-0000" />
      </div>
    </div>
  );
}

// ── Stripe Payment Form ─────────────────────────────────────────────────────
function PaymentForm({
  course,
  contact,
  isAuthenticated,
}: {
  course: Course;
  contact: ContactInfo;
  isAuthenticated: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!isAuthenticated) {
      if (!contact.firstName || !contact.lastName || !contact.email) {
        setError('Please fill in your name and email above.');
        return;
      }
    }

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
        return_url: `${window.location.origin}/checkout/success?courseSlug=${course.slug}`,
        payment_method_data: {
          billing_details: {
            name: isAuthenticated ? undefined : `${contact.firstName} ${contact.lastName}`.trim(),
            email: isAuthenticated ? undefined : contact.email,
            phone: isAuthenticated ? undefined : contact.phone || undefined,
          },
        },
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: {
            type: 'accordion',
            defaultCollapsed: false,
            spacedAccordionItems: false,
          },
          defaultValues: {
            billingDetails: {
              email: isAuthenticated ? undefined : contact.email,
              name: isAuthenticated ? undefined : `${contact.firstName} ${contact.lastName}`.trim() || undefined,
              phone: isAuthenticated ? undefined : contact.phone || undefined,
            },
          },
        }}
      />

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        style={{ background: processing ? '#6b7280' : '#1d4ed8' }}
        className="w-full py-4 text-white font-extrabold text-sm uppercase tracking-[0.15em] rounded-lg disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90"
      >
        {processing ? 'Processing…' : `Enroll Now — ${formatPrice(course.price)}`}
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: '#9ca3af' }}>
        <Lock className="w-3 h-3" />
        <span>256-bit SSL · Your card info never touches our servers</span>
      </div>
    </form>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CheckoutClient({
  course,
  publishableKey,
  prefillEmail,
  prefillName,
  isAuthenticated,
  enabledProviders = ['stripe'],
}: CheckoutClientProps) {
  const showStripe = enabledProviders.includes('stripe');
  const showFanbasis = enabledProviders.includes('fanbasis');

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [intentCreated, setIntentCreated] = useState(false);

  const [fanbasisLoading, setFanbasisLoading] = useState(false);
  const [fanbasisError, setFanbasisError] = useState<string | null>(null);

  const [contact, setContact] = useState<ContactInfo>({
    firstName: prefillName?.split(' ')[0] ?? '',
    lastName: prefillName?.split(' ').slice(1).join(' ') ?? '',
    email: prefillEmail ?? '',
    phone: '',
  });

  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const [showPayment, setShowPayment] = useState(isAuthenticated);

  async function createIntent() {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          ...(isAuthenticated ? {} : {
            guestEmail: contact.email,
            guestName: `${contact.firstName} ${contact.lastName}`.trim(),
            guestPhone: contact.phone,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
      setClientSecret(data.clientSecret);
      setIntentCreated(true);
    } catch (err: any) {
      setStripeError(err.message);
    } finally {
      setStripeLoading(false);
    }
  }

  async function handleFanbasisCheckout() {
    if (!isAuthenticated && (!contact.firstName || !contact.lastName || !contact.email)) {
      setFanbasisError('Please fill in your name and email above.');
      return;
    }
    setFanbasisLoading(true);
    setFanbasisError(null);
    try {
      const res = await fetch('/api/checkout/fanbasis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          ...(!isAuthenticated && {
            guestEmail: contact.email,
            guestName: `${contact.firstName} ${contact.lastName}`.trim(),
            guestPhone: contact.phone,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
      window.location.href = data.paymentLink;
    } catch (err: any) {
      setFanbasisError(err.message);
      setFanbasisLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && showStripe) {
      createIntent();
    }
  }, [isAuthenticated, showStripe]);

  function handleContinue() {
    if (!contact.firstName || !contact.lastName || !contact.email) return;
    setShowPayment(true);
    if (showStripe) createIntent();
  }

  const included = [
    'Immediate access upon enrollment',
    'Dedicated 1-on-1 time with Todd',
    'Certificate of completion',
    'Lifetime access on all devices',
  ];

  return (
    <div
      className="w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-2xl overflow-hidden"
      style={{ maxWidth: '1060px', boxShadow: '0 24px 64px rgba(12,24,41,0.18), 0 4px 16px rgba(12,24,41,0.08)', borderTop: '4px solid #D4AF37' }}
    >
      {/* LEFT — Course Summary */}
      <div
        className="lg:col-span-2 flex flex-col p-8 lg:p-10"
        style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}
      >
        <p style={{ color: '#D4AF37', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Maxxed Out University
        </p>

        <div className="relative w-full rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill sizes="400px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <BookOpen className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          )}
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, marginBottom: '28px' }}>
          {course.title}
        </h1>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
            Investment
          </p>
          <p style={{ fontSize: '42px', fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {formatPrice(course.price)}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
            One-time payment · No recurring fees
          </p>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '24px' }} />

        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>
          What&apos;s included
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {included.map((item) => (
            <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '13px', lineHeight: 1.4, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT — Payment Form */}
      <div className="lg:col-span-3 flex flex-col p-8 lg:p-10" style={{ background: '#ffffff' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0c1829', lineHeight: 1.2, marginBottom: '6px' }}>
            Complete your enrollment
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            One-time payment · Instant access · No recurring fees
          </p>
        </div>

        {/* Guest contact fields */}
        {!isAuthenticated && (
          <ContactFields
            info={contact}
            onChange={(fields) => setContact(prev => ({ ...prev, ...fields }))}
            disabled={intentCreated}
          />
        )}

        {/* Guest: show Continue button before payment (Stripe needs intent created first) */}
        {!isAuthenticated && !showPayment && showStripe && (
          <button
            onClick={handleContinue}
            disabled={!contact.firstName || !contact.lastName || !contact.email}
            style={{ background: '#1d4ed8' }}
            className="w-full py-4 text-white font-extrabold text-sm uppercase tracking-[0.15em] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-4"
          >
            Continue to Payment →
          </button>
        )}

        {/* ── Stripe Section ── */}
        {showStripe && showPayment && (
          <>
            {stripeLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: '14px' }}>
                Initializing secure checkout…
              </div>
            )}

            {stripeError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                {stripeError}
              </div>
            )}

            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0c1829',
                      colorText: '#0c1829',
                      colorTextSecondary: '#6b7280',
                      borderRadius: '8px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSizeBase: '14px',
                      spacingUnit: '5px',
                    },
                    rules: {
                      '.Input': { border: '1.5px solid #e5e7eb' },
                      '.Input:focus': { border: '1.5px solid #0c1829', boxShadow: '0 0 0 3px rgba(12,24,41,0.06)' },
                      '.Tab--selected': { border: '1.5px solid #0c1829', boxShadow: '0 0 0 2px rgba(12,24,41,0.06)' },
                      '.Label': { fontWeight: '600', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280' },
                    },
                  },
                }}
              >
                <PaymentForm course={course} contact={contact} isAuthenticated={isAuthenticated} />
              </Elements>
            )}
          </>
        )}

        {/* ── Fanbasis Section ── */}
        {showFanbasis && (
          <>
            {/* Divider between Stripe and Fanbasis */}
            {showStripe && showPayment && (
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            <button
              onClick={handleFanbasisCheckout}
              disabled={fanbasisLoading || (!isAuthenticated && (!contact.firstName || !contact.lastName || !contact.email))}
              className="w-full py-4 rounded-lg font-extrabold text-sm uppercase tracking-[0.15em] transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              style={{ background: '#FF3860', color: '#ffffff' }}
            >
              {fanbasisLoading ? (
                'Redirecting…'
              ) : (
                <>
                  <img src="/images/new-fanbasis-white.png" alt="Fanbasis" className="h-5 w-auto" />
                  Pay with Fanbasis
                </>
              )}
            </button>

            {fanbasisError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-3">
                {fanbasisError}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] mt-3" style={{ color: '#9ca3af' }}>
              <Lock className="w-3 h-3" />
              <span>You&apos;ll be redirected to Fanbasis to complete payment</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
