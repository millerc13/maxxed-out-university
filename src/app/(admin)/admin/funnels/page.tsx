'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ExternalLink, Trash2, Copy, Check, RefreshCw, Tag, Globe, Activity, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

interface Course {
  id: string;
  title: string;
  slug: string;
  price: number | null;
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

      {/* Stats */}
      {!loading && funnels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {/* Funnel List */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-gray-400 text-sm">Loading…</div>
          </CardContent>
        </Card>
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
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900">All Funnels</h2>
              <span className="text-sm text-gray-500">{funnels.length} deployment{funnels.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y">
              {funnels.map((f) => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/admin/funnels/${f.id}`)}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${f.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{f.name}</p>
                      {f.url && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">{f.url}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-8 flex-shrink-0">
                    {/* Course */}
                    <div className="text-right hidden sm:block w-48">
                      {f.course ? (
                        <>
                          <p className="text-sm text-gray-900 truncate">{f.course.title}</p>
                          <p className="text-xs text-gray-400">{formatPrice(f.course.price)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No course</p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {f.active ? 'Active' : 'Inactive'}
                    </span>

                    {/* API Key */}
                    <div className="hidden lg:flex items-center gap-1.5">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono truncate max-w-[100px]">
                        {f.apiKey.slice(0, 12)}…
                      </code>
                      <button
                        onClick={(e) => copyKey(e, f.apiKey)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        {copiedKey === f.apiKey ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Updated */}
                    <p className="text-xs text-gray-400 hidden md:block w-20 text-right">
                      {new Date(f.updatedAt).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {f.url && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={(e) => deleteFunnel(e, f.id, f.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
