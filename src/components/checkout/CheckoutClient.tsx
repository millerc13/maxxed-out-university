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
  userEmail: string;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

function PaymentForm({ course, userEmail }: { course: Course; userEmail: string }) {
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
        return_url: `${window.location.origin}/checkout/success?courseSlug=${course.slug}`,
        payment_method_data: {
          billing_details: { email: userEmail },
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
            billingDetails: { email: userEmail },
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

export function CheckoutClient({ course, publishableKey, userEmail }: CheckoutClientProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  useEffect(() => {
    async function createIntent() {
      try {
        const res = await fetch('/api/checkout/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId: course.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setInitError(err.message);
      } finally {
        setLoading(false);
      }
    }
    createIntent();
  }, [course.id]);

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
        {/* Brand eyebrow */}
        <p style={{ color: '#D4AF37', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Maxxed Out University
        </p>

        {/* Thumbnail */}
        <div className="relative w-full rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill sizes="400px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <BookOpen className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          )}
        </div>

        {/* Course title */}
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, marginBottom: '28px' }}>
          {course.title}
        </h1>

        {/* Price — no box, just the number */}
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

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '24px' }} />

        {/* What's included */}
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

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0c1829', lineHeight: 1.2, marginBottom: '6px' }}>
            Complete your enrollment
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            One-time payment · Instant access · No recurring fees
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: '14px' }}>
            Initializing secure checkout…
          </div>
        )}

        {initError && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {initError}
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
                  '.Input': {
                    border: '1.5px solid #e5e7eb',
                  },
                  '.Input:focus': {
                    border: '1.5px solid #0c1829',
                    boxShadow: '0 0 0 3px rgba(12,24,41,0.06)',
                  },
                  '.Tab--selected': {
                    border: '1.5px solid #0c1829',
                    boxShadow: '0 0 0 2px rgba(12,24,41,0.06)',
                  },
                  '.Label': {
                    fontWeight: '600',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#6b7280',
                  },
                },
              },
            }}
          >
            <PaymentForm course={course} userEmail={userEmail} />
          </Elements>
        )}
      </div>
    </div>
  );
}
