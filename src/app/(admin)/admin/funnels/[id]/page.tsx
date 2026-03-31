'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronLeft, Save, ExternalLink, RefreshCw, Check, Copy, Eye, Settings, FileText, MessageSquare, Star, ArrowRight, Shield } from 'lucide-react';
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

// ── Mini Preview Component ─────────────────────────────────────────
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
  const formatPrice = (cents: number | null) => {
    if (!cents) return '—';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const activeBullets = bullets.filter(Boolean);
  const activeTestimonials = testimonials.filter(t => t.name || t.text);

  return (
    <div className="bg-[#0a0a0a] text-white rounded-xl overflow-hidden text-[11px] leading-relaxed select-none" style={{ fontSize: '11px' }}>
      {/* Nav */}
      <div className="bg-[#0d1b2a] px-4 py-2.5 flex items-center justify-between border-b border-white/10">
        <span className="font-black text-[10px] tracking-[0.15em] uppercase text-white/90">Maxxed Out University</span>
        <span className="bg-[#C9A84C] text-black text-[9px] font-bold px-2.5 py-1 rounded">
          {ctaText || 'Enroll Now'}
        </span>
      </div>

      {/* Hero */}
      <div className="px-5 py-6 bg-gradient-to-b from-[#0d1b2a] to-[#0a0a0a]">
        <h2 className="text-sm font-extrabold leading-tight mb-2 text-white">
          {headline || 'Your Headline Here'}
        </h2>
        <p className="text-[10px] text-gray-400 mb-3 leading-snug">
          {subheadline || 'Your subheadline goes here'}
        </p>

        {/* Course card mini */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
          {courseThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={courseThumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded bg-white/10 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[10px] truncate">{courseName || 'Course Name'}</p>
            <p className="text-[#C9A84C] font-bold text-xs">{formatPrice(coursePrice)}</p>
          </div>
        </div>
      </div>

      {/* Bullets */}
      {activeBullets.length > 0 && (
        <div className="px-5 py-4 border-t border-white/5">
          <p className="font-bold text-[10px] uppercase tracking-wider text-[#C9A84C] mb-2">What You&apos;ll Learn</p>
          <div className="space-y-1.5">
            {activeBullets.slice(0, 4).map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check className="w-3 h-3 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-[10px]">{b}</span>
              </div>
            ))}
            {activeBullets.length > 4 && (
              <p className="text-gray-500 text-[9px] pl-5">+{activeBullets.length - 4} more…</p>
            )}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {activeTestimonials.length > 0 && (
        <div className="px-5 py-4 border-t border-white/5">
          <p className="font-bold text-[10px] uppercase tracking-wider text-[#C9A84C] mb-2">Testimonials</p>
          <div className="space-y-2">
            {activeTestimonials.slice(0, 2).map((t, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-2.5">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-2 h-2 text-[#C9A84C] fill-[#C9A84C]" />)}
                </div>
                {t.text && <p className="text-gray-300 text-[9px] italic mb-1 line-clamp-2">&ldquo;{t.text}&rdquo;</p>}
                <p className="text-[9px] text-gray-500">
                  {t.name}{t.location ? `, ${t.location}` : ''}
                  {t.result && <span className="text-[#C9A84C]"> — {t.result}</span>}
                </p>
              </div>
            ))}
            {activeTestimonials.length > 2 && (
              <p className="text-gray-500 text-[9px]">+{activeTestimonials.length - 2} more testimonials</p>
            )}
          </div>
        </div>
      )}

      {/* CTA Footer */}
      <div className="px-5 py-4 bg-[#0d1b2a] border-t border-white/10 text-center">
        <div className="bg-[#C9A84C] text-black text-[10px] font-bold py-2 rounded flex items-center justify-center gap-1">
          {ctaText || 'Enroll Now'} <ArrowRight className="w-3 h-3" />
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 text-[8px] text-gray-500">
          <Shield className="w-2.5 h-2.5" /> Secure checkout
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
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
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
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
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
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-bold text-gray-900">Featured Courses</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Select which courses to showcase on the funnel page.</p>
                  </div>
                  <div className="p-6">
                    {courses.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No published courses yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {courses.map((c) => {
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
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Live Preview</span>
            </div>
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

      {/* Save Bar (sticky bottom) */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white border-t border-gray-200 flex items-center justify-between z-10">
        <div>
          {saveError && (
            <p className="text-red-500 text-sm font-medium">{saveError}</p>
          )}
          {saved && (
            <p className="text-green-600 text-sm font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Changes saved successfully
            </p>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
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
