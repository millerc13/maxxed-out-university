"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { Input, Textarea, Label, FieldError } from "./ui/Input";
import { RadioGroup, RadioCard } from "./ui/RadioGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";
import { ProgressBar } from "./ProgressBar";
import {
  applicationSchema,
  revenueOptions,
  teamSizeOptions,
  industryOptions,
  bottleneckOptions,
  commitmentOptions,
  heardAboutOptions,
  type ApplicationPayload,
} from "@/lib/apply-schema";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "maxxed-apply-onplatform-draft-v1";
const STEP_LABELS = ["Your Info", "Your Business", "Your Goals", "Your Fit"];
const TIME_SLOTS = [
  "Weekday Mornings",
  "Weekday Afternoons",
  "Weekday Evenings",
  "Weekends",
];

type FieldKeys = (keyof ApplicationPayload)[];
const STEP_FIELDS: FieldKeys[] = [
  ["name", "email", "phone", "businessName", "website"],
  ["revenue", "teamSize", "industry"],
  ["bottleneck", "vision"],
  ["commitment", "bestTimes", "heardAbout"],
];

interface CourseLite {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  checkoutAfterApply: boolean;
  /** Per-course Meta Pixel ID — used to fire `Lead` event after submit. */
  metaPixelId?: string | null;
}

interface ApplyWizardOnPlatformProps {
  course: CourseLite;
  // Optional prefill — when the visitor is logged into the university,
  // the server hands their account info down so the contact step is
  // already filled. localStorage hydration still runs after mount, so
  // a saved draft (if any) will overwrite these defaults — drafts win,
  // prefill is the seed for fresh applies.
  prefill?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

function QualifiedInterstitial() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,255,0.06), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center text-center px-6 max-w-lg">
        <div className="relative">
          <motion.span
            aria-hidden
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.15, 1], opacity: [0, 0.6, 0.3] }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-maxxed-blue/20 blur-xl"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-maxxed-blue shadow-[0_20px_60px_rgba(0,0,255,0.35)]"
          >
            <svg
              viewBox="0 0 52 52"
              className="h-12 w-12 md:h-14 md:w-14 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <motion.path
                d="M14 27 L23 36 L40 18"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.35, duration: 0.55, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 font-extrabold uppercase tracking-[-0.01em] text-text-dark leading-[1.05]"
          style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
        >
          You&apos;re a fit.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="mt-3 text-text-body text-[15px] md:text-base leading-relaxed"
        >
          Application received. Securing your spot and preparing checkout&hellip;
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
          className="mt-8 w-full max-w-xs h-1.5 rounded-full bg-border overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 2.0, ease: "easeInOut" }}
            className="h-full origin-left bg-maxxed-blue"
          />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.4 }}
          className="mt-4 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.22em] text-text-muted"
        >
          Redirecting to secure payment&hellip;
        </motion.p>
      </div>
    </motion.div>
  );
}

export function ApplyWizardOnPlatform({ course, prefill }: ApplyWizardOnPlatformProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [qualifying, setQualifying] = useState(false);
  const hydrated = useRef(false);
  const [submitArmed, setSubmitArmed] = useState(false);

  const sendToCheckoutAfter =
    course.checkoutAfterApply && !!course.price && course.price > 0;

  const form = useForm<ApplicationPayload>({
    resolver: zodResolver(applicationSchema),
    mode: "onBlur",
    defaultValues: {
      name: prefill?.name ?? "",
      email: prefill?.email ?? "",
      phone: prefill?.phone ?? "",
      businessName: "",
      website: "",
      bestTimes: [],
      vision: "",
    } as Partial<ApplicationPayload> as ApplicationPayload,
  });

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ApplicationPayload>;
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== undefined) setValue(k as keyof ApplicationPayload, v as never);
        }
      }
    } catch {
      /* ignore */
    }
    hydrated.current = true;
  }, [setValue]);

  useEffect(() => {
    const sub = watch((value) => {
      if (!hydrated.current) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (step !== 4) {
      setSubmitArmed(false);
      return;
    }
    setSubmitArmed(false);
    const t = setTimeout(() => setSubmitArmed(true), 400);
    return () => clearTimeout(t);
  }, [step]);

  // Fire the Meta Pixel `Lead` once, right after step 1 — the earliest
  // point we have the applicant's email. Deterministic event_id
  // (`lead_<email>`) lets the server-side CAPI Lead from /api/apply dedupe
  // to a single Lead per applicant. No-op when the course has no Pixel.
  const leadFired = useRef(false);
  const fireLeadOnce = (email: string) => {
    if (leadFired.current) return;
    if (!course.metaPixelId) return;
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    leadFired.current = true;
    trackPixelEvent(
      'Lead',
      {
        value: course.price ? course.price / 100 : undefined,
        currency: course.price ? 'USD' : undefined,
        content_ids: [course.slug],
        content_name: course.title,
        content_category: 'application',
      },
      `lead_${clean}`,
    );
  };

  const partialCaptureFired = useRef(false);
  const firePartialCapture = () => {
    if (partialCaptureFired.current) return;
    partialCaptureFired.current = true;
    const values = getValues();
    fireLeadOnce(values.email);
    fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        courseId: course.id,
        courseSlug: course.slug,
        program: "university",
        partial: true,
      }),
      keepalive: true,
    }).catch(() => {
      partialCaptureFired.current = false;
    });
  };

  const goNext = async () => {
    const ok = await trigger(STEP_FIELDS[step - 1]);
    if (ok) {
      if (step === 1) firePartialCapture();
      setStep((s) => Math.min(s + 1, 4));
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const onSubmit: SubmitHandler<ApplicationPayload> = async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          courseId: course.id,
          courseSlug: course.slug,
          program: "university",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      localStorage.removeItem(STORAGE_KEY);

      if (sendToCheckoutAfter) {
        const params = new URLSearchParams({
          courseId: course.id,
          fromApply: "1",
          name: values.name,
          email: values.email,
          phone: values.phone,
        });
        setQualifying(true);
        setTimeout(() => {
          router.push(`/checkout?${params.toString()}`);
        }, 2500);
      } else {
        router.push(`/courses/${course.slug}?applied=1`);
      }
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  const bestTimes = watch("bestTimes") ?? [];
  const toggleTime = (t: string) => {
    const has = bestTimes.includes(t);
    setValue(
      "bestTimes",
      has ? bestTimes.filter((x) => x !== t) : [...bestTimes, t],
      { shouldValidate: true }
    );
  };

  return (
    <div className="card-solid p-6 md:p-10 lg:p-12 border border-border">
      <AnimatePresence>{qualifying && <QualifiedInterstitial />}</AnimatePresence>
      <ProgressBar current={step} total={4} labels={STEP_LABELS} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {step === 1 && (
              <div className="space-y-6">
                <Intro
                  title="Tell us who you are."
                  body={`Name, email, and phone are all our team needs to reach out about ${course.title}. Everything after this helps us prep a useful conversation — share as much or as little as you want.`}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" required>Full Name</Label>
                    <Input id="name" placeholder="Jane Investor" aria-invalid={!!errors.name} {...register("name")} />
                    <FieldError message={errors.name?.message} />
                  </div>
                  <div>
                    <Label htmlFor="email" required>Email</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@domain.com" aria-invalid={!!errors.email} {...register("email")} />
                    <FieldError message={errors.email?.message} />
                  </div>
                  <div>
                    <Label htmlFor="phone" required>Phone</Label>
                    <Input id="phone" type="tel" autoComplete="tel" placeholder="+1 (555) 555-5555" aria-invalid={!!errors.phone} {...register("phone")} />
                    <FieldError message={errors.phone?.message} />
                  </div>
                  <div>
                    <Label htmlFor="businessName">Business / LLC Name</Label>
                    <Input id="businessName" placeholder="Acme Holdings LLC" aria-invalid={!!errors.businessName} {...register("businessName")} />
                    <FieldError message={errors.businessName?.message} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input id="website" type="text" placeholder="yoursite.com" aria-invalid={!!errors.website} {...register("website")} />
                    <FieldError message={errors.website?.message} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <Intro
                  title="Where are you at in your business?"
                  body="All optional — whatever you share helps us prep the right conversation."
                />
                <Controller control={control} name="revenue" render={({ field }) => (
                  <div>
                    <Label>Current revenue</Label>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="sm:grid-cols-2">
                      {revenueOptions.map((v) => <RadioCard key={v} value={v} label={v} />)}
                    </RadioGroup>
                    <FieldError message={errors.revenue?.message} />
                  </div>
                )} />
                <Controller control={control} name="teamSize" render={({ field }) => (
                  <div>
                    <Label>Team size</Label>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="sm:grid-cols-2">
                      {teamSizeOptions.map((v) => <RadioCard key={v} value={v} label={v} />)}
                    </RadioGroup>
                    <FieldError message={errors.teamSize?.message} />
                  </div>
                )} />
                <Controller control={control} name="industry" render={({ field }) => (
                  <div>
                    <Label>Primary industry / focus</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select your focus" /></SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError message={errors.industry?.message} />
                  </div>
                )} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <Intro
                  title="What are you trying to unlock?"
                  body="Optional. The clearer you are, the more useful our call will be."
                />
                <Controller control={control} name="bottleneck" render={({ field }) => (
                  <div>
                    <Label>What&apos;s your biggest obstacle right now?</Label>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="sm:grid-cols-2">
                      {bottleneckOptions.map((v) => <RadioCard key={v} value={v} label={v} />)}
                    </RadioGroup>
                    <FieldError message={errors.bottleneck?.message} />
                  </div>
                )} />
                <div>
                  <Label htmlFor="vision">What does success look like 12 months from now?</Label>
                  <Textarea id="vision" rows={6} placeholder="Revenue, team size, freedom — paint the picture." aria-invalid={!!errors.vision} {...register("vision")} />
                  <FieldError message={errors.vision?.message} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <Intro
                  title="Last step."
                  body="Optional — one honest answer here saves us both time on the call."
                />
                <Controller control={control} name="commitment" render={({ field }) => (
                  <div>
                    <Label>How quickly do you want to start?</Label>
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      {commitmentOptions.map((v) => <RadioCard key={v} value={v} label={v} />)}
                    </RadioGroup>
                    <FieldError message={errors.commitment?.message} />
                  </div>
                )} />
                <div>
                  <Label>Preferred call times</Label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map((t) => {
                      const active = bestTimes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTime(t)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-md border-2 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.1em] transition-all cursor-pointer",
                            active
                              ? "bg-maxxed-blue border-maxxed-blue text-white"
                              : "bg-white border-border-strong text-text-body hover:border-maxxed-blue/60 hover:text-maxxed-blue"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={Array.isArray(errors.bestTimes) ? undefined : errors.bestTimes?.message} />
                </div>
                <Controller control={control} name="heardAbout" render={({ field }) => (
                  <div>
                    <Label>How did you hear about us?</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                      <SelectContent>
                        {heardAboutOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError message={errors.heardAbout?.message} />
                  </div>
                )} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {serverError && (
          <p role="alert" className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
            {serverError}
          </p>
        )}

        <div className="mt-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          {step > 1 ? (
            <Button type="button" variant="outline" size="lg" onClick={goBack} disabled={submitting}>
              <ArrowLeft className="h-5 w-5" aria-hidden /> Back
            </Button>
          ) : (
            <Button asChild variant="ghost" size="lg">
              <Link href={`/courses/${course.slug}`}>
                <ArrowLeft className="h-5 w-5" aria-hidden /> Cancel
              </Link>
            </Button>
          )}

          {step < 4 ? (
            <Button key="continue-btn" type="button" variant="primary" size="lg" onClick={goNext} className="w-full sm:w-auto">
              Continue <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
          ) : (
            <Button key="submit-btn" type="submit" variant="primary" size="lg" disabled={!submitArmed || submitting} className="w-full sm:w-auto">
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" aria-hidden />Submitting&hellip;</>
              ) : (
                <>Submit Application <ArrowRight className="h-5 w-5" aria-hidden /></>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Intro({ title, body }: { title: string; body: string }) {
  return (
    <header>
      <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-[0.02em] leading-tight text-text-dark">
        {title}
      </h2>
      <p className="mt-2 text-[15px] md:text-base text-text-body">{body}</p>
    </header>
  );
}
