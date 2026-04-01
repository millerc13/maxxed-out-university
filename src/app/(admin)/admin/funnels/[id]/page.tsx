'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronLeft, ChevronDown, Save, ExternalLink, RefreshCw, Check, Copy, Eye, Settings, FileText, MessageSquare, Star, ArrowRight, Shield, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Course {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  thumbnail?: string | null;
}

interface Testimonial {
  name: string;
  location: string;
  result: string;
  text: string;
}

interface FunnelData {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  active: boolean;
  courseId: string | null;
  course: Course | null;
  featuredCourses: Course[];
  config: {
    headline: string | null;
    subheadline: string | null;
    bulletPoints: string[];
    testimonials: Testimonial[];
    ctaText: string | null;
    featureCards: { title: string; body: string }[];
    forYouIf: string[];
    coursesLabel: string | null;
    coursesHeadline: string | null;
    coursesSubheadline: string | null;
    featureCardsLabel: string | null;
    featureCardsHeadline: string | null;
    featureCardsSub: string | null;
  } | null;
}

interface FeatureCard {
  title: string;
  body: string;
}

// ── Default content (used when admin hasn't customized) ──────────
const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
  { title: 'The Wealth Mindset', body: 'How successful entrepreneurs think differently about money, risk, and opportunity.' },
  { title: 'Real Estate Strategies', body: 'The exact strategies Todd used to build his portfolio from zero to nine figures.' },
  { title: 'Deal Analysis', body: 'Master the numbers behind every deal — flips, rentals, BRRRR, and multifamily.' },
  { title: 'Finding & Funding Deals', body: 'Where to find off-market opportunities and how to fund them without your own money.' },
  { title: 'Your Action Plan', body: 'Clear, concrete first steps you can take immediately to change your trajectory.' },
  { title: 'Scaling Your Portfolio', body: 'Systems, teams, and frameworks to go from one door to a full real estate business.' },
];

const DEFAULT_FOR_YOU_IF = [
  "You're working hard but still feel stuck financially",
  "You know there's more out there for you",
  "You're ready to learn how real estate actually works",
  "You want real strategies, not motivational fluff",
];

function FunnelPreview({
  headline, subheadline, ctaText, bullets, testimonials, courseName, coursePrice, courseThumbnail, containerWidth, featuredCourses,
  featureCards, forYouIf, coursesLabel, coursesHeadline, coursesSubheadline, featureCardsLabel, featureCardsHeadline, featureCardsSub,
}: {
  headline: string; subheadline: string; ctaText: string; bullets: string[];
  testimonials: Testimonial[]; courseName: string; coursePrice: number | null;
  courseThumbnail: string | null; containerWidth: number; featuredCourses: Course[];
  featureCards: FeatureCard[]; forYouIf: string[];
  coursesLabel: string; coursesHeadline: string; coursesSubheadline: string;
  featureCardsLabel: string; featureCardsHeadline: string; featureCardsSub: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [scaledHeight, setScaledHeight] = useState<number>(0);
  const fmtPrice = (cents: number | null) => {
    if (cents === null) return '—';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const activeBullets = bullets.filter(Boolean);
  const activeTestimonials = testimonials.filter(t => t.name || t.text);
  const cta = ctaText || 'Enroll Now';

  // Render at 1280px desktop and scale to fit container
  const RENDER_WIDTH = 1280;
  const scale = containerWidth > 0 ? containerWidth / RENDER_WIDTH : 0.7;

  // Measure inner content and compute scaled height so the wrapper collapses properly.
  // CSS transform doesn't affect layout flow, so we must set explicit wrapper height.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      if (h > 0) setScaledHeight(Math.ceil(h * scale));
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [scale]);

  return (
    <div style={{ width: '100%', height: scaledHeight > 0 ? scaledHeight : undefined, overflow: 'hidden', position: 'relative' }}>
      <div
        className="select-none"
        style={{
          width: `${RENDER_WIDTH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div ref={innerRef} className="font-sans" style={{ width: `${RENDER_WIDTH}px` }}>

          {/* ── NAV ── */}
          <header className="bg-white shadow-sm" style={{ borderTop: '3px solid #0000FF' }}>
            <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-black text-[11px] tracking-[0.2em] uppercase text-gray-900">
                  Maxxed Out University
                </span>
              </div>
              <span className="text-white font-black text-[11px] tracking-[0.15em] uppercase px-5 py-2.5 rounded-lg" style={{ background: '#0000FF' }}>
                {cta}
              </span>
            </div>
          </header>

          {/* ── HERO ── */}
          <section style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 pt-16 pb-12 text-center">
            <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D4AF37' }} />
              <span className="text-white/70 font-bold text-[10px] tracking-[0.2em] uppercase">Now Enrolling — Join From Anywhere</span>
            </div>
            <h1 className="font-black text-white text-5xl leading-[1.08] tracking-tight max-w-[820px] mx-auto mb-6">
              {(headline || 'Your Headline Here').split(' ').map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z-]/g, '');
                const accent = new Set(['real', 'exact', 'nine-figure', 'empire', 'investors', 'wealth', 'system', 'blueprint']);
                return accent.has(clean)
                  ? <span key={i} style={{ color: '#0000FF' }}>{word} </span>
                  : <span key={i}>{word} </span>;
              })}
            </h1>
            <p className="text-white/60 text-lg max-w-[560px] mx-auto mb-10 leading-relaxed">
              {subheadline || 'Your subheadline goes here'}
            </p>
            {/* VSL placeholder */}
            <div className="max-w-[860px] mx-auto mb-10 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
              <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#0a1628' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,255,0.9)', boxShadow: '0 0 40px rgba(0,0,255,0.4)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                  </div>
                  <p className="text-white/40 text-sm font-semibold tracking-wide">VSL video coming soon</p>
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-2.5 text-white font-black text-[13px] tracking-[0.15em] uppercase px-10 py-5 rounded-xl" style={{ background: '#0000FF', boxShadow: '0 8px 32px rgba(0,0,255,0.35)' }}>
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-4 h-4" />
            </span>
            <p className="text-white/30 text-xs mt-4 tracking-wide">One-time payment · Instant access · 30-day money back guarantee</p>
          </section>

          {/* ── 2-COL: Bullets + enrollment card ── */}
          <section className="px-5 py-16" style={{ background: '#f4f6fa' }}>
            <div className="max-w-6xl mx-auto grid" style={{ gridTemplateColumns: '1fr 360px', gap: '40px' }}>
              <div>
                <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: '#0000FF' }}>Inside {courseName || 'This Course'}</p>
                <h2 className="font-black text-gray-900 text-3xl mb-2">What&apos;s Inside This Course:</h2>
                <p className="text-gray-500 mb-8">Everything you need to find, fund, and close profitable real estate deals.</p>
                <ul className="space-y-3 mb-10">
                  {activeBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: '#0000FF' }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="border rounded-xl p-6 bg-white" style={{ borderColor: 'rgba(0,0,255,0.2)' }}>
                  <p className="font-black text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: '#0000FF' }}>This Course Is For You If:</p>
                  <ul className="space-y-2.5">
                    {forYouIf.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: '#0000FF' }}>→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Enrollment card */}
              <div>
                <div className="bg-white rounded-2xl overflow-hidden shadow-xl" style={{ borderTop: '4px solid #D4AF37' }}>
                  {courseThumbnail && (
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={courseThumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-6 py-6">
                    <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: '#D4AF37' }}>Maxxed Out University</p>
                    <h3 className="text-white font-black text-xl leading-snug mb-4">{courseName || 'Course Name'}</h3>
                    <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Your Investment</div>
                    <div className="text-white font-black text-4xl">{fmtPrice(coursePrice)}</div>
                    <div className="text-white/30 text-xs mt-1">One-time payment · No recurring fees</div>
                  </div>
                  <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">What&apos;s Included</p>
                    <ul className="space-y-2.5">
                      {['Immediate access upon enrollment', 'All course modules & materials', 'Certificate of completion', 'Lifetime access on any device', '30-day money back guarantee'].map((item) => (
                        <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0000FF' }} strokeWidth={3} />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 py-5 text-center">
                    <span className="w-full flex items-center justify-center gap-2 text-white font-black text-[12px] tracking-[0.15em] uppercase py-4 rounded-xl" style={{ background: '#0000FF' }}>
                      {cta} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex items-center justify-center gap-1.5 text-gray-400 text-[11px] mt-3">
                      <Shield className="w-3 h-3" /> Secure checkout · 256-bit SSL
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURE CARDS ── */}
          <section className="bg-white px-5 py-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: '#0000FF' }}>{featureCardsLabel}</p>
                <h2 className="font-black text-gray-900 text-3xl">{featureCardsHeadline}</h2>
                <p className="text-gray-500 mt-3 max-w-lg mx-auto text-base">{featureCardsSub}</p>
              </div>
              <div className="grid grid-cols-3 gap-5">
                {featureCards.map((card) => (
                  <div key={card.title} className="rounded-2xl p-6" style={{ background: '#f4f6fa' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(0,0,255,0.08)' }}>
                      <div className="w-5 h-5 rounded" style={{ background: '#0000FF' }} />
                    </div>
                    <h3 className="font-black text-gray-900 text-[15px] uppercase tracking-wide mb-2">{card.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── COURSES INCLUDED ── */}
          {featuredCourses.length > 0 && (
            <section className="px-5 py-20" style={{ background: '#f4f6fa' }}>
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: '#0000FF' }}>{coursesLabel}</p>
                  <h2 className="font-black text-gray-900 text-3xl">{coursesHeadline}</h2>
                  <p className="text-gray-500 mt-3 max-w-lg mx-auto text-base">{coursesSubheadline}</p>
                </div>
                <div className={`grid gap-5 ${
                  featuredCourses.length === 1 ? 'max-w-sm mx-auto' :
                  featuredCourses.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
                  'grid-cols-3'
                }`}>
                  {featuredCourses.map((course) => (
                    <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="relative aspect-video bg-gray-100 overflow-hidden">
                        {course.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                            <BookOpen className="w-10 h-10 text-white/20" />
                          </div>
                        )}
                        {course.price && (
                          <div className="absolute top-3 right-3 rounded-lg px-2.5 py-1 text-white font-black text-sm" style={{ background: 'rgba(0,0,0,0.65)' }}>
                            {fmtPrice(course.price)}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-black text-gray-900 text-[15px] leading-snug mb-3">{course.title}</h3>
                        <span className="inline-flex items-center gap-1.5 text-white font-bold text-[11px] tracking-wide uppercase px-4 py-2 rounded-lg" style={{ background: '#0000FF' }}>
                          {cta} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── MEET TODD ── */}
          <section className="px-5 py-20" style={{ background: featuredCourses.length > 0 ? '#fff' : '#f4f6fa' }}>
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden aspect-[4/5] max-w-[440px]" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.15)' }}>
                      <span className="text-3xl font-black" style={{ color: '#D4AF37' }}>TP</span>
                    </div>
                    <p className="text-white/60 text-sm">Instructor Photo</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: '#0000FF' }}>Your Instructor</p>
                <h2 className="font-black text-gray-900 text-4xl mb-6 leading-tight">
                  Meet <span style={{ color: '#0000FF' }}>Todd Pultz</span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Todd Pultz is a nine-figure entrepreneur who built his empire from nothing. Growing up broke with no money, no connections, and no roadmap, he made every mistake imaginable.
                </p>
                <p className="text-gray-600 leading-relaxed mb-8">
                  What changed everything wasn&apos;t working harder — it was learning how entrepreneurship and real estate actually work.
                </p>
                <span className="inline-flex items-center gap-2 text-white font-black text-[12px] tracking-[0.15em] uppercase px-8 py-4 rounded-xl" style={{ background: '#0000FF' }}>
                  Learn From Todd <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </section>

          {/* ── TESTIMONIALS ── */}
          {activeTestimonials.length > 0 && (
            <section className="bg-white px-5 py-20">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: '#0000FF' }}>Real Results</p>
                  <h2 className="font-black text-gray-900 text-3xl">What Students Are Saying</h2>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {activeTestimonials.map((t, i) => (
                    <div key={i} className="rounded-2xl p-6 flex flex-col" style={{ background: '#f4f6fa' }}>
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className="w-3.5 h-3.5" style={{ color: '#D4AF37', fill: '#D4AF37' }} />
                        ))}
                      </div>
                      {t.result && (
                        <div className="rounded-lg px-3 py-2 mb-4 border" style={{ background: 'rgba(0,0,255,0.04)', borderColor: 'rgba(0,0,255,0.12)' }}>
                          <p className="font-bold text-[11px] uppercase tracking-wide" style={{ color: '#0000FF' }}>{t.result}</p>
                        </div>
                      )}
                      {t.text && <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4 italic">&ldquo;{t.text}&rdquo;</p>}
                      <div className="border-t border-gray-200 pt-4">
                        <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                        {t.location && <p className="text-gray-400 text-xs mt-0.5">{t.location}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── SOCIAL PROOF ── */}
          <section className="border-y border-gray-200 px-5 py-8" style={{ background: '#f4f6fa' }}>
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-16">
              {[
                { value: '2,400+', label: 'Students Enrolled', color: '#0000FF' },
                { value: '4.9 / 5', label: 'Average Rating', color: '#D4AF37' },
                { value: '30-Day', label: 'Money Back Guarantee', color: '#16a34a' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${s.color}14` }}>
                    <div className="w-5 h-5 rounded" style={{ background: s.color }} />
                  </div>
                  <div>
                    <div className="font-black text-xl text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 py-24 text-center">
            <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-5" style={{ color: '#D4AF37' }}>Ready to Build Your Empire?</p>
            <h2 className="font-black text-white text-5xl leading-tight tracking-tight mb-5 max-w-3xl mx-auto">
              Ready To <span style={{ color: '#0000FF' }}>Change Your Life?</span>
            </h2>
            <p className="text-white/50 text-base max-w-lg mx-auto mb-12 leading-relaxed">
              Stop working hard and staying stuck. Learn the mindset and strategies that actually build wealth.
            </p>
            <span className="inline-flex items-center gap-2.5 text-white font-black text-[13px] tracking-[0.15em] uppercase px-12 py-5 rounded-xl" style={{ background: '#0000FF', boxShadow: '0 8px 32px rgba(0,0,255,0.35)' }}>
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-4 h-4" />
            </span>
            <p className="text-white/25 text-xs mt-4">Secure checkout · 256-bit SSL · 30-day money back guarantee</p>
          </section>

          {/* ── Footer ── */}
          <footer className="bg-black px-5 py-8 text-center">
            <p className="text-gray-600 text-xs">© 2026 Maxxed Out University · All rights reserved</p>
          </footer>

        </div>
      </div>
    </div>
  );
}


// ── Mini Section Previews (for Content tab) ────────────────────────
const MINI_RENDER_WIDTH = 1000;
const MINI_SCALE = 0.55;

function MiniPreviewHero({ headline, subheadline, ctaText, coursePrice }: { headline: string; subheadline: string; ctaText: string; coursePrice: number | null }) {
  const cta = ctaText || 'Enroll Now';
  const fmtPrice = (cents: number | null) => cents === null ? '—' : `$${(cents / 100).toFixed(0)}`;
  return (
    <div className="overflow-hidden" style={{ height: `${360}px` }}>
      <div className="origin-top-left select-none pointer-events-none" style={{ width: `${MINI_RENDER_WIDTH}px`, transform: `scale(${MINI_SCALE})`, transformOrigin: 'top left' }}>
        <div className="font-sans" style={{ width: `${MINI_RENDER_WIDTH}px` }}>
          <header className="bg-white shadow-sm" style={{ borderTop: '3px solid #0000FF' }}>
            <div className="max-w-5xl mx-auto px-5 h-[50px] flex items-center justify-between">
              <span className="font-black text-[10px] tracking-[0.2em] uppercase text-gray-900">Maxxed Out University</span>
              <span className="text-white font-black text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded-lg" style={{ background: '#0000FF' }}>{cta}</span>
            </div>
          </header>
          <section style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 pt-14 pb-10 text-center">
            <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D4AF37' }} />
              <span className="text-white/70 font-bold text-[9px] tracking-[0.2em] uppercase">Now Enrolling — Join From Anywhere</span>
            </div>
            <h1 className="font-black text-white text-4xl leading-[1.1] tracking-tight max-w-[700px] mx-auto mb-5">
              {(headline || 'Your Headline Here').split(' ').map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z-]/g, '');
                const accent = new Set(['real', 'exact', 'nine-figure', 'empire', 'investors', 'wealth', 'system', 'blueprint']);
                return accent.has(clean) ? <span key={i} style={{ color: '#0000FF' }}>{word} </span> : <span key={i}>{word} </span>;
              })}
            </h1>
            <p className="text-white/60 text-base max-w-[480px] mx-auto mb-8 leading-relaxed">{subheadline || 'Your subheadline goes here'}</p>
            <div className="max-w-[700px] mx-auto mb-8 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
              <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#0a1628' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,255,0.9)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                  </div>
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-white font-black text-[11px] tracking-[0.15em] uppercase px-8 py-4 rounded-xl" style={{ background: '#0000FF', boxShadow: '0 8px 32px rgba(0,0,255,0.35)' }}>
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <p className="text-white/30 text-xs mt-3 tracking-wide">One-time payment · Instant access · 30-day money back guarantee</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniPreviewBullets({ bullets, courseName }: { bullets: string[]; courseName: string }) {
  const activeBullets = bullets.filter(Boolean);
  return (
    <div className="overflow-hidden" style={{ height: `${400}px` }}>
      <div className="origin-top-left select-none pointer-events-none" style={{ width: `${MINI_RENDER_WIDTH}px`, transform: `scale(${MINI_SCALE})`, transformOrigin: 'top left' }}>
        <div className="font-sans" style={{ width: `${MINI_RENDER_WIDTH}px` }}>
          <section className="px-5 py-12" style={{ background: '#f4f6fa' }}>
            <div className="max-w-5xl mx-auto">
              <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: '#0000FF' }}>Inside {courseName || 'This Course'}</p>
              <h2 className="font-black text-gray-900 text-2xl mb-2">What&apos;s Inside This Course:</h2>
              <p className="text-gray-500 text-sm mb-6">Everything you need to find, fund, and close profitable real estate deals.</p>
              <ul className="space-y-2.5">
                {(activeBullets.length > 0 ? activeBullets : ['Add your first bullet point…']).map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: '#0000FF' }}>
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                    <span className={`font-semibold text-sm ${activeBullets.length > 0 ? 'text-gray-800' : 'text-gray-400 italic'}`}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniPreviewTestimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const activeTestimonials = testimonials.filter(t => t.name || t.text);
  if (activeTestimonials.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Add testimonials to see preview</p>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden" style={{ height: `${400}px` }}>
      <div className="origin-top-left select-none pointer-events-none" style={{ width: `${MINI_RENDER_WIDTH}px`, transform: `scale(${MINI_SCALE})`, transformOrigin: 'top left' }}>
        <div className="font-sans" style={{ width: `${MINI_RENDER_WIDTH}px` }}>
          <section className="bg-white px-5 py-14">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: '#0000FF' }}>Real Results</p>
                <h2 className="font-black text-gray-900 text-2xl">What Students Are Saying</h2>
              </div>
              <div className={`grid gap-4 ${activeTestimonials.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : activeTestimonials.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-3'}`}>
                {activeTestimonials.map((t, i) => (
                  <div key={i} className="rounded-2xl p-5 flex flex-col" style={{ background: '#f4f6fa' }}>
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="w-3 h-3" style={{ color: '#D4AF37', fill: '#D4AF37' }} />
                      ))}
                    </div>
                    {t.result && (
                      <div className="rounded-lg px-2.5 py-1.5 mb-3 border" style={{ background: 'rgba(0,0,255,0.04)', borderColor: 'rgba(0,0,255,0.12)' }}>
                        <p className="font-bold text-[10px] uppercase tracking-wide" style={{ color: '#0000FF' }}>{t.result}</p>
                      </div>
                    )}
                    {t.text && <p className="text-gray-600 text-xs leading-relaxed flex-1 mb-3 italic">&ldquo;{t.text}&rdquo;</p>}
                    <div className="border-t border-gray-200 pt-3">
                      <p className="font-bold text-gray-900 text-xs">{t.name}</p>
                      {t.location && <p className="text-gray-400 text-[10px] mt-0.5">{t.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniPreviewCourses({ featuredCourses, ctaText }: { featuredCourses: Course[]; ctaText: string }) {
  const cta = ctaText || 'Enroll Now';
  const fmtPrice = (cents: number | null) => cents === null ? '—' : `$${(cents / 100).toFixed(0)}`;
  if (featuredCourses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Select featured courses in Settings tab</p>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden" style={{ height: '400px' }}>
      <div className="origin-top-left select-none pointer-events-none" style={{ width: `${MINI_RENDER_WIDTH}px`, transform: `scale(${MINI_SCALE})`, transformOrigin: 'top left' }}>
        <div className="font-sans" style={{ width: `${MINI_RENDER_WIDTH}px` }}>
          <section className="px-5 py-14" style={{ background: '#f4f6fa' }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: '#0000FF' }}>The Curriculum</p>
                <h2 className="font-black text-gray-900 text-2xl">Courses Included</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm">Everything you need to go from zero to cash-flowing — in one place.</p>
              </div>
              <div className={`grid gap-4 ${
                featuredCourses.length === 1 ? 'max-w-xs mx-auto' :
                featuredCourses.length === 2 ? 'grid-cols-2 max-w-xl mx-auto' :
                'grid-cols-3'
              }`}>
                {featuredCourses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="relative aspect-video bg-gray-100 overflow-hidden">
                      {course.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                          <BookOpen className="w-8 h-8 text-white/20" />
                        </div>
                      )}
                      {course.price && (
                        <div className="absolute top-2 right-2 rounded-md px-2 py-0.5 text-white font-black text-xs" style={{ background: 'rgba(0,0,0,0.65)' }}>
                          {fmtPrice(course.price)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-black text-gray-900 text-xs leading-snug mb-2">{course.title}</h3>
                      <span className="inline-flex items-center gap-1 text-white font-bold text-[9px] tracking-wide uppercase px-3 py-1.5 rounded-md" style={{ background: '#0000FF' }}>
                        {cta} <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Main Editor ─────────────────────────────────────────────────────
export default function FunnelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'content' | 'preview'>('settings');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [courseId, setCourseId] = useState('');
  const [featuredCourseIds, setFeaturedCourseIds] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(true);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [bullets, setBullets] = useState<string[]>(['']);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>(DEFAULT_FEATURE_CARDS);
  const [forYouIf, setForYouIf] = useState<string[]>(DEFAULT_FOR_YOU_IF);
  const [coursesLabel, setCoursesLabel] = useState('The Curriculum');
  const [coursesHeadline, setCoursesHeadline] = useState('Courses Included');
  const [coursesSubheadline, setCoursesSubheadline] = useState('Everything you need to go from zero to cash-flowing — in one place.');
  const [featureCardsLabel, setFeatureCardsLabel] = useState('Inside This Course');
  const [featureCardsHeadline, setFeatureCardsHeadline] = useState("What You'll Learn");
  const [featureCardsSub, setFeatureCardsSub] = useState('No hype. No fluff. No motivational nonsense. Just real strategies that work.');

  // Measure preview container width for accurate scaling
  useEffect(() => {
    if (activeTab !== 'preview') return;
    const el = previewContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPreviewWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab]);

  const load = useCallback(async () => {
    const [f, c] = await Promise.all([
      fetch(`/api/admin/funnels/${id}`).then((r) => r.json()),
      fetch('/api/admin/courses').then((r) => r.json()),
    ]);
    setFunnel(f);
    setCourses(Array.isArray(c) ? c.filter((c: Course & { published: boolean }) => c.published) : []);

    setName(f.name ?? '');
    setUrl(f.url ?? '');
    setCourseId(f.courseId ?? '');
    setFeaturedCourseIds(new Set((f.featuredCourses ?? []).map((c: Course) => c.id)));
    setActive(f.active ?? true);
    setHeadline(f.config?.headline ?? '');
    setSubheadline(f.config?.subheadline ?? '');
    setCtaText(f.config?.ctaText ?? '');
    setBullets(f.config?.bulletPoints?.length ? f.config.bulletPoints : ['']);
    setTestimonials(f.config?.testimonials?.length ? f.config.testimonials : []);
    setFeatureCards(f.config?.featureCards?.length ? f.config.featureCards : DEFAULT_FEATURE_CARDS);
    setForYouIf(f.config?.forYouIf?.length ? f.config.forYouIf : DEFAULT_FOR_YOU_IF);
    setCoursesLabel(f.config?.coursesLabel ?? 'The Curriculum');
    setCoursesHeadline(f.config?.coursesHeadline ?? 'Courses Included');
    setCoursesSubheadline(f.config?.coursesSubheadline ?? 'Everything you need to go from zero to cash-flowing — in one place.');
    setFeatureCardsLabel(f.config?.featureCardsLabel ?? 'Inside This Course');
    setFeatureCardsHeadline(f.config?.featureCardsHeadline ?? "What You'll Learn");
    setFeatureCardsSub(f.config?.featureCardsSub ?? 'No hype. No fluff. No motivational nonsense. Just real strategies that work.');
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/funnels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, url, courseId: courseId || null, active,
          featuredCourseIds: Array.from(featuredCourseIds),
          headline: headline || null,
          subheadline: subheadline || null,
          ctaText: ctaText || null,
          bulletPoints: bullets.filter(Boolean),
          testimonials,
          featureCards: featureCards.filter(c => c.title || c.body),
          forYouIf: forYouIf.filter(Boolean),
          coursesLabel: coursesLabel || null,
          coursesHeadline: coursesHeadline || null,
          coursesSubheadline: coursesSubheadline || null,
          featureCardsLabel: featureCardsLabel || null,
          featureCardsHeadline: featureCardsHeadline || null,
          featureCardsSub: featureCardsSub || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function rotateKey() {
    if (!confirm('Rotate the API key? Update FUNNEL_API_KEY in your funnel deployment after rotating.')) return;
    const res = await fetch(`/api/admin/funnels/${id}/rotate-key`, { method: 'POST' });
    if (res.ok) load();
  }

  async function copyKey() {
    if (!funnel) return;
    await navigator.clipboard.writeText(funnel.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function addBullet() { setBullets([...bullets, '']); }
  function removeBullet(i: number) { setBullets(bullets.filter((_, idx) => idx !== i)); }
  function updateBullet(i: number, val: string) { setBullets(bullets.map((b, idx) => idx === i ? val : b)); }

  function addTestimonial() {
    setTestimonials([...testimonials, { name: '', location: '', result: '', text: '' }]);
  }
  function removeTestimonial(i: number) { setTestimonials(testimonials.filter((_, idx) => idx !== i)); }
  function updateTestimonial(i: number, field: keyof Testimonial, val: string) {
    setTestimonials(testimonials.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  function formatPrice(cents: number | null) {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(0)}`;
  }

  const selectedCourse = courses.find(c => c.id === courseId) ?? null;
  const resolvedFeaturedCourses = courses.filter(c => featuredCourseIds.has(c.id));

  if (!funnel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-12 w-72 bg-gray-100 rounded-lg animate-pulse" />
        <Card><CardContent className="p-6"><div className="h-96 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/funnels')}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{funnel.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Edit funnel settings and content</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {funnel.url && (
            <a href={funnel.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <ExternalLink className="w-4 h-4" /> View Live
            </a>
          )}
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {([
            { key: 'settings', label: 'Settings', icon: Settings },
            { key: 'content', label: 'Content', icon: FileText },
            { key: 'preview', label: 'Preview', icon: Eye },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Save — always visible */}
        <div className="flex items-center gap-3">
          {saveError && <p className="text-red-500 text-sm font-medium">{saveError}</p>}
          {saved && <p className="text-green-600 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Saved</p>}
          {!saveError && !saved && activeTab !== 'preview' && (
            <p className="text-gray-400 text-sm">Unsaved changes won&apos;t go live</p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* ── TAB: Settings ── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-900">General</h2></div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deployed URL</label>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://funnel.maxxedout.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Course <span className="text-gray-400 font-normal">(checkout)</span></label>
                    <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue">
                      <option value="">— No course —</option>
                      {courses.map((c) => (<option key={c.id} value={c.id}>{c.title} ({formatPrice(c.price)})</option>))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-maxxed-blue' : 'bg-gray-300'}`} onClick={() => setActive(!active)}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Featured Courses</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{featuredCourseIds.size} of {courses.length} selected</p>
                </div>
                {courses.length > 6 && (
                  <button onClick={() => setShowAllCourses(!showAllCourses)} className="flex items-center gap-1 text-sm text-maxxed-blue font-medium hover:underline">
                    {showAllCourses ? 'Show less' : 'Show all'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllCourses ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              <div className="p-6">
                {courses.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No published courses yet.</p>
                ) : (
                  <div className={`grid grid-cols-2 gap-3 ${!showAllCourses && courses.length > 6 ? 'max-h-[280px] overflow-hidden relative' : ''}`}>
                    {(showAllCourses ? courses : courses.slice(0, 8)).map((c) => {
                      const selected = featuredCourseIds.has(c.id);
                      return (
                        <button key={c.id} type="button"
                          onClick={() => { setFeaturedCourseIds((prev) => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; }); }}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${selected ? 'border-maxxed-blue bg-blue-50/50 ring-1 ring-maxxed-blue/20' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {c.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold">No img</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${selected ? 'text-maxxed-blue' : 'text-gray-900'}`}>{c.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatPrice(c.price)}</p>
                          </div>
                          {selected && <div className="w-5 h-5 rounded-full bg-maxxed-blue flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                        </button>
                      );
                    })}
                    {!showAllCourses && courses.length > 6 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none col-span-full" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <h2 className="font-bold text-gray-900">API Key</h2>
                <p className="text-sm text-gray-500 mt-0.5">Set as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">FUNNEL_API_KEY</code> in your funnel deployment.</p>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 break-all">{funnel.apiKey}</code>
                  <button onClick={copyKey} className="p-2.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={rotateKey} title="Rotate key" className="p-2.5 text-gray-400 hover:text-orange-500 border border-gray-200 rounded-lg hover:bg-orange-50 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Content ── */}
      {activeTab === 'content' && (
        <div className="space-y-8">
          {/* ── Headlines & CTA + Hero Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-900">Headlines & CTA</h2></div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                    <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="The exact system Todd used to build a multi-million dollar portfolio…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                    <textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} rows={2} placeholder="Step-by-step. No fluff. Just results." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                    <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Enroll Now" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Mini Hero Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2">Hero Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '360px' }}>
                <MiniPreviewHero headline={headline} subheadline={subheadline} ctaText={ctaText} coursePrice={selectedCourse?.price ?? funnel.course?.price ?? null} />
              </div>
            </div>
          </div>

          {/* ── Bullets + Bullets Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">What You&apos;ll Learn</h2>
                  <button onClick={addBullet} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="p-6 space-y-2">
                  {bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0 font-medium">{i + 1}</div>
                      <input value={b} onChange={(e) => updateBullet(i, e.target.value)} placeholder={`Benefit ${i + 1}`} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                      <button onClick={() => removeBullet(i)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* Mini Bullets Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2">What You&apos;ll Learn Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '400px' }}>
                <MiniPreviewBullets bullets={bullets} courseName={selectedCourse?.title ?? funnel.course?.title ?? ''} />
              </div>
            </div>
          </div>

          {/* ── Feature Cards Section ── */}
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <h2 className="font-bold text-gray-900">Feature Cards Section</h2>
                <p className="text-sm text-gray-500 mt-0.5">The &ldquo;What You&apos;ll Learn&rdquo; grid of feature cards on the funnel page.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Label</label>
                    <input value={featureCardsLabel} onChange={(e) => setFeatureCardsLabel(e.target.value)} placeholder="Inside This Course" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Headline</label>
                    <input value={featureCardsHeadline} onChange={(e) => setFeatureCardsHeadline(e.target.value)} placeholder="What You'll Learn" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Subtext</label>
                    <input value={featureCardsSub} onChange={(e) => setFeatureCardsSub(e.target.value)} placeholder="No hype. No fluff..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Cards</p>
                    <button onClick={() => setFeatureCards([...featureCards, { title: '', body: '' }])} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium">
                      <Plus className="w-3.5 h-3.5" /> Add Card
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {featureCards.map((card, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 relative group">
                        <button onClick={() => setFeatureCards(featureCards.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                        <input value={card.title} onChange={(e) => { const updated = [...featureCards]; updated[i] = { ...updated[i], title: e.target.value }; setFeatureCards(updated); }} placeholder="Card title" className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue font-medium" />
                        <textarea value={card.body} onChange={(e) => { const updated = [...featureCards]; updated[i] = { ...updated[i], body: e.target.value }; setFeatureCards(updated); }} placeholder="Card description" rows={2} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue resize-none" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── "For You If" Items ── */}
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">This Course Is For You If</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Shown alongside the bullet points section.</p>
                </div>
                <button onClick={() => setForYouIf([...forYouIf, ''])} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <div className="p-6 space-y-2">
                {forYouIf.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-maxxed-blue font-bold flex-shrink-0">→</span>
                    <input value={item} onChange={(e) => { const updated = [...forYouIf]; updated[i] = e.target.value; setForYouIf(updated); }} placeholder={`Reason ${i + 1}`} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                    <button onClick={() => setForYouIf(forYouIf.filter((_, j) => j !== i))} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Testimonials + Testimonials Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">Testimonials</h2>
                  <button onClick={addTestimonial} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {testimonials.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No testimonials yet</p>
                    </div>
                  ) : testimonials.map((t, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Testimonial {i + 1}</span>
                        <button onClick={() => removeTestimonial(i)} className="p-1 text-gray-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Name</label>
                          <input value={t.name} onChange={(e) => updateTestimonial(i, 'name', e.target.value)} placeholder="Marcus R." className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Location</label>
                          <input value={t.location} onChange={(e) => updateTestimonial(i, 'location', e.target.value)} placeholder="Atlanta, GA" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Result highlight</label>
                        <input value={t.result} onChange={(e) => updateTestimonial(i, 'result', e.target.value)} placeholder="Closed first deal in 60 days" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quote</label>
                        <textarea value={t.text} onChange={(e) => updateTestimonial(i, 'text', e.target.value)} rows={2} placeholder="This course changed everything for me…" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue resize-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* Mini Testimonials Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2">Testimonials Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '400px' }}>
                <MiniPreviewTestimonials testimonials={testimonials} />
              </div>
            </div>
          </div>

          {/* ── Courses Included Section Headers ── */}
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <h2 className="font-bold text-gray-900">Courses Included Section</h2>
                <p className="text-sm text-gray-500 mt-0.5">Header text for the featured courses grid on the funnel page.</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Label</label>
                    <input value={coursesLabel} onChange={(e) => setCoursesLabel(e.target.value)} placeholder="The Curriculum" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Headline</label>
                    <input value={coursesHeadline} onChange={(e) => setCoursesHeadline(e.target.value)} placeholder="Courses Included" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Subtext</label>
                    <input value={coursesSubheadline} onChange={(e) => setCoursesSubheadline(e.target.value)} placeholder="Everything you need..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Featured Courses + Courses Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-bold text-gray-900">Featured Courses</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Select courses to display in the Settings tab. Each will show an &ldquo;Enroll Now&rdquo; button on the funnel.</p>
                </div>
                <div className="p-6">
                  {resolvedFeaturedCourses.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No featured courses selected</p>
                      <p className="text-xs mt-1">Go to the Settings tab to select courses</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resolvedFeaturedCourses.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                            {c.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                                <BookOpen className="w-4 h-4 text-white/30" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">{c.title}</p>
                            <p className="text-xs text-gray-400">{c.price ? `$${(c.price / 100).toFixed(0)}` : 'Free'}</p>
                          </div>
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Mini Courses Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2">Courses Included Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '400px' }}>
                <MiniPreviewCourses featuredCourses={resolvedFeaturedCourses} ctaText={ctaText} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Preview ── */}
      {activeTab === 'preview' && (
        <div className="space-y-3 overflow-hidden">
          {/* Browser frame */}
          <div className="bg-gray-950 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-lg">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 mx-3 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-500 font-mono truncate">
                {funnel.url || 'https://funnel.maxxedout.com'}
              </div>
            </div>
            {/* Viewport */}
            <div ref={previewContainerRef} className="overflow-hidden bg-white">
              {previewWidth > 0 && (
                <FunnelPreview
                  headline={headline}
                  subheadline={subheadline}
                  ctaText={ctaText}
                  bullets={bullets}
                  testimonials={testimonials}
                  courseName={selectedCourse?.title ?? funnel.course?.title ?? ''}
                  coursePrice={selectedCourse?.price ?? funnel.course?.price ?? null}
                  courseThumbnail={selectedCourse?.thumbnail ?? funnel.course?.thumbnail ?? null}
                  containerWidth={previewWidth}
                  featuredCourses={resolvedFeaturedCourses}
                  featureCards={featureCards.filter(c => c.title || c.body)}
                  forYouIf={forYouIf.filter(Boolean)}
                  coursesLabel={coursesLabel || 'The Curriculum'}
                  coursesHeadline={coursesHeadline || 'Courses Included'}
                  coursesSubheadline={coursesSubheadline || 'Everything you need to go from zero to cash-flowing — in one place.'}
                  featureCardsLabel={featureCardsLabel || 'Inside This Course'}
                  featureCardsHeadline={featureCardsHeadline || "What You'll Learn"}
                  featureCardsSub={featureCardsSub || 'No hype. No fluff. No motivational nonsense. Just real strategies that work.'}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
