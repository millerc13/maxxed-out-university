'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronLeft, ChevronDown, Save, ExternalLink, RefreshCw, Check, Copy, Eye, Settings, FileText, MessageSquare, Star, ArrowRight, Shield } from 'lucide-react';
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
  } | null;
}

// ── Faithful Preview — mirrors the actual funnel site layout ────────
const FEATURE_CARDS_PREVIEW = [
  { title: 'The Wealth Mindset', body: 'How successful entrepreneurs think differently about money, risk, and opportunity.' },
  { title: 'Real Estate Strategies', body: 'The exact strategies Todd used to build his portfolio from zero to nine figures.' },
  { title: 'Deal Analysis', body: 'Master the numbers behind every deal — flips, rentals, BRRRR, and multifamily.' },
  { title: 'Finding & Funding Deals', body: 'Where to find off-market opportunities and how to fund them without your own money.' },
  { title: 'Your Action Plan', body: 'Clear, concrete first steps you can take immediately to change your trajectory.' },
  { title: 'Scaling Your Portfolio', body: 'Systems, teams, and frameworks to go from one door to a full real estate business.' },
];

const FOR_YOU_IF_PREVIEW = [
  "You're working hard but still feel stuck financially",
  "You know there's more out there for you",
  "You're ready to learn how real estate actually works",
  "You want real strategies, not motivational fluff",
];

function FunnelPreview({
  headline,
  subheadline,
  ctaText,
  bullets,
  testimonials,
  courseName,
  coursePrice,
  courseThumbnail,
}: {
  headline: string;
  subheadline: string;
  ctaText: string;
  bullets: string[];
  testimonials: Testimonial[];
  courseName: string;
  coursePrice: number | null;
  courseThumbnail: string | null;
}) {
  const fmtPrice = (cents: number | null) => {
    if (cents === null) return '—';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const activeBullets = bullets.filter(Boolean);
  const activeTestimonials = testimonials.filter(t => t.name || t.text);
  const cta = ctaText || 'Enroll Now';

  // We render the funnel at 390px wide (mobile viewport) and scale it down
  // to fit the ~300px preview panel via CSS transform.
  const RENDER_WIDTH = 390;

  return (
    <div className="relative overflow-hidden" style={{ width: '100%' }}>
      <div
        className="origin-top-left select-none pointer-events-none"
        style={{
          width: `${RENDER_WIDTH}px`,
          transform: `scale(${396 / RENDER_WIDTH})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="font-sans" style={{ width: `${RENDER_WIDTH}px` }}>

          {/* ── NAV ── */}
          <header className="bg-white shadow-sm" style={{ borderTop: '3px solid #0000FF' }}>
            <div className="px-5 h-[48px] flex items-center justify-between">
              <span className="font-black text-[10px] tracking-[0.18em] uppercase text-gray-900">
                Maxxed Out University
              </span>
              <span
                className="text-white font-black text-[9px] tracking-[0.12em] uppercase px-4 py-2 rounded-lg"
                style={{ background: '#0000FF' }}
              >
                {cta}
              </span>
            </div>
          </header>

          {/* ── HERO ── */}
          <section style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 pt-10 pb-8 text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 border border-white/20 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D4AF37' }} />
              <span className="text-white/70 font-bold text-[8px] tracking-[0.18em] uppercase">
                Now Enrolling — Join From Anywhere
              </span>
            </div>

            <h1 className="font-black text-white text-[22px] leading-[1.12] tracking-tight mb-4 px-2">
              {(headline || 'Your Headline Here').split(' ').map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z-]/g, '');
                const accent = new Set(['real', 'exact', 'nine-figure', 'empire', 'investors', 'wealth', 'system', 'blueprint']);
                return accent.has(clean)
                  ? <span key={i} style={{ color: '#0000FF' }}>{word} </span>
                  : <span key={i}>{word} </span>;
              })}
            </h1>

            <p className="text-white/60 text-[12px] leading-relaxed mb-6 px-4">
              {subheadline || 'Your subheadline goes here'}
            </p>

            {/* VSL placeholder */}
            <div className="rounded-xl overflow-hidden mb-6 mx-2" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
              <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#0a1628' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,255,0.9)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                  </div>
                  <p className="text-white/40 text-[9px]">VSL video</p>
                </div>
              </div>
            </div>

            {/* Hero CTA */}
            <span
              className="inline-flex items-center gap-2 text-white font-black text-[11px] tracking-[0.12em] uppercase px-8 py-3.5 rounded-xl"
              style={{ background: '#0000FF', boxShadow: '0 8px 32px rgba(0,0,255,0.35)' }}
            >
              {cta} — {fmtPrice(coursePrice)}
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <p className="text-white/30 text-[9px] mt-3">One-time payment · Instant access · 30-day guarantee</p>
          </section>

          {/* ── BULLETS + ENROLLMENT CARD ── */}
          <section className="px-5 py-10" style={{ background: '#f4f6fa' }}>
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#0000FF' }}>
              Inside {courseName || 'This Course'}
            </p>
            <h2 className="font-black text-gray-900 text-[18px] mb-1">What&apos;s Inside This Course:</h2>
            <p className="text-gray-500 text-[11px] mb-5">Everything you need to find, fund, and close profitable deals.</p>

            <ul className="space-y-2 mb-6">
              {activeBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5" style={{ background: '#0000FF' }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="font-semibold text-gray-800 text-[11px]">{b}</span>
                </li>
              ))}
            </ul>

            {/* "For you if" box */}
            <div className="border rounded-xl p-4 bg-white mb-6" style={{ borderColor: 'rgba(0,0,255,0.2)' }}>
              <p className="text-[8px] font-black tracking-[0.18em] uppercase mb-2.5" style={{ color: '#0000FF' }}>
                This Course Is For You If:
              </p>
              <ul className="space-y-1.5">
                {FOR_YOU_IF_PREVIEW.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-gray-700">
                    <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: '#0000FF' }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enrollment card */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ borderTop: '4px solid #D4AF37' }}>
              {courseThumbnail && (
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={courseThumbnail} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 py-4">
                <p className="text-[8px] font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: '#D4AF37' }}>Maxxed Out University</p>
                <h3 className="text-white font-black text-[15px] leading-snug mb-3">{courseName || 'Course Name'}</h3>
                <div className="text-white/40 text-[8px] uppercase tracking-widest mb-0.5">Your Investment</div>
                <div className="text-white font-black text-[28px]">{fmtPrice(coursePrice)}</div>
                <div className="text-white/30 text-[9px] mt-0.5">One-time payment · No recurring fees</div>
              </div>
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-gray-400 mb-2">What&apos;s Included</p>
                <ul className="space-y-1.5">
                  {['Immediate access', 'All course modules', 'Certificate of completion', 'Lifetime access', '30-day money back guarantee'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[10px] text-gray-700">
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#0000FF' }} strokeWidth={3} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-5 py-3.5 text-center">
                <span className="w-full flex items-center justify-center gap-1.5 text-white font-black text-[10px] tracking-[0.12em] uppercase py-3 rounded-lg" style={{ background: '#0000FF' }}>
                  {cta} <ArrowRight className="w-3 h-3" />
                </span>
                <div className="flex items-center justify-center gap-1 mt-2 text-gray-400 text-[9px]">
                  <Shield className="w-2.5 h-2.5" /> Secure checkout · 256-bit SSL
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURE CARDS ── */}
          <section className="bg-white px-5 py-10">
            <div className="text-center mb-6">
              <p className="text-[9px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#0000FF' }}>Inside This Course</p>
              <h2 className="font-black text-gray-900 text-[18px]">What You&apos;ll Learn</h2>
              <p className="text-gray-500 text-[10px] mt-1.5">No hype. No fluff. Just real strategies that work.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {FEATURE_CARDS_PREVIEW.map((card) => (
                <div key={card.title} className="rounded-xl p-3.5" style={{ background: '#f4f6fa' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ background: 'rgba(0,0,255,0.08)' }}>
                    <div className="w-3.5 h-3.5 rounded-sm" style={{ background: '#0000FF' }} />
                  </div>
                  <h3 className="font-black text-gray-900 text-[10px] uppercase tracking-wide mb-1">{card.title}</h3>
                  <p className="text-gray-500 text-[9px] leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── MEET TODD ── */}
          <section className="px-5 py-10" style={{ background: '#f4f6fa' }}>
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#0000FF' }}>Your Instructor</p>
            <h2 className="font-black text-gray-900 text-[20px] mb-3 leading-tight">
              Meet <span style={{ color: '#0000FF' }}>Todd Pultz</span>
            </h2>
            <p className="text-gray-600 text-[11px] leading-relaxed mb-2">
              Todd Pultz is a nine-figure entrepreneur who built his empire from nothing. Growing up broke with no roadmap, he made every mistake imaginable.
            </p>
            <p className="text-gray-600 text-[11px] leading-relaxed mb-4">
              What changed wasn&apos;t working harder — it was learning how real estate actually works.
            </p>
            <span className="inline-flex items-center gap-1.5 text-white font-black text-[10px] tracking-[0.12em] uppercase px-5 py-2.5 rounded-lg" style={{ background: '#0000FF' }}>
              Learn From Todd <ArrowRight className="w-3 h-3" />
            </span>
          </section>

          {/* ── TESTIMONIALS ── */}
          {activeTestimonials.length > 0 && (
            <section className="bg-white px-5 py-10">
              <div className="text-center mb-6">
                <p className="text-[9px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#0000FF' }}>Real Results</p>
                <h2 className="font-black text-gray-900 text-[18px]">What Students Are Saying</h2>
              </div>
              <div className="space-y-2.5">
                {activeTestimonials.map((t, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#f4f6fa' }}>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="w-3 h-3" style={{ color: '#D4AF37', fill: '#D4AF37' }} />
                      ))}
                    </div>
                    {t.result && (
                      <div className="rounded-md px-2.5 py-1.5 mb-2 border" style={{ background: 'rgba(0,0,255,0.04)', borderColor: 'rgba(0,0,255,0.12)' }}>
                        <p className="font-bold text-[9px] uppercase tracking-wide" style={{ color: '#0000FF' }}>{t.result}</p>
                      </div>
                    )}
                    {t.text && <p className="text-gray-600 text-[10px] leading-relaxed mb-2 italic">&ldquo;{t.text}&rdquo;</p>}
                    <div className="border-t border-gray-200 pt-2">
                      <p className="font-bold text-gray-900 text-[10px]">{t.name}</p>
                      {t.location && <p className="text-gray-400 text-[9px]">{t.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── SOCIAL PROOF STRIP ── */}
          <section className="border-y border-gray-200 px-5 py-5" style={{ background: '#f4f6fa' }}>
            <div className="flex items-center justify-center gap-6">
              {[
                { value: '2,400+', label: 'Students', color: '#0000FF' },
                { value: '4.9/5', label: 'Rating', color: '#D4AF37' },
                { value: '30-Day', label: 'Guarantee', color: '#16a34a' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="font-black text-[14px] text-gray-900">{s.value}</div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section style={{ background: 'linear-gradient(160deg, #0f2040 0%, #0c1829 100%)' }} className="px-5 py-12 text-center">
            <p className="text-[8px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#D4AF37' }}>
              Ready to Build Your Empire?
            </p>
            <h2 className="font-black text-white text-[20px] leading-tight mb-3">
              Ready To <span style={{ color: '#0000FF' }}>Change Your Life?</span>
            </h2>
            <p className="text-white/50 text-[10px] mb-6 leading-relaxed">
              Stop working hard and staying stuck. Learn the mindset and strategies that actually build wealth.
            </p>
            <span
              className="inline-flex items-center gap-1.5 text-white font-black text-[11px] tracking-[0.12em] uppercase px-8 py-3.5 rounded-xl"
              style={{ background: '#0000FF', boxShadow: '0 8px 32px rgba(0,0,255,0.35)' }}
            >
              {cta} — {fmtPrice(coursePrice)} <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <p className="text-white/25 text-[8px] mt-3">Secure checkout · 256-bit SSL · 30-day guarantee</p>
          </section>

          {/* ── Footer ── */}
          <footer className="bg-black px-5 py-4 text-center">
            <p className="text-gray-600 text-[9px]">© 2026 Maxxed Out University · All rights reserved</p>
          </footer>

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
  const [activeTab, setActiveTab] = useState<'settings' | 'content'>('settings');
  const [showAllCourses, setShowAllCourses] = useState(false);

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

  if (!funnel) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8">
          <Card><CardContent className="p-6"><div className="h-96 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-96 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
            <a
              href={funnel.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Live
            </a>
          )}
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Main Layout: Editor + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Left: Editor */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Content
            </button>
          </div>

          {activeTab === 'settings' && (
            <>
              {/* General Settings */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-bold text-gray-900">General</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Name</label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deployed URL</label>
                        <input
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://funnel.maxxedout.com"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Primary Course <span className="text-gray-400 font-normal">(checkout)</span>
                        </label>
                        <select
                          value={courseId}
                          onChange={(e) => setCourseId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                        >
                          <option value="">— No course —</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.title} ({formatPrice(c.price)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div
                            className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-maxxed-blue' : 'bg-gray-300'}`}
                            onClick={() => setActive(!active)}
                          >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{active ? 'Active' : 'Inactive'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Featured Courses */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">Featured Courses</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {featuredCourseIds.size} of {courses.length} selected
                      </p>
                    </div>
                    {courses.length > 6 && (
                      <button
                        onClick={() => setShowAllCourses(!showAllCourses)}
                        className="flex items-center gap-1 text-sm text-maxxed-blue font-medium hover:underline"
                      >
                        {showAllCourses ? 'Show less' : 'Show all'}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAllCourses ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    {courses.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No published courses yet.</p>
                    ) : (
                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${!showAllCourses && courses.length > 6 ? 'max-h-[280px] overflow-hidden relative' : ''}`}>
                        {(showAllCourses ? courses : courses.slice(0, 8)).map((c) => {
                          const selected = featuredCourseIds.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFeaturedCourseIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(c.id)) next.delete(c.id);
                                  else next.add(c.id);
                                  return next;
                                });
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                selected
                                  ? 'border-maxxed-blue bg-blue-50/50 ring-1 ring-maxxed-blue/20'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {c.thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold">
                                    No img
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${selected ? 'text-maxxed-blue' : 'text-gray-900'}`}>
                                  {c.title}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{formatPrice(c.price)}</p>
                              </div>
                              {selected && (
                                <div className="w-5 h-5 rounded-full bg-maxxed-blue flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
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

              {/* API Key */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-bold text-gray-900">API Key</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Set as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">FUNNEL_API_KEY</code> in your funnel deployment.
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 break-all">
                        {funnel.apiKey}
                      </code>
                      <button
                        onClick={copyKey}
                        className="p-2.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={rotateKey}
                        title="Rotate key"
                        className="p-2.5 text-gray-400 hover:text-orange-500 border border-gray-200 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'content' && (
            <>
              {/* Headlines & CTA */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-bold text-gray-900">Headlines & CTA</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Changes appear in the live preview instantly.</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                      <input
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="The exact system Todd used to build a multi-million dollar portfolio…"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                      <textarea
                        value={subheadline}
                        onChange={(e) => setSubheadline(e.target.value)}
                        rows={2}
                        placeholder="Step-by-step. No fluff. Just results."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                      <input
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Enroll Now"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bullet Points */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">What You&apos;ll Learn</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Bullet points displayed on the funnel page.</p>
                    </div>
                    <button
                      onClick={addBullet}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  <div className="p-6 space-y-2">
                    {bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0 font-medium">
                          {i + 1}
                        </div>
                        <input
                          value={b}
                          onChange={(e) => updateBullet(i, e.target.value)}
                          placeholder={`Benefit ${i + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                        />
                        <button
                          onClick={() => removeBullet(i)}
                          className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Testimonials */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">Testimonials</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Student success stories for social proof.</p>
                    </div>
                    <button
                      onClick={addTestimonial}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-maxxed-blue hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {testimonials.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No testimonials yet</p>
                      </div>
                    ) : (
                      testimonials.map((t, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Testimonial {i + 1}
                            </span>
                            <button
                              onClick={() => removeTestimonial(i)}
                              className="p-1 text-gray-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Name</label>
                              <input
                                value={t.name}
                                onChange={(e) => updateTestimonial(i, 'name', e.target.value)}
                                placeholder="Marcus R."
                                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Location</label>
                              <input
                                value={t.location}
                                onChange={(e) => updateTestimonial(i, 'location', e.target.value)}
                                placeholder="Atlanta, GA"
                                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Result highlight</label>
                            <input
                              value={t.result}
                              onChange={(e) => updateTestimonial(i, 'result', e.target.value)}
                              placeholder="Closed first deal in 60 days"
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Quote</label>
                            <textarea
                              value={t.text}
                              onChange={(e) => updateTestimonial(i, 'text', e.target.value)}
                              rows={2}
                              placeholder="This course changed everything for me…"
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue resize-none"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right: Live Preview (sticky) */}
        <div className="hidden xl:block">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Live Preview</span>
              <span className="text-[10px] text-gray-400">· updates as you type</span>
            </div>
            {/* Preview frame */}
            <div className="bg-gray-950 rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-800">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 border-b border-gray-800">
                <div className="w-2 h-2 rounded-full bg-red-500/70" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
                <div className="w-2 h-2 rounded-full bg-green-500/70" />
                <div className="flex-1 mx-2 bg-gray-800 rounded px-2 py-0.5 text-[9px] text-gray-500 font-mono truncate">
                  {funnel.url || 'funnel.maxxedout.com'}
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '680px', scrollbarWidth: 'none' }}>
            <FunnelPreview
              headline={headline}
              subheadline={subheadline}
              ctaText={ctaText}
              bullets={bullets}
              testimonials={testimonials}
              courseName={selectedCourse?.title ?? funnel.course?.title ?? ''}
              coursePrice={selectedCourse?.price ?? funnel.course?.price ?? null}
              courseThumbnail={selectedCourse?.thumbnail ?? funnel.course?.thumbnail ?? null}
            />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Save Bar (sticky bottom) */}
      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between z-10">
        <div className="min-h-[28px] flex items-center">
          {saveError && (
            <p className="text-red-500 text-sm font-medium">{saveError}</p>
          )}
          {saved && (
            <p className="text-green-600 text-sm font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Saved
            </p>
          )}
          {!saveError && !saved && (
            <p className="text-gray-400 text-sm">Changes won&apos;t be live until you save.</p>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-maxxed-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-md"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
