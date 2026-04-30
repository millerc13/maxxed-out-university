'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import {
  applicationSchema,
  revenueOptions,
  teamSizeOptions,
  industryOptions,
  bottleneckOptions,
  commitmentOptions,
  heardAboutOptions,
  type ApplicationPayload,
} from '@/lib/apply-schema';
import { FunnelCheckout } from '@/components/checkout/FunnelCheckout';

const STEP_LABELS = ['Your Info', 'Your Business', 'Your Goals', 'Your Fit'];
const TIME_SLOTS = [
  'Weekday Mornings',
  'Weekday Afternoons',
  'Weekday Evenings',
  'Weekends',
];

interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  price: number | null;
  checkoutAfterApply: boolean;
}

interface Props {
  course: Course;
  stripePublishableKey: string;
  enabledProviders: string[];
  promoEnabled: boolean;
}

type FormState = ApplicationPayload;

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  website: '',
  bestTimes: [],
  program: 'university',
};

/**
 * On-platform mirror of the funnel repo's 4-step ApplyWizard. After
 * the final step submits, the lead is captured in GHL via /api/apply.
 * If the course has `checkoutAfterApply` ON and a price, the wizard
 * advances to a step 5 (the existing <FunnelCheckout /> with contact
 * prefilled). Otherwise the user lands on an inline thank-you screen.
 */
export function ApplyWizardOnPlatform({
  course,
  stripePublishableKey,
  enabledProviders,
  promoEnabled,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 'thanks'>(1);
  const [data, setData] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialFired, setPartialFired] = useState(false);

  function patch(p: Partial<FormState>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  function toggleBestTime(slot: string) {
    setData((prev) => {
      const current = prev.bestTimes ?? [];
      return {
        ...prev,
        bestTimes: current.includes(slot)
          ? current.filter((s) => s !== slot)
          : [...current, slot],
      };
    });
  }

  function validateStep(s: 1 | 2 | 3 | 4): string | null {
    if (s === 1) {
      if (!data.name || data.name.trim().length < 2) return 'Please enter your full name';
      if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email))
        return 'Please enter a valid email';
      if (!data.phone || data.phone.replace(/\D/g, '').length < 7)
        return 'Please enter a valid phone number';
    }
    return null;
  }

  async function fireApply(payload: FormState, partial: boolean) {
    const body = {
      ...payload,
      partial,
      courseId: course.id,
      courseSlug: course.slug,
      program: 'university' as const,
    };
    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed');
    }
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Submit failed (${res.status})`);
    }
  }

  async function next() {
    if (step === 'thanks' || step === 5) return;
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Step-1 partial submission — abandoned-lead capture so we still
    // have name/email/phone in GHL even if the user bails on later steps.
    if (step === 1 && !partialFired) {
      try {
        await fireApply(data, true);
        setPartialFired(true);
      } catch {
        /* swallow — partial is best-effort */
      }
    }

    if (step < 4) {
      setStep((s) => ((s as number) + 1) as 2 | 3 | 4);
      return;
    }

    setSubmitting(true);
    try {
      await fireApply(data, false);
      if (course.checkoutAfterApply && course.price && course.price > 0) {
        setStep(5);
      } else {
        setStep('thanks');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (step === 5) return;
    if (typeof step === 'number' && step > 1)
      setStep((s) => ((s as number) - 1) as 1 | 2 | 3);
  }

  if (step === 'thanks') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-card p-8 md:p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-dark mb-3">
          Application received
        </h1>
        <p className="text-text-body leading-relaxed">
          Todd&rsquo;s team will review your application and reach out within one business day.
          In the meantime, feel free to{' '}
          <a href="/courses" className="text-maxxed-blue hover:underline font-semibold">
            browse the catalog
          </a>
          .
        </p>
      </div>
    );
  }

  if (step === 5) {
    const [firstName, ...rest] = data.name.trim().split(/\s+/);
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900 text-sm">
              You&rsquo;re a fit. Lock in your spot below.
            </p>
            <p className="text-xs text-green-800/80 mt-0.5">
              Your application is saved. Complete payment now to start, or close this page —
              Todd&rsquo;s team will reach out within one business day either way.
            </p>
          </div>
        </div>
        <FunnelCheckout
          publishableKey={stripePublishableKey}
          courseId={course.id}
          courseTitle={course.title}
          coursePrice={course.price ?? 0}
          courseSlug={course.slug}
          courseThumbnail={course.thumbnail}
          promoEnabled={promoEnabled}
          enabledProviders={enabledProviders}
          isAuthenticated={false}
          prefillEmail={data.email}
          prefillName={[firstName, rest.join(' ')].filter(Boolean).join(' ')}
          prefillPhone={data.phone}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-maxxed-blue">
            Step {step} of 4 · {STEP_LABELS[step - 1]}
          </span>
          <span className="text-xs text-text-muted">{course.title}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-maxxed-blue transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 space-y-5">
        {step === 1 && <Step1 data={data} patch={patch} />}
        {step === 2 && <Step2 data={data} patch={patch} />}
        {step === 3 && <Step3 data={data} patch={patch} />}
        {step === 4 && <Step4 data={data} patch={patch} toggleBestTime={toggleBestTime} />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-maxxed-blue text-white rounded-lg font-semibold text-sm hover:bg-maxxed-blue-dark disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : step === 4 ? (
              <>
                Submit application <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function fieldClass() {
  return 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue';
}

function Step1({
  data,
  patch,
}: {
  data: FormState;
  patch: (p: Partial<FormState>) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-text-dark mb-1">Tell us about you</h2>
        <p className="text-sm text-text-body">
          Required fields only — everything else is optional.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full name *">
          <input
            type="text"
            className={fieldClass()}
            value={data.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="name"
          />
        </Field>
        <Field label="Email *">
          <input
            type="email"
            className={fieldClass()}
            value={data.email}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Phone *">
          <input
            type="tel"
            className={fieldClass()}
            value={data.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field label="Business name">
          <input
            type="text"
            className={fieldClass()}
            value={data.businessName ?? ''}
            onChange={(e) => patch({ businessName: e.target.value })}
            autoComplete="organization"
          />
        </Field>
        <Field label="Website" className="md:col-span-2">
          <input
            type="text"
            className={fieldClass()}
            value={data.website ?? ''}
            onChange={(e) => patch({ website: e.target.value })}
            placeholder="example.com"
          />
        </Field>
      </div>
    </>
  );
}

function Step2({
  data,
  patch,
}: {
  data: FormState;
  patch: (p: Partial<FormState>) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-text-dark mb-1">Your business</h2>
        <p className="text-sm text-text-body">All optional — helps Todd tailor the conversation.</p>
      </div>
      <Field label="Real estate income">
        <select
          className={fieldClass()}
          value={data.revenue ?? ''}
          onChange={(e) =>
            patch({ revenue: (e.target.value as FormState['revenue']) || undefined })
          }
        >
          <option value="">— Choose —</option>
          {revenueOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Team size">
        <select
          className={fieldClass()}
          value={data.teamSize ?? ''}
          onChange={(e) =>
            patch({ teamSize: (e.target.value as FormState['teamSize']) || undefined })
          }
        >
          <option value="">— Choose —</option>
          {teamSizeOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Real estate focus">
        <select
          className={fieldClass()}
          value={data.industry ?? ''}
          onChange={(e) =>
            patch({ industry: (e.target.value as FormState['industry']) || undefined })
          }
        >
          <option value="">— Choose —</option>
          {industryOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}

function Step3({
  data,
  patch,
}: {
  data: FormState;
  patch: (p: Partial<FormState>) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-text-dark mb-1">Your goals</h2>
        <p className="text-sm text-text-body">
          What&rsquo;s holding you back? Where do you want to be?
        </p>
      </div>
      <Field label="Biggest bottleneck">
        <select
          className={fieldClass()}
          value={data.bottleneck ?? ''}
          onChange={(e) =>
            patch({ bottleneck: (e.target.value as FormState['bottleneck']) || undefined })
          }
        >
          <option value="">— Choose —</option>
          {bottleneckOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
      <Field label="12-month vision">
        <textarea
          className={fieldClass()}
          rows={4}
          value={data.vision ?? ''}
          onChange={(e) => patch({ vision: e.target.value })}
          placeholder="What does success look like in the next 12 months?"
          maxLength={1200}
        />
      </Field>
    </>
  );
}

function Step4({
  data,
  patch,
  toggleBestTime,
}: {
  data: FormState;
  patch: (p: Partial<FormState>) => void;
  toggleBestTime: (slot: string) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-text-dark mb-1">Your fit</h2>
        <p className="text-sm text-text-body">A few last details so we can plan the call.</p>
      </div>
      <Field label="Timeline to start">
        <select
          className={fieldClass()}
          value={data.commitment ?? ''}
          onChange={(e) =>
            patch({ commitment: (e.target.value as FormState['commitment']) || undefined })
          }
        >
          <option value="">— Choose —</option>
          {commitmentOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1.5">Best times to reach you</p>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((slot) => {
            const selected = (data.bestTimes ?? []).includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleBestTime(slot)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${
                  selected
                    ? 'border-maxxed-blue bg-blue-50 text-maxxed-blue'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="How did you hear about Todd?">
        <select
          className={fieldClass()}
          value={data.heardAbout ?? ''}
          onChange={(e) =>
            patch({ heardAbout: (e.target.value as FormState['heardAbout']) || undefined })
          }
        >
          <option value="">— Choose —</option>
          {heardAboutOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
