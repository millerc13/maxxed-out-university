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
  subdomain: string | null;
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
    bulletsLabel: string | null;
    bulletsHeadline: string | null;
    bulletsSub: string | null;
    vslVideoUrl: string | null;
    instructorImageUrl: string | null;
    template: string | null;
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

const TEMPLATE_THEMES = {
  classic: {
    accent: '#0000FF', gold: '#D4AF37',
    heroBg: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)',
    sectionBg: '#f4f6fa', cardBg: '#f4f6fa', surfaceBg: '#fff',
    textPrimary: '#111827', textSecondary: '#6b7280',
    navBg: '#fff', navBorder: '#0000FF', navText: '#111827',
    footerBg: '#000',
  },
  dark: {
    accent: '#06b6d4', gold: '#D4AF37',
    heroBg: 'linear-gradient(160deg, #0a0e17 0%, #111827 100%)',
    sectionBg: '#111827', cardBg: '#1a1f2e', surfaceBg: '#0a0e17',
    textPrimary: '#f3f4f6', textSecondary: '#9ca3af',
    navBg: '#0a0e17', navBorder: '#06b6d4', navText: '#f3f4f6',
    footerBg: '#050810',
  },
  bold: {
    accent: '#dc2626', gold: '#dc2626',
    heroBg: '#ffffff',
    sectionBg: '#000000', cardBg: '#000000', surfaceBg: '#ffffff',
    textPrimary: '#000000', textSecondary: '#4b5563',
    navBg: '#000000', navBorder: '#dc2626', navText: '#ffffff',
    footerBg: '#000000',
  },
} as const;

function FunnelPreview({
  headline, subheadline, ctaText, bullets, testimonials, courseName, coursePrice, courseThumbnail, containerWidth, featuredCourses,
  featureCards, forYouIf, coursesLabel, coursesHeadline, coursesSubheadline, featureCardsLabel, featureCardsHeadline, featureCardsSub,
  bulletsLabel, bulletsHeadline, bulletsSub,
  vslVideoUrl, instructorImageUrl, template = 'classic',
}: {
  headline: string; subheadline: string; ctaText: string; bullets: string[];
  testimonials: Testimonial[]; courseName: string; coursePrice: number | null;
  courseThumbnail: string | null; containerWidth: number; featuredCourses: Course[];
  featureCards: FeatureCard[]; forYouIf: string[];
  coursesLabel: string; coursesHeadline: string; coursesSubheadline: string;
  featureCardsLabel: string; featureCardsHeadline: string; featureCardsSub: string;
  bulletsLabel: string; bulletsHeadline: string; bulletsSub: string;
  vslVideoUrl: string; instructorImageUrl: string; template?: string;
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
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const isBold = template === 'bold';

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
          <header className="shadow-sm" style={{ background: theme.navBg, borderTop: `3px solid ${theme.navBorder}` }}>
            <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-black text-[11px] tracking-[0.2em] uppercase" style={{ color: theme.navText }}>
                  Maxxed Out University
                </span>
              </div>
              <span className="text-white font-black text-[11px] tracking-[0.15em] uppercase px-5 py-2.5 rounded-lg" style={{ background: theme.accent }}>
                {cta}
              </span>
            </div>
          </header>

          {/* ── HERO ── */}
          <section style={{ background: isBold ? theme.heroBg : theme.heroBg }} className="px-5 pt-16 pb-12 text-center">
            <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-8 ${isBold ? 'border-gray-300' : 'border-white/20'}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.gold }} />
              <span className={`font-bold text-[10px] tracking-[0.2em] uppercase ${isBold ? 'text-gray-500' : 'text-white/70'}`}>Now Enrolling — Join From Anywhere</span>
            </div>
            <h1 className={`font-black text-5xl leading-[1.08] tracking-tight max-w-[820px] mx-auto mb-6 ${isBold ? 'text-black' : 'text-white'}`}>
              {(headline || 'Your Headline Here').split(' ').map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z-]/g, '');
                const accent = new Set(['real', 'exact', 'nine-figure', 'empire', 'investors', 'wealth', 'system', 'blueprint']);
                return accent.has(clean)
                  ? <span key={i} style={{ color: theme.accent }}>{word} </span>
                  : <span key={i}>{word} </span>;
              })}
            </h1>
            <p className={`text-lg max-w-[560px] mx-auto mb-10 leading-relaxed ${isBold ? 'text-gray-500' : 'text-white/60'}`}>
              {subheadline || 'Your subheadline goes here'}
            </p>
            {/* VSL video or placeholder */}
            <div className="max-w-[860px] mx-auto mb-10 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
              {vslVideoUrl ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe src={vslVideoUrl} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                </div>
              ) : (
                <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#0a1628' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,255,0.9)', boxShadow: '0 0 40px rgba(0,0,255,0.4)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                    </div>
                    <p className="text-white/40 text-sm font-semibold tracking-wide">Add a VSL video URL in the Content tab</p>
                  </div>
                </div>
              )}
            </div>
            <span className="inline-flex items-center gap-2.5 text-white font-black text-[13px] tracking-[0.15em] uppercase px-10 py-5 rounded-xl" style={{ background: theme.accent, boxShadow: `0 8px 32px ${theme.accent}59` }}>
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-4 h-4" />
            </span>
            <p className={`text-xs mt-4 tracking-wide ${isBold ? 'text-gray-400' : 'text-white/30'}`}>One-time payment · Instant access · 30-day money back guarantee</p>
          </section>

          {/* ── 2-COL: Bullets + enrollment card ── */}
          <section className="px-5 py-16" style={{ background: theme.sectionBg }}>
            <div className="max-w-6xl mx-auto grid" style={{ gridTemplateColumns: '1fr 360px', gap: '40px' }}>
              <div>
                <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: theme.accent }}>{bulletsLabel}</p>
                <h2 className="font-black text-3xl mb-2" style={{ color: theme.textPrimary }}>{bulletsHeadline}</h2>
                <p style={{ color: theme.textSecondary }} className="mb-8">{bulletsSub}</p>
                <ul className="space-y-3 mb-10">
                  {activeBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: theme.accent }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                      <span className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="border rounded-xl p-6" style={{ borderColor: `${theme.accent}33`, background: isDark ? theme.cardBg : '#fff' }}>
                  <p className="font-black text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: theme.accent }}>This Course Is For You If:</p>
                  <ul className="space-y-2.5">
                    {forYouIf.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: theme.textSecondary }}>
                        <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: theme.accent }}>→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Enrollment card */}
              <div>
                <div className="rounded-2xl overflow-hidden shadow-xl" style={{ borderTop: `4px solid ${theme.gold}`, background: isDark ? theme.cardBg : '#fff' }}>
                  {courseThumbnail && (
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={courseThumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div style={{ background: isBold ? '#000' : 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-6 py-6">
                    <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: theme.gold }}>Maxxed Out University</p>
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
                    <span className="w-full flex items-center justify-center gap-2 text-white font-black text-[12px] tracking-[0.15em] uppercase py-4 rounded-xl" style={{ background: theme.accent }}>
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
          <section className="px-5 py-20" style={{ background: isDark ? theme.surfaceBg : '#fff' }}>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: theme.accent }}>{featureCardsLabel}</p>
                <h2 className="font-black text-3xl" style={{ color: theme.textPrimary }}>{featureCardsHeadline}</h2>
                <p className="mt-3 max-w-lg mx-auto text-base" style={{ color: theme.textSecondary }}>{featureCardsSub}</p>
              </div>
              <div className="grid grid-cols-3 gap-5">
                {featureCards.map((card) => (
                  <div key={card.title} className="rounded-2xl p-6" style={{ background: isDark ? theme.cardBg : theme.sectionBg }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${theme.accent}14` }}>
                      <div className="w-5 h-5 rounded" style={{ background: theme.accent }} />
                    </div>
                    <h3 className="font-black text-[15px] uppercase tracking-wide mb-2" style={{ color: theme.textPrimary }}>{card.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── COURSES INCLUDED ── */}
          {featuredCourses.length > 0 && (
            <section className="px-5 py-20" style={{ background: theme.sectionBg }}>
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: theme.accent }}>{coursesLabel}</p>
                  <h2 className="font-black text-3xl" style={{ color: theme.textPrimary }}>{coursesHeadline}</h2>
                  <p className="mt-3 max-w-lg mx-auto text-base" style={{ color: theme.textSecondary }}>{coursesSubheadline}</p>
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
                        <span className="inline-flex items-center gap-1.5 text-white font-bold text-[11px] tracking-wide uppercase px-4 py-2 rounded-lg" style={{ background: theme.accent }}>
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
          <section className="px-5 py-20" style={{ background: isDark ? theme.sectionBg : (featuredCourses.length > 0 ? '#fff' : '#f4f6fa') }}>
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden aspect-[4/5] max-w-[440px]" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                {instructorImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={instructorImageUrl} alt="Instructor" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.15)' }}>
                        <span className="text-3xl font-black" style={{ color: theme.gold }}>TP</span>
                      </div>
                      <p className="text-white/60 text-sm">Add instructor photo in Content tab</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: theme.accent }}>Your Instructor</p>
                <h2 className="font-black text-4xl mb-6 leading-tight" style={{ color: theme.textPrimary }}>
                  Meet <span style={{ color: theme.accent }}>Todd Pultz</span>
                </h2>
                <p className="leading-relaxed mb-4" style={{ color: theme.textSecondary }}>
                  Todd Pultz is a nine-figure entrepreneur who built his empire from nothing. Growing up broke with no money, no connections, and no roadmap, he made every mistake imaginable.
                </p>
                <p className="leading-relaxed mb-8" style={{ color: theme.textSecondary }}>
                  What changed everything wasn&apos;t working harder — it was learning how entrepreneurship and real estate actually work.
                </p>
                <span className="inline-flex items-center gap-2 text-white font-black text-[12px] tracking-[0.15em] uppercase px-8 py-4 rounded-xl" style={{ background: theme.accent }}>
                  Learn From Todd <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </section>

          {/* ── TESTIMONIALS ── */}
          {activeTestimonials.length > 0 && (
            <section className="px-5 py-20" style={{ background: isDark ? theme.surfaceBg : '#fff' }}>
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: theme.accent }}>Real Results</p>
                  <h2 className="font-black text-3xl" style={{ color: theme.textPrimary }}>What Students Are Saying</h2>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {activeTestimonials.map((t, i) => (
                    <div key={i} className="rounded-2xl p-6 flex flex-col" style={{ background: isDark ? theme.cardBg : theme.sectionBg }}>
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className="w-3.5 h-3.5" style={{ color: theme.gold, fill: theme.gold }} />
                        ))}
                      </div>
                      {t.result && (
                        <div className="rounded-lg px-3 py-2 mb-4 border" style={{ background: `${theme.accent}0a`, borderColor: `${theme.accent}1f` }}>
                          <p className="font-bold text-[11px] uppercase tracking-wide" style={{ color: theme.accent }}>{t.result}</p>
                        </div>
                      )}
                      {t.text && <p className="text-sm leading-relaxed flex-1 mb-4 italic" style={{ color: theme.textSecondary }}>&ldquo;{t.text}&rdquo;</p>}
                      <div className="pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }}>
                        <p className="font-bold text-sm" style={{ color: theme.textPrimary }}>{t.name}</p>
                        {t.location && <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>{t.location}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── SOCIAL PROOF ── */}
          <section className="px-5 py-8" style={{ background: theme.sectionBg, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb'}`, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb'}` }}>
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-16">
              {[
                { value: '2,400+', label: 'Students Enrolled', color: theme.accent },
                { value: '4.9 / 5', label: 'Average Rating', color: theme.gold },
                { value: '30-Day', label: 'Money Back Guarantee', color: '#16a34a' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${s.color}14` }}>
                    <div className="w-5 h-5 rounded" style={{ background: s.color }} />
                  </div>
                  <div>
                    <div className="font-black text-xl" style={{ color: theme.textPrimary }}>{s.value}</div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: theme.textSecondary }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section style={{ background: isBold ? '#000' : 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 py-24 text-center">
            <p className="font-bold text-[10px] tracking-[0.2em] uppercase mb-5" style={{ color: theme.gold }}>Ready to Build Your Empire?</p>
            <h2 className="font-black text-white text-5xl leading-tight tracking-tight mb-5 max-w-3xl mx-auto">
              Ready To <span style={{ color: theme.accent }}>Change Your Life?</span>
            </h2>
            <p className="text-white/50 text-base max-w-lg mx-auto mb-12 leading-relaxed">
              Stop working hard and staying stuck. Learn the mindset and strategies that actually build wealth.
            </p>
            <span className="inline-flex items-center gap-2.5 text-white font-black text-[13px] tracking-[0.15em] uppercase px-12 py-5 rounded-xl" style={{ background: theme.accent, boxShadow: `0 8px 32px ${theme.accent}59` }}>
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-4 h-4" />
            </span>
            <p className="text-white/25 text-xs mt-4">Secure checkout · 256-bit SSL · 30-day money back guarantee</p>
          </section>

          {/* ── Footer ── */}
          <footer className="px-5 py-8 text-center" style={{ background: theme.footerBg }}>
            <p className="text-gray-600 text-xs">&copy; 2026 Maxxed Out University · All rights reserved</p>
          </footer>

        </div>
      </div>
    </div>
  );
}


// ── Mini Section Previews (for Content tab) ────────────────────────
const MINI_RENDER_WIDTH = 1000;

// Wrapper that measures its own width and scales inner content to fill it
function ScaledPreviewWrapper({ children, maxHeight }: { children: React.ReactNode; maxHeight: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth > 0 ? containerWidth / MINI_RENDER_WIDTH : 0;

  return (
    <div ref={containerRef} className="relative overflow-hidden w-full" style={{ height: `${maxHeight}px` }}>
      {scale > 0 && (
        <div className="absolute top-0 left-0 origin-top-left select-none pointer-events-none" style={{ width: `${MINI_RENDER_WIDTH}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div className="font-sans" style={{ width: `${MINI_RENDER_WIDTH}px` }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniPreviewHero({ headline, subheadline, ctaText, coursePrice, vslVideoUrl, template }: { headline: string; subheadline: string; ctaText: string; coursePrice: number | null; vslVideoUrl: string; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const isBold = template === 'bold';
  const cta = ctaText || 'Enroll Now';
  const fmtPrice = (cents: number | null) => cents === null ? '—' : `$${(cents / 100).toFixed(0)}`;
  return (
    <ScaledPreviewWrapper maxHeight={420}>
          <header className="shadow-sm" style={{ background: theme.navBg, borderTop: `3px solid ${theme.navBorder}` }}>
            <div className="max-w-5xl mx-auto px-5 h-[50px] flex items-center justify-between">
              <span className="font-black text-[10px] tracking-[0.2em] uppercase" style={{ color: theme.navText }}>Maxxed Out University</span>
              <span className="text-white font-black text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded-lg" style={{ background: theme.accent }}>{cta}</span>
            </div>
          </header>
          <section style={{ background: isBold ? theme.heroBg : theme.heroBg }} className="px-5 pt-14 pb-10 text-center">
            <div className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 mb-6 ${isBold ? 'border-gray-300' : 'border-white/20'}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.gold }} />
              <span className={`font-bold text-[9px] tracking-[0.2em] uppercase ${isBold ? 'text-gray-500' : 'text-white/70'}`}>Now Enrolling — Join From Anywhere</span>
            </div>
            <h1 className={`font-black text-4xl leading-[1.1] tracking-tight max-w-[700px] mx-auto mb-5 ${isBold ? 'text-black' : 'text-white'}`}>
              {(headline || 'Your Headline Here').split(' ').map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z-]/g, '');
                const accent = new Set(['real', 'exact', 'nine-figure', 'empire', 'investors', 'wealth', 'system', 'blueprint']);
                return accent.has(clean) ? <span key={i} style={{ color: theme.accent }}>{word} </span> : <span key={i}>{word} </span>;
              })}
            </h1>
            <p className={`text-base max-w-[480px] mx-auto mb-8 leading-relaxed ${isBold ? 'text-gray-500' : 'text-white/60'}`}>{subheadline || 'Your subheadline goes here'}</p>
            <div className="max-w-[700px] mx-auto mb-8 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
              {vslVideoUrl ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe src={vslVideoUrl} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                </div>
              ) : (
                <div className="relative w-full" style={{ paddingBottom: '56.25%', background: isDark ? theme.surfaceBg : '#0a1628' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${theme.accent}e6` }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <span className="inline-flex items-center gap-2 text-white font-black text-[11px] tracking-[0.15em] uppercase px-8 py-4 rounded-xl" style={{ background: theme.accent, boxShadow: `0 8px 32px ${theme.accent}59` }}>
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <p className={`text-xs mt-3 tracking-wide ${isBold ? 'text-gray-400' : 'text-white/30'}`}>One-time payment · Instant access · 30-day money back guarantee</p>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewBullets({ bullets, label, headline, sub, template }: { bullets: string[]; label: string; headline: string; sub: string; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const activeBullets = bullets.filter(Boolean);
  return (
    <ScaledPreviewWrapper maxHeight={450}>
          <section className="px-5 py-12" style={{ background: theme.sectionBg }}>
            <div className="max-w-5xl mx-auto">
              <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: theme.accent }}>{label}</p>
              <h2 className="font-black text-2xl mb-2" style={{ color: theme.textPrimary }}>{headline}</h2>
              <p className="text-sm mb-6" style={{ color: theme.textSecondary }}>{sub}</p>
              <ul className="space-y-2.5">
                {(activeBullets.length > 0 ? activeBullets : ['Add your first bullet point…']).map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: theme.accent }}>
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                    <span className={`font-semibold text-sm ${activeBullets.length > 0 ? '' : 'italic'}`} style={{ color: activeBullets.length > 0 ? theme.textPrimary : theme.textSecondary }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewTestimonials({ testimonials, template }: { testimonials: Testimonial[]; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
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
    <ScaledPreviewWrapper maxHeight={450}>
          <section className="px-5 py-14" style={{ background: isDark ? theme.surfaceBg : '#fff' }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: theme.accent }}>Real Results</p>
                <h2 className="font-black text-2xl" style={{ color: theme.textPrimary }}>What Students Are Saying</h2>
              </div>
              <div className={`grid gap-4 ${activeTestimonials.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : activeTestimonials.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-3'}`}>
                {activeTestimonials.map((t, i) => (
                  <div key={i} className="rounded-2xl p-5 flex flex-col" style={{ background: isDark ? theme.cardBg : theme.sectionBg }}>
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="w-3 h-3" style={{ color: theme.gold, fill: theme.gold }} />
                      ))}
                    </div>
                    {t.result && (
                      <div className="rounded-lg px-2.5 py-1.5 mb-3 border" style={{ background: `${theme.accent}0a`, borderColor: `${theme.accent}1f` }}>
                        <p className="font-bold text-[10px] uppercase tracking-wide" style={{ color: theme.accent }}>{t.result}</p>
                      </div>
                    )}
                    {t.text && <p className="text-xs leading-relaxed flex-1 mb-3 italic" style={{ color: theme.textSecondary }}>&ldquo;{t.text}&rdquo;</p>}
                    <div className="pt-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }}>
                      <p className="font-bold text-xs" style={{ color: theme.textPrimary }}>{t.name}</p>
                      {t.location && <p className="text-[10px] mt-0.5" style={{ color: theme.textSecondary }}>{t.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewCourses({ featuredCourses, ctaText, label, headline, sub, template }: { featuredCourses: Course[]; ctaText: string; label: string; headline: string; sub: string; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const cta = ctaText || 'Enroll Now';
  const fmtPrice = (cents: number | null) => cents === null ? '—' : `$${(cents / 100).toFixed(0)}`;
  if (featuredCourses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Select featured courses to see preview</p>
        </div>
      </div>
    );
  }
  return (
    <ScaledPreviewWrapper maxHeight={450}>
          <section className="px-5 py-14" style={{ background: theme.sectionBg }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: theme.accent }}>{label}</p>
                <h2 className="font-black text-2xl" style={{ color: theme.textPrimary }}>{headline}</h2>
                <p className="mt-2 max-w-md mx-auto text-sm" style={{ color: theme.textSecondary }}>{sub}</p>
              </div>
              <div className={`grid gap-4 ${
                featuredCourses.length === 1 ? 'max-w-xs mx-auto' :
                featuredCourses.length === 2 ? 'grid-cols-2 max-w-xl mx-auto' :
                'grid-cols-3'
              }`}>
                {featuredCourses.map((course) => (
                  <div key={course.id} className="rounded-2xl overflow-hidden shadow-sm" style={{ background: isDark ? theme.cardBg : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
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
                      <h3 className="font-black text-xs leading-snug mb-2" style={{ color: theme.textPrimary }}>{course.title}</h3>
                      <span className="inline-flex items-center gap-1 text-white font-bold text-[9px] tracking-wide uppercase px-3 py-1.5 rounded-md" style={{ background: theme.accent }}>
                        {cta} <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewFeatureCards({ featureCards, label, headline, sub, template }: { featureCards: FeatureCard[]; label: string; headline: string; sub: string; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const activeCards = featureCards.filter(c => c.title || c.body);
  if (activeCards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Add feature cards to see preview</p>
        </div>
      </div>
    );
  }
  return (
    <ScaledPreviewWrapper maxHeight={700}>
          <section className="px-5 py-14" style={{ background: isDark ? theme.surfaceBg : '#fff' }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="font-bold text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: theme.accent }}>{label}</p>
                <h2 className="font-black text-2xl" style={{ color: theme.textPrimary }}>{headline}</h2>
                <p className="mt-2 max-w-md mx-auto text-sm" style={{ color: theme.textSecondary }}>{sub}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {activeCards.map((card, i) => (
                  <div key={i} className="rounded-xl p-5" style={{ background: isDark ? theme.cardBg : theme.sectionBg }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: `${theme.accent}14` }}>
                      <div className="w-4 h-4 rounded" style={{ background: theme.accent }} />
                    </div>
                    <h3 className="font-black text-[13px] uppercase tracking-wide mb-1.5" style={{ color: theme.textPrimary }}>{card.title || 'Card Title'}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>{card.body || 'Card description'}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewVSL({ vslVideoUrl, template }: { vslVideoUrl: string; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const isBold = template === 'bold';
  return (
    <ScaledPreviewWrapper maxHeight={320}>
          <section style={{ background: isBold ? theme.heroBg : theme.heroBg }} className="px-5 py-10 text-center">
            <div className="max-w-[700px] mx-auto rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
              {vslVideoUrl ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe src={vslVideoUrl} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                </div>
              ) : (
                <div className="relative w-full" style={{ paddingBottom: '56.25%', background: isDark ? theme.surfaceBg : '#0a1628' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${theme.accent}e6` }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                    </div>
                    <p className="text-white/40 text-xs font-semibold">Paste a video embed URL</p>
                  </div>
                </div>
              )}
            </div>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewInstructor({ instructorImageUrl, template }: { instructorImageUrl: string; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  return (
    <ScaledPreviewWrapper maxHeight={350}>
          <section className="px-5 py-10" style={{ background: theme.sectionBg }}>
            <div className="max-w-5xl mx-auto grid grid-cols-2 gap-8 items-center">
              <div className="rounded-2xl overflow-hidden aspect-[4/5] max-w-[320px]" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                {instructorImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={instructorImageUrl} alt="Instructor" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: `${theme.gold}26` }}>
                        <span className="text-2xl font-black" style={{ color: theme.gold }}>TP</span>
                      </div>
                      <p className="text-white/50 text-xs">Paste an image URL</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: theme.accent }}>Your Instructor</p>
                <h2 className="font-black text-2xl mb-3 leading-tight" style={{ color: theme.textPrimary }}>
                  Meet <span style={{ color: theme.accent }}>Todd Pultz</span>
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                  Todd Pultz is a nine-figure entrepreneur who built his empire from nothing.
                </p>
              </div>
            </div>
          </section>
    </ScaledPreviewWrapper>
  );
}

function MiniPreviewForYouIf({ forYouIf, template }: { forYouIf: string[]; template?: string }) {
  const theme = TEMPLATE_THEMES[template as keyof typeof TEMPLATE_THEMES] ?? TEMPLATE_THEMES.classic;
  const isDark = template === 'dark';
  const activeItems = forYouIf.filter(Boolean);
  if (activeItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="text-center">
          <ArrowRight className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Add items to see preview</p>
        </div>
      </div>
    );
  }
  return (
    <ScaledPreviewWrapper maxHeight={350}>
          <section className="px-5 py-10" style={{ background: theme.sectionBg }}>
            <div className="max-w-5xl mx-auto">
              <div className="border rounded-xl p-6" style={{ borderColor: `${theme.accent}33`, background: isDark ? theme.cardBg : '#fff' }}>
                <p className="font-black text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: theme.accent }}>This Course Is For You If:</p>
                <ul className="space-y-2.5">
                  {activeItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: theme.textSecondary }}>
                      <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: theme.accent }}>→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
    </ScaledPreviewWrapper>
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
  const [subdomain, setSubdomain] = useState('');
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
  const [vslVideoUrl, setVslVideoUrl] = useState('');
  const [instructorImageUrl, setInstructorImageUrl] = useState('');
  const [bulletsLabel, setBulletsLabel] = useState('Inside This Course');
  const [bulletsHeadline, setBulletsHeadline] = useState("What's Inside This Course:");
  const [bulletsSub, setBulletsSub] = useState('Everything you need to find, fund, and close profitable real estate deals.');
  const [template, setTemplate] = useState('classic');

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
    setSubdomain(f.subdomain ?? '');
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
    setVslVideoUrl(f.config?.vslVideoUrl ?? '');
    setInstructorImageUrl(f.config?.instructorImageUrl ?? '');
    setBulletsLabel(f.config?.bulletsLabel ?? 'Inside This Course');
    setBulletsHeadline(f.config?.bulletsHeadline ?? "What's Inside This Course:");
    setBulletsSub(f.config?.bulletsSub ?? 'Everything you need to find, fund, and close profitable real estate deals.');
    setTemplate(f.config?.template ?? 'classic');
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
          name, url, courseId: courseId || null, active, subdomain: subdomain || null,
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
          bulletsLabel: bulletsLabel || null,
          bulletsHeadline: bulletsHeadline || null,
          bulletsSub: bulletsSub || null,
          vslVideoUrl: vslVideoUrl || null,
          instructorImageUrl: instructorImageUrl || null,
          template,
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
    <div className="space-y-0">
      {/* ── Header + Tabs (sticky bar with background) ── */}
      <div className="-mx-6 -mt-6 mb-6 px-6 pt-5 pb-0 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/funnels')}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-colors"
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
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                <ExternalLink className="w-4 h-4" /> View Live
              </a>
            )}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Tabs + Save */}
        <div className="flex items-end justify-between">
          <div className="flex gap-0">
            {([
              { key: 'settings', label: 'Settings', icon: Settings },
              { key: 'content', label: 'Content', icon: FileText },
              { key: 'preview', label: 'Preview', icon: Eye },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-maxxed-blue'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-maxxed-blue rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Save — always visible */}
          <div className="flex items-center gap-3 pb-2">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain <span className="text-gray-400 font-normal">(for config lookup)</span></label>
                  <div className="flex items-center gap-0">
                    <input
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-funnel"
                      className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue font-mono"
                    />
                    <span className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 text-sm text-gray-500 font-mono whitespace-nowrap">
                      .join.maxxedout.com
                    </span>
                  </div>
                  {subdomain && (
                    <p className="text-xs text-gray-400 mt-1">
                      Funnel app will serve this config when accessed at <span className="font-mono text-gray-600">{subdomain}.join.maxxedout.com</span>
                    </p>
                  )}
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
          {/* ── Template Selector ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'classic', name: 'Classic', desc: 'Light & clean', color: '#0000FF' },
              { id: 'dark', name: 'Dark Mode', desc: 'Sleek & modern', color: '#06b6d4' },
              { id: 'bold', name: 'Bold', desc: 'High-contrast', color: '#dc2626' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                  template === t.id
                    ? 'border-maxxed-blue bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-1.5 rounded-full mb-3" style={{ background: t.color }} />
                <p className="font-bold text-sm text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
                {template === t.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-maxxed-blue flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>

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
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">Hero Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '360px' }}>
                <MiniPreviewHero headline={headline} subheadline={subheadline} ctaText={ctaText} coursePrice={selectedCourse?.price ?? funnel.course?.price ?? null} vslVideoUrl={vslVideoUrl} template={template} />
              </div>
            </div>
          </div>

          {/* ── VSL Video + Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-bold text-gray-900">VSL Video</h2>
                  <p className="text-sm text-gray-500 mt-0.5">The main video in the hero section of the funnel.</p>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Video Embed URL</label>
                    <input value={vslVideoUrl} onChange={(e) => setVslVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/... or Vimeo/Wistia embed URL" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue font-mono text-xs" />
                    <p className="text-xs text-gray-400 mt-1">Paste an embed URL (YouTube, Vimeo, Wistia, etc.)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">Hero Video</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '320px' }}>
                <MiniPreviewVSL vslVideoUrl={vslVideoUrl} template={template} />
              </div>
            </div>
          </div>

          {/* ── Instructor Photo + Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-bold text-gray-900">Instructor Photo</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Shown in the &ldquo;Meet Todd&rdquo; section of the funnel.</p>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input value={instructorImageUrl} onChange={(e) => setInstructorImageUrl(e.target.value)} placeholder="https://example.com/photo.jpg" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue font-mono text-xs" />
                    <p className="text-xs text-gray-400 mt-1">Direct link to an image (JPG, PNG, WebP)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">Meet the Instructor</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '350px' }}>
                <MiniPreviewInstructor instructorImageUrl={instructorImageUrl} template={template} />
              </div>
            </div>
          </div>

          {/* ── Bullets + Bullets Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-bold text-gray-900">What You&apos;ll Learn</h2>
                  <p className="text-sm text-gray-500 mt-0.5">The bullet points section with enrollment card on the funnel page.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section Label</label>
                      <input value={bulletsLabel} onChange={(e) => setBulletsLabel(e.target.value)} placeholder="Inside This Course" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section Headline</label>
                      <input value={bulletsHeadline} onChange={(e) => setBulletsHeadline(e.target.value)} placeholder="What's Inside This Course:" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section Subtext</label>
                      <input value={bulletsSub} onChange={(e) => setBulletsSub(e.target.value)} placeholder="Everything you need to find, fund, and close..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">Bullet Points</p>
                      <button onClick={addBullet} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {bullets.map((b, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0 font-medium">{i + 1}</div>
                          <input value={b} onChange={(e) => updateBullet(i, e.target.value)} placeholder={`Benefit ${i + 1}`} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                          <button onClick={() => removeBullet(i)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Mini Bullets Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">What You&apos;ll Learn Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '400px' }}>
                <MiniPreviewBullets bullets={bullets} label={bulletsLabel || 'Inside This Course'} headline={bulletsHeadline || "What's Inside This Course:"} sub={bulletsSub || 'Everything you need to find, fund, and close profitable real estate deals.'} template={template} />
              </div>
            </div>
          </div>

          {/* ── Feature Cards + Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-bold text-gray-900">Feature Cards Section</h2>
                  <p className="text-sm text-gray-500 mt-0.5">The &ldquo;What You&apos;ll Learn&rdquo; grid of feature cards on the funnel page.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
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
                    <div className="space-y-2">
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
            {/* Mini Feature Cards Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">Feature Cards Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '700px' }}>
                <MiniPreviewFeatureCards featureCards={featureCards} label={featureCardsLabel || 'Inside This Course'} headline={featureCardsHeadline || "What You'll Learn"} sub={featureCardsSub || 'No hype. No fluff. No motivational nonsense. Just real strategies that work.'} template={template} />
              </div>
            </div>
          </div>

          {/* ── "For You If" Items + Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
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
            {/* Mini For You If Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">For You If Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '350px' }}>
                <MiniPreviewForYouIf forYouIf={forYouIf} template={template} />
              </div>
            </div>
          </div>

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
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">Testimonials Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '400px' }}>
                <MiniPreviewTestimonials testimonials={testimonials} template={template} />
              </div>
            </div>
          </div>

          {/* ── Courses Included + Preview ── */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-bold text-gray-900">Courses Included Section</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Featured courses grid on the funnel page.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
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
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Featured Courses</p>
                    {courses.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No published courses yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {courses.map((c) => {
                          const selected = featuredCourseIds.has(c.id);
                          return (
                            <button key={c.id} type="button"
                              onClick={() => { setFeaturedCourseIds((prev) => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; }); }}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${selected ? 'bg-blue-50/60 ring-1 ring-maxxed-blue/20' : 'hover:bg-gray-50'}`}>
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {c.thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }}>
                                    <BookOpen className="w-3.5 h-3.5 text-white/30" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${selected ? 'text-maxxed-blue' : 'text-gray-900'}`}>{c.title}</p>
                                <p className="text-xs text-gray-400">{formatPrice(c.price)}</p>
                              </div>
                              {selected && <div className="w-5 h-5 rounded-full bg-maxxed-blue flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Mini Courses Preview */}
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-800/20 shadow-md">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <span className="text-[10px] text-gray-400 ml-2 font-medium">Courses Included Section</span>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: '450px' }}>
                <MiniPreviewCourses featuredCourses={resolvedFeaturedCourses} ctaText={ctaText} label={coursesLabel || 'The Curriculum'} headline={coursesHeadline || 'Courses Included'} sub={coursesSubheadline || 'Everything you need to go from zero to cash-flowing — in one place.'} template={template} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Preview ── */}
      {activeTab === 'preview' && (
        <div className="space-y-3 overflow-hidden">
          {/* Browser frame */}
          <div className="bg-gray-950 rounded-xl overflow-hidden ring-1 ring-gray-800/30 shadow-lg">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 mx-3 bg-gray-700/50 border border-gray-600 rounded-md px-3 py-1 text-xs text-gray-400 font-mono truncate">
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
                  bulletsLabel={bulletsLabel || 'Inside This Course'}
                  bulletsHeadline={bulletsHeadline || "What's Inside This Course:"}
                  bulletsSub={bulletsSub || 'Everything you need to find, fund, and close profitable real estate deals.'}
                  vslVideoUrl={vslVideoUrl}
                  instructorImageUrl={instructorImageUrl}
                  template={template}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
