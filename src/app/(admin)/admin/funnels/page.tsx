'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ExternalLink, Trash2, Copy, Check, Tag, Globe, Activity, Zap, BarChart2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { FunnelsSummary } from '@/components/admin/funnel-analytics/FunnelsSummary';
import { FunnelThumb } from '@/components/admin/FunnelThumb';

interface Course {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  metaPixelId?: string | null;
}

interface Funnel {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  course: Course | null;
  config?: { metaPixelId?: string | null } | null;
}

export default function FunnelsPage() {
  const router = useRouter();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newFunnel, setNewFunnel] = useState({ name: '', url: '', courseId: '' });

  const load = useCallback(async () => {
    const [f, c] = await Promise.all([
      fetch('/api/admin/funnels').then((r) => r.json()),
      fetch('/api/admin/courses').then((r) => r.json()),
    ]);
    setFunnels(Array.isArray(f) ? f : []);
    setCourses(Array.isArray(c) ? c.filter((c: Course & { published: boolean }) => c.published) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!newFunnel.name) return;
    setCreating(true);
    const res = await fetch('/api/admin/funnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFunnel),
    });
    if (res.ok) {
      const created = await res.json();
      setNewFunnel({ name: '', url: '', courseId: '' });
      setShowCreate(false);
      router.push(`/admin/funnels/${created.id}`);
    }
    setCreating(false);
  }

  async function deleteFunnel(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`Delete funnel "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/funnels/${id}`, { method: 'DELETE' });
    load();
  }

  async function copyKey(e: React.MouseEvent, key: string) {
    e.stopPropagation();
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function formatPrice(cents: number | null) {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(0)}`;
  }

  const activeFunnels = funnels.filter(f => f.active).length;
  const withCourse = funnels.filter(f => f.course).length;

  const stats = [
    { label: 'Total Funnels', value: funnels.length, icon: Globe, color: 'bg-blue-500' },
    { label: 'Active', value: activeFunnels, icon: Activity, color: 'bg-green-500' },
    { label: 'With Course', value: withCourse, icon: Zap, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funnels</h1>
          <p className="text-gray-600 mt-1">Manage your sales funnel deployments and their content.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/funnels/promo-codes"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Tag className="w-4 h-4" />
            Promo Codes
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Funnel
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Funnel Deployment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                  placeholder="e.g. Main REEB Funnel"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deployed URL</label>
                <input
                  value={newFunnel.url}
                  onChange={(e) => setNewFunnel({ ...newFunnel, url: e.target.value })}
                  placeholder="https://funnel.maxxedout.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={newFunnel.courseId}
                  onChange={(e) => setNewFunnel({ ...newFunnel, courseId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                >
                  <option value="">— Select a course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({formatPrice(c.price)})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={create}
                disabled={creating || !newFunnel.name}
                className="px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Funnel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funnel List — cards with live landing-page thumbnails */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="w-full bg-gray-100 animate-pulse" style={{ aspectRatio: '16 / 10' }} />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : funnels.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="text-center py-16 text-gray-400">
              <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No funnels yet</p>
              <p className="text-sm mt-1">Add your first funnel deployment to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">All Funnels</h2>
            <span className="text-sm text-gray-500">{funnels.length} deployment{funnels.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {funnels.map((f) => (
              <div
                key={f.id}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
              >
                {/* Live thumbnail → opens the editor */}
                <button
                  type="button"
                  onClick={() => router.push(`/admin/funnels/${f.id}`)}
                  className="relative block w-full text-left cursor-pointer"
                  title="Edit this funnel"
                >
                  <FunnelThumb url={f.url} />
                </button>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 truncate">{f.name}</h3>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${f.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {f.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-500 hover:text-maxxed-blue truncate mt-0.5"
                    >
                      {f.url.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 mt-0.5">No URL set</span>
                  )}

                  <div className="mt-2.5 flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-600 truncate">
                      {f.course ? f.course.title : <span className="italic text-gray-400">No course</span>}
                    </span>
                    {f.course && <span className="font-bold text-gray-900 shrink-0">{formatPrice(f.course.price)}</span>}
                  </div>

                  {/* Easy action buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-1.5">
                    <CardBtn icon={Pencil} label="Edit" primary onClick={() => router.push(`/admin/funnels/${f.id}`)} />
                    <CardBtn icon={BarChart2} label="Stats" onClick={() => router.push(`/admin/funnels/${f.id}/analytics`)} />
                    <CardBtn icon={ExternalLink} label="Live" href={f.url || undefined} />
                    <CardBtn icon={Trash2} label="Delete" danger onClick={(e) => deleteFunnel(e, f.id, f.name)} />
                  </div>

                  {/* Footer: API key (left) · Meta Pixel (right) */}
                  {(() => {
                    const pixel = f.config?.metaPixelId || f.course?.metaPixelId || null;
                    return (
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <button
                          onClick={(e) => copyKey(e, f.apiKey)}
                          className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600"
                          title="Copy API key"
                        >
                          {copiedKey === f.apiKey ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          <span className="font-mono">{f.apiKey.slice(0, 12)}…</span>
                        </button>
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] shrink-0"
                          title={pixel ? 'Meta Pixel ID' : 'No Meta Pixel set'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${pixel ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-gray-400">Pixel</span>
                          <span className={`font-mono ${pixel ? 'text-gray-600' : 'text-gray-300'}`}>
                            {pixel || '—'}
                          </span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Stats + analytics — below the funnel cards */}
      {!loading && funnels.length > 0 && (
        <div className="flex flex-wrap items-center gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && funnels.length > 0 && <FunnelsSummary />}
    </div>
  );
}

/** Compact icon+label action button for a funnel card. Renders an external
 *  link when `href` is set, a disabled stub when a link button has no URL,
 *  otherwise a normal button. */
function CardBtn({
  icon: Icon,
  label,
  onClick,
  href,
  primary,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const base =
    'flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-colors';
  const tone = primary
    ? 'bg-maxxed-blue text-white hover:bg-blue-800 cursor-pointer'
    : danger
    ? 'text-red-600 hover:bg-red-50 cursor-pointer'
    : 'text-gray-600 hover:bg-gray-100 cursor-pointer';

  if (href !== undefined) {
    if (!href) {
      return (
        <span className={`${base} text-gray-300 cursor-not-allowed`}>
          <Icon className="w-4 h-4" />
          {label}
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${base} ${tone}`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${tone}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
