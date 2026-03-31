'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronLeft, Save, ExternalLink, RefreshCw, Check, Copy } from 'lucide-react';

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

export default function FunnelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

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

    // Populate form
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

  const [saveError, setSaveError] = useState<string | null>(null);

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

  if (!funnel) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin/funnels')} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{funnel.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">Edit funnel settings and content</p>
        </div>
        <div className="flex gap-3">
          {funnel.url && (
            <a href={funnel.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ExternalLink className="w-4 h-4" />
              View Funnel
            </a>
          )}
          {saveError && (
            <p className="text-red-500 text-sm font-medium self-center">{saveError}</p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deployed URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://funnel.maxxedout.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Course <span className="text-gray-400 font-normal">(used for checkout)</span></label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue">
                <option value="">— No course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({formatPrice(c.price)})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-maxxed-blue' : 'bg-gray-300'}`}
                  onClick={() => setActive(!active)}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{active ? 'Active' : 'Inactive'}</span>
              </label>
            </div>
          </div>

          {/* Featured Courses */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Featured Courses <span className="text-gray-400 font-normal">(displayed on the funnel page with thumbnails)</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">Select which courses to showcase. Each one appears as a card with its thumbnail, title, and price.</p>
            {courses.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No published courses yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
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
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                        selected
                          ? 'border-maxxed-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {c.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                            No img
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${selected ? 'text-maxxed-blue' : 'text-gray-900'}`}>
                          {c.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatPrice(c.price)}</p>
                      </div>
                      {/* Check */}
                      {selected && <Check className="w-4 h-4 text-maxxed-blue flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <p className="text-xs text-gray-500 mb-2">Set this as <code className="bg-gray-100 px-1 rounded">FUNNEL_API_KEY</code> in your funnel deployment env vars.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 break-all">
                {funnel.apiKey}
              </code>
              <button onClick={copyKey} className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
                {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={rotateKey} title="Rotate key" className="p-2 text-gray-400 hover:text-orange-500 border border-gray-200 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">Content</h2>
          <p className="text-sm text-gray-500 mb-5">This copy is pulled live by the funnel on each page load. Changes reflect within 60 seconds.</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)}
                placeholder="The exact system Todd used to build a multi-million dollar portfolio…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
              <textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)}
                rows={2}
                placeholder="Step-by-step. No fluff. Just results."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
              <input value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                placeholder="Enroll Now"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
            </div>

            {/* Bullet points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What You'll Learn (bullet points)</label>
              <div className="space-y-2">
                {bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={b} onChange={(e) => updateBullet(i, e.target.value)}
                      placeholder={`Benefit ${i + 1}`}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue" />
                    <button onClick={() => removeBullet(i)} className="text-gray-300 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addBullet}
                className="mt-2 flex items-center gap-1 text-sm text-maxxed-blue hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add bullet
              </button>
            </div>

            {/* Testimonials */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Testimonials</label>
              <div className="space-y-4">
                {testimonials.map((t, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Testimonial {i + 1}</span>
                      <button onClick={() => removeTestimonial(i)} className="text-gray-300 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input value={t.name} onChange={(e) => updateTestimonial(i, 'name', e.target.value)}
                          placeholder="Marcus R."
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Location</label>
                        <input value={t.location} onChange={(e) => updateTestimonial(i, 'location', e.target.value)}
                          placeholder="Atlanta, GA"
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Result highlight</label>
                      <input value={t.result} onChange={(e) => updateTestimonial(i, 'result', e.target.value)}
                        placeholder="Closed first deal in 60 days"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Quote</label>
                      <textarea value={t.text} onChange={(e) => updateTestimonial(i, 'text', e.target.value)}
                        rows={2} placeholder="This course changed everything for me…"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maxxed-blue resize-none" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addTestimonial}
                className="mt-2 flex items-center gap-1 text-sm text-maxxed-blue hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add testimonial
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
