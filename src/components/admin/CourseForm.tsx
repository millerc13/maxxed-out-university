'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft, Upload, X, ImageIcon, Eye, Undo2, Plus, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react';
import Link from 'next/link';
import {
  SECTION_ICONS,
  SECTION_ICON_NAMES,
  getSectionIcon,
} from '@/lib/section-icons';
import { Toggle } from './Toggle';

export interface HeroStat {
  iconName: string;
  iconColor: string | null;
  label: string;
}

const STAT_COLOR_OPTIONS: { name: string; className: string }[] = [
  { name: 'Blue', className: 'text-blue-300' },
  { name: 'Gold', className: 'text-maxxed-gold' },
  { name: 'Green', className: 'text-green-400' },
  { name: 'Red', className: 'text-red-400' },
  { name: 'Purple', className: 'text-purple-400' },
  { name: 'White', className: 'text-white' },
];

interface Course {
  id?: string;
  title: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  thumbnail: string | null;
  published: boolean;
  comingSoon: boolean;
  price: number | null;
  externalUrl?: string | null;
  applyMode?: boolean;
  checkoutAfterApply?: boolean;
  notifyClosersOnApply?: boolean;
  bookACallEnabled?: boolean;
  heroStats?: HeroStat[] | null;
  checkoutBullets?: string[] | null;
}

export interface CourseFormDraft {
  title: string;
  slug: string;
  description: string;
  shortDesc: string;
  thumbnail: string;
  published: boolean;
  comingSoon: boolean;
  price: string;
  // applyMode flips the course from "show price + Get Access" to
  // "show Apply Now button". On save, the toggle plus the URL field
  // collapses into the single `externalUrl` DB column (set when
  // applyMode is on, null otherwise).
  applyMode: boolean;
  externalUrl: string;
  // When true, the on-platform /apply flow ends with a checkout step
  // instead of the "we'll reach out" thank-you. Funnels using this
  // course inherit this default unless they override per-deployment.
  checkoutAfterApply: boolean;
  // When true (default), /api/apply creates a GHL opportunity which
  // triggers the closer-notify webhook. Flip OFF for QA / testing a
  // course without firing closer texts.
  notifyClosersOnApply: boolean;
  // When true (default), every funnel + university lead/purchase
  // surface for this course shows a "Have more questions? Book a call"
  // CTA pointing to the Calendly booking link.
  bookACallEnabled: boolean;
  // Editable stats row in the course-detail hero. When empty, the page
  // falls back to legacy hardcoded stats (lessons / certificate /
  // lifetime access).
  heroStats: HeroStat[];
  // Editable bullet list in the checkout page's left "What's Included"
  // panel. Empty array → legacy hardcoded defaults.
  checkoutBullets: string[];
}

interface CourseFormProps {
  course?: Course;
  // Optional callbacks used by /admin/courses/[id]'s editor wrapper to:
  //  · stream the current draft up to the parent (so the Preview tab can
  //    show unsaved field overrides without remounting)
  //  · jump the parent's tabs to the Preview tab
  // When omitted, CourseForm runs standalone (e.g. for /admin/courses/new).
  onDraftChange?: (draft: CourseFormDraft) => void;
  onShowPreview?: () => void;
}

function initialDraft(course?: Course): CourseFormDraft {
  return {
    title: course?.title || '',
    slug: course?.slug || '',
    description: course?.description || '',
    shortDesc: course?.shortDesc || '',
    thumbnail: course?.thumbnail || '',
    published: course?.published || false,
    comingSoon: course?.comingSoon || false,
    price: course?.price ? String(course.price / 100) : '',
    // applyMode is now its own DB column. Fall back to externalUrl truthiness
    // for any course saved before the column existed.
    applyMode: course?.applyMode ?? !!course?.externalUrl,
    externalUrl: course?.externalUrl || '',
    checkoutAfterApply: !!course?.checkoutAfterApply,
    // Default ON when the field is missing (e.g. legacy courses) so we
    // never silently disable the existing closer-notify behavior.
    notifyClosersOnApply: course?.notifyClosersOnApply ?? true,
    bookACallEnabled: course?.bookACallEnabled ?? true,
    heroStats: Array.isArray(course?.heroStats)
      ? course!.heroStats!.map((s) => ({
          iconName: s.iconName || 'BookOpen',
          iconColor: s.iconColor ?? null,
          label: s.label || '',
        }))
      : [],
    checkoutBullets: Array.isArray(course?.checkoutBullets)
      ? (course!.checkoutBullets as string[]).filter((s) => typeof s === 'string')
      : [],
  };
}

function isDraftDirty(course: Course | undefined, draft: CourseFormDraft): boolean {
  const baseline = initialDraft(course);
  return (
    baseline.title !== draft.title ||
    baseline.slug !== draft.slug ||
    baseline.description !== draft.description ||
    baseline.shortDesc !== draft.shortDesc ||
    baseline.thumbnail !== draft.thumbnail ||
    baseline.published !== draft.published ||
    baseline.comingSoon !== draft.comingSoon ||
    baseline.price !== draft.price ||
    baseline.applyMode !== draft.applyMode ||
    baseline.externalUrl !== draft.externalUrl ||
    baseline.checkoutAfterApply !== draft.checkoutAfterApply ||
    baseline.notifyClosersOnApply !== draft.notifyClosersOnApply ||
    baseline.bookACallEnabled !== draft.bookACallEnabled ||
    JSON.stringify(baseline.heroStats) !== JSON.stringify(draft.heroStats) ||
    JSON.stringify(baseline.checkoutBullets) !== JSON.stringify(draft.checkoutBullets)
  );
}

/**
 * Live iframe preview of /checkout?courseId=X with the current draft
 * checkout bullets passed in via the admin-only `_checkoutBullets`
 * override param. Debounces URL rebuilds so typing doesn't reload the
 * iframe on every keystroke.
 */
function CheckoutPreview({
  courseId,
  bullets,
}: {
  courseId: string;
  bullets: string[];
}) {
  const [debounced, setDebounced] = useState(bullets);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(bullets), 350);
    return () => clearTimeout(t);
  }, [bullets]);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      courseId,
      _previewAdmin: '1',
    });
    const trimmed = debounced.map((b) => b.trim()).filter((b) => b !== '');
    if (trimmed.length > 0) {
      params.set('_checkoutBullets', JSON.stringify(trimmed));
    }
    return `/checkout?${params.toString()}`;
  }, [courseId, debounced]);

  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Live Checkout Preview
          </span>
          <span className="text-[11px] text-gray-400">
            — exactly what buyers see
          </span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-maxxed-blue hover:underline"
        >
          Open in new tab
        </a>
      </div>
      {/* Iframe at lg+; placeholder at smaller sizes since the checkout
          page is a desktop layout that won't fit a phone viewport. */}
      <div className="hidden lg:block rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <iframe
          src={src}
          className="w-full block bg-white"
          style={{ height: '900px', border: 0 }}
          title="Checkout preview"
        />
      </div>
      <div className="lg:hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <Eye className="w-5 h-5 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-700">
          Preview unavailable on this screen
        </p>
        <p className="text-xs text-gray-500 mt-1">
          The checkout page is sized for desktop. Open it in a new tab to view full-width.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-maxxed-blue hover:underline"
        >
          Open in new tab →
        </a>
      </div>
    </div>
  );
}

export function CourseForm({ course, onDraftChange, onShowPreview }: CourseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CourseFormDraft>(() => initialDraft(course));
  const dirty = isDraftDirty(course, formData);

  // Stream draft state up to the editor wrapper so the Preview tab can
  // render with the live overrides. Fires on every formData change.
  useEffect(() => {
    onDraftChange?.(formData);
  }, [formData, onDraftChange]);

  const updateStat = (idx: number, patch: Partial<HeroStat>) => {
    setFormData((prev) => ({
      ...prev,
      heroStats: prev.heroStats.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };
  const addStat = () => {
    setFormData((prev) => ({
      ...prev,
      heroStats: [
        ...prev.heroStats,
        { iconName: 'BookOpen', iconColor: 'text-blue-300', label: '' },
      ],
    }));
  };
  const removeStat = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      heroStats: prev.heroStats.filter((_, i) => i !== idx),
    }));
  };
  const moveStat = (idx: number, dir: -1 | 1) => {
    setFormData((prev) => {
      const next = [...prev.heroStats];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, heroStats: next };
    });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug for new courses
      slug: course?.id ? prev.slug : generateSlug(title),
    }));
  };

  const handleFileSelected = async (file: File) => {
    setUploadError('');
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'courses');
      const res = await fetch('/api/admin/upload/image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFormData((prev) => ({ ...prev, thumbnail: data.url }));
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = course?.id
        ? `/api/admin/courses/${course.id}`
        : '/api/admin/courses';

      // Submit applyMode + externalUrl independently. When applyMode is OFF
      // we still send null externalUrl so a stray URL doesn't sneak through.
      const externalUrlPayload = formData.applyMode
        ? formData.externalUrl.trim() || null
        : null;
      const response = await fetch(url, {
        method: course?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? Math.round(parseFloat(formData.price) * 100) : null,
          externalUrl: externalUrlPayload,
          applyMode: formData.applyMode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save course');
      }

      const savedCourse = await response.json();
      router.push(`/admin/courses/${savedCourse.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="e.g., Real Estate Fundamentals"
                  required
                  className="mt-1"
                />
              </div>

              {/* Slug */}
              <div className="md:col-span-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center mt-1">
                  <span className="text-gray-500 text-sm mr-2">/courses/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="real-estate-fundamentals"
                    required
                  />
                </div>
              </div>

              {/* Short Description */}
              <div className="md:col-span-2">
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input
                  id="shortDesc"
                  value={formData.shortDesc}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shortDesc: e.target.value }))
                  }
                  placeholder="A brief tagline for course cards"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <Label htmlFor="description">Full Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detailed course description..."
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                />
              </div>

              {/* Thumbnail */}
              <div className="md:col-span-2">
                <Label>Thumbnail</Label>
                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start">
                  {/* Preview */}
                  <div className="w-full sm:w-64 aspect-video rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.thumbnail}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex-1 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelected(f);
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            {formData.thumbnail ? 'Replace image' : 'Upload image'}
                          </>
                        )}
                      </button>
                      {formData.thumbnail && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, thumbnail: '' }))
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowUrlInput((v) => !v)}
                        className="text-sm text-maxxed-blue hover:underline"
                      >
                        {showUrlInput ? 'Hide URL' : 'Paste URL instead'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      PNG, JPG, WebP, or GIF. Max 8MB. 16:9 aspect ratio works best.
                    </p>
                    {uploadError && (
                      <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                    )}
                    {showUrlInput && (
                      <Input
                        id="thumbnail"
                        value={formData.thumbnail}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, thumbnail: e.target.value }))
                        }
                        placeholder="https://..."
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing & Access — Apply Mode toggle and Price/External URL
                  field grouped into one card so they read as a single unit. */}
              <div className="md:col-span-2 space-y-5 rounded-lg border border-gray-200 bg-gray-50/40 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Pricing &amp; Access
                </div>
                <Toggle
                  id="applyMode"
                  checked={formData.applyMode}
                  onChange={(next) =>
                    setFormData((prev) => ({ ...prev, applyMode: next }))
                  }
                  label={
                    <>
                      Application required &mdash; show{' '}
                      <span className="font-semibold">Apply Now</span> button instead of buy button
                    </>
                  }
                  description="When ON, the public course page shows an Apply Now button. The price below is still used for the checkout step that runs after the apply form (when checkout-after-apply is on)."
                />

                {/* Price is always editable. Used for direct checkout when
                    applyMode is OFF, and for the post-apply checkout when
                    both applyMode and checkoutAfterApply are ON. */}
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-500 mr-2">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, price: e.target.value }))
                      }
                      placeholder="0.00 (free)"
                      className="bg-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Exact amount charged at checkout via FanBasis. Leave empty for free.
                  </p>
                </div>

                {/* External URL only matters when applyMode is on. Optional
                    even then — leave blank to use the on-platform /apply/[slug]
                    flow instead of redirecting out. */}
                {formData.applyMode && (
                  <div>
                    <Label htmlFor="externalUrl">
                      Apply URL <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="externalUrl"
                      type="url"
                      value={formData.externalUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, externalUrl: e.target.value }))
                      }
                      placeholder="https://… (leave blank to use the on-platform apply form)"
                      className="mt-1 bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Where the &ldquo;Apply Now&rdquo; button takes the visitor. Leave blank to keep them on-platform — they&apos;ll go through the 5-step apply form instead.
                    </p>
                  </div>
                )}
              </div>

              {/* Visibility group — spans the full row so descriptive
                  text uses the whole container width, not a single grid
                  column. */}
              <div className="md:col-span-2 space-y-5 rounded-lg border border-gray-200 bg-gray-50/40 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Visibility &amp; Status
                </div>
                <Toggle
                  id="published"
                  checked={formData.published}
                  onChange={(next) =>
                    setFormData((prev) => ({ ...prev, published: next }))
                  }
                  label="Published"
                  description="Visible to students. Unpublished courses are hidden from the public catalog and the dashboard."
                />
                <Toggle
                  id="comingSoon"
                  checked={formData.comingSoon}
                  onChange={(next) =>
                    setFormData((prev) => ({ ...prev, comingSoon: next }))
                  }
                  label="Coming Soon"
                  description="Surfaces the course in a dedicated Coming Soon section instead of the main catalog."
                />
              </div>

              {/* Application flow group */}
              <div className="md:col-span-2 space-y-5 rounded-lg border border-gray-200 bg-gray-50/40 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Application Flow
                </div>
                <Toggle
                  id="checkoutAfterApply"
                  checked={formData.checkoutAfterApply}
                  onChange={(next) =>
                    setFormData((prev) => ({ ...prev, checkoutAfterApply: next }))
                  }
                  label="Show checkout after qualification questions"
                  description={
                    <>
                      When this course uses the on-platform{' '}
                      <span className="font-mono text-gray-700">/apply</span> flow, adding a
                      payment step at the end lets qualified buyers pay immediately instead of
                      waiting for the team to reach out. Funnels using this course inherit this
                      setting unless they override it.
                    </>
                  }
                />
                <Toggle
                  id="notifyClosersOnApply"
                  checked={formData.notifyClosersOnApply}
                  onChange={(next) =>
                    setFormData((prev) => ({ ...prev, notifyClosersOnApply: next }))
                  }
                  label="Notify closers when someone applies"
                  description="When ON, applications create a GHL opportunity which fires the closer-notify automation (texts the team a heads-up). Turn OFF when QA-testing a course so you don't spam the team. Default: ON."
                />
                <Toggle
                  id="bookACallEnabled"
                  checked={formData.bookACallEnabled}
                  onChange={(next) =>
                    setFormData((prev) => ({ ...prev, bookACallEnabled: next }))
                  }
                  label='"Book a call" CTA'
                  description='When ON, every funnel + university lead/purchase surface for this course shows a "Have more questions? Book a call with our team" button. Default: ON.'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hero stats — editable badge row shown above the description on
            /courses/[slug]. Leave empty to use the legacy default. */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Hero stats</Label>
              <p className="text-xs text-gray-500 mt-1">
                Badge row shown above the description on the course-detail page.
                Pick an icon, set a color, and write the label. Leave the list
                empty to use the legacy defaults (lessons / certificate /
                lifetime access).
              </p>
            </div>

            {formData.heroStats.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                No custom stats — falling back to defaults.
              </p>
            )}

            <div className="space-y-3">
              {formData.heroStats.map((stat, idx) => {
                const SelectedIcon = getSectionIcon(stat.iconName);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 flex-shrink-0 rounded-md bg-white border flex items-center justify-center"
                        title="Preview"
                      >
                        <SelectedIcon
                          className={`w-4 h-4 ${stat.iconColor || 'text-gray-600'}`}
                        />
                      </div>
                      <Input
                        value={stat.label}
                        onChange={(e) => updateStat(idx, { label: e.target.value })}
                        placeholder="e.g. 6 monthly 1-on-1 calls"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => moveStat(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStat(idx, 1)}
                        disabled={idx === formData.heroStats.length - 1}
                        className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStat(idx)}
                        className="p-1.5 rounded text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <Label className="text-xs">Icon</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {SECTION_ICON_NAMES.map((name) => {
                          const I = SECTION_ICONS[name];
                          const selected = name === stat.iconName;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => updateStat(idx, { iconName: name })}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-colors ${
                                selected
                                  ? 'border-maxxed-blue bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              title={name}
                            >
                              <I
                                className={`w-4 h-4 ${
                                  selected
                                    ? stat.iconColor || 'text-maxxed-blue'
                                    : 'text-gray-600'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {STAT_COLOR_OPTIONS.map((c) => {
                          const selected = c.className === stat.iconColor;
                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => updateStat(idx, { iconColor: c.className })}
                              className={`px-3 py-1 text-xs font-semibold rounded-md border-2 transition-colors ${
                                selected
                                  ? 'border-maxxed-blue bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <span className={c.className}>●</span>{' '}
                              <span className="text-gray-700">{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addStat}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-maxxed-blue border-2 border-dashed border-maxxed-blue/40 rounded-lg hover:bg-maxxed-blue/5"
            >
              <Plus className="w-4 h-4" />
              Add stat
            </button>
          </CardContent>
        </Card>

        {/* Checkout bullets — "What's Included" list shown under the
            course thumbnail on the checkout page. Live preview alongside. */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Checkout bullets</Label>
              <p className="text-xs text-gray-500 mt-1">
                The &ldquo;What&rsquo;s Included&rdquo; list shown under the course thumbnail
                on the checkout page. Empty = use the legacy defaults
                (Immediate access / 1-on-1 with Todd / Certificate / Lifetime
                access / 30-day refund).
              </p>
            </div>

            <div className="space-y-5">
              {/* Editor list */}
              <div className="space-y-2">
                {formData.checkoutBullets.length === 0 && (
                  <p className="text-sm text-gray-400 italic">
                    No custom bullets — falling back to defaults.
                  </p>
                )}
                {formData.checkoutBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={bullet}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          checkoutBullets: prev.checkoutBullets.map((b, i) =>
                            i === idx ? e.target.value : b,
                          ),
                        }))
                      }
                      placeholder="e.g. Lifetime access on all devices"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          checkoutBullets: prev.checkoutBullets.map((b, i) =>
                            i === Math.max(0, idx - 1)
                              ? prev.checkoutBullets[idx]
                              : i === idx
                                ? prev.checkoutBullets[Math.max(0, idx - 1)]
                                : b,
                          ),
                        }))
                      }
                      disabled={idx === 0}
                      className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          checkoutBullets: prev.checkoutBullets.map((b, i) => {
                            const last = prev.checkoutBullets.length - 1;
                            const next = Math.min(last, idx + 1);
                            if (i === idx) return prev.checkoutBullets[next];
                            if (i === next) return prev.checkoutBullets[idx];
                            return b;
                          }),
                        }))
                      }
                      disabled={idx === formData.checkoutBullets.length - 1}
                      className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          checkoutBullets: prev.checkoutBullets.filter((_, i) => i !== idx),
                        }))
                      }
                      className="p-1.5 rounded text-red-500 hover:text-red-700"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      checkoutBullets: [...prev.checkoutBullets, ''],
                    }))
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-maxxed-blue border-2 border-dashed border-maxxed-blue/40 rounded-lg hover:bg-maxxed-blue/5"
                >
                  <Plus className="w-4 h-4" />
                  Add bullet
                </button>
              </div>

              {/* Live preview — iframe of the real /checkout page with
                  the current draft bullets passed in as an admin override.
                  Reflects exactly what buyers see, no mock. */}
              {course?.id && (
                <CheckoutPreview
                  courseId={course.id}
                  bullets={formData.checkoutBullets}
                />
              )}
              {!course?.id && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 italic">
                    Save the course first to see a live checkout preview here.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/courses"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                Unsaved changes
              </span>
            )}
            {onShowPreview && (
              <button
                type="button"
                onClick={onShowPreview}
                className="inline-flex items-center gap-2 px-4 py-2 border border-maxxed-blue/30 text-maxxed-blue rounded-lg text-sm font-semibold hover:bg-maxxed-blue/10"
              >
                <Eye className="w-4 h-4" />
                See Preview
              </button>
            )}
            {course?.id && dirty && (
              <button
                type="button"
                onClick={() => {
                  if (!confirm('Discard unsaved changes?')) return;
                  setFormData(initialDraft(course));
                  setError('');
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" />
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || (!!course?.id && !dirty)}
              className="flex items-center gap-2 px-6 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {course?.id ? 'Save Changes' : 'Create Course'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
