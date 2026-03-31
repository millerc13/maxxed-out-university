'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ExternalLink, Edit, Trash2, Copy, Check, RefreshCw, Tag } from 'lucide-react';
import Link from 'next/link';

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
      setNewFunnel({ name: '', url: '', courseId: '' });
      setShowCreate(false);
      load();
    }
    setCreating(false);
  }

  async function deleteFunnel(id: string, name: string) {
    if (!confirm(`Delete funnel "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/funnels/${id}`, { method: 'DELETE' });
    load();
  }

  async function rotateKey(id: string) {
    if (!confirm('Rotate the API key? The funnel will stop working until you update its FUNNEL_API_KEY env var.')) return;
    const res = await fetch(`/api/admin/funnels/${id}/rotate-key`, { method: 'POST' });
    if (res.ok) load();
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function formatPrice(cents: number | null) {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(0)}`;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funnels</h1>
          <p className="text-gray-500 mt-1">Manage your sales funnel deployments and their content.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/funnels/promo-codes"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Tag className="w-4 h-4" />
            Promo Codes
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" />
            Add Funnel
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
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

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : funnels.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No funnels yet</p>
          <p className="text-sm mt-1">Add your first funnel deployment to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Course</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">API Key</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {funnels.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{f.name}</div>
                    {f.url && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{f.url}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {f.course ? (
                      <div>
                        <div className="text-gray-900">{f.course.title}</div>
                        <div className="text-xs text-gray-400">{formatPrice(f.course.price)}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No course assigned</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {f.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono truncate max-w-[140px]">
                        {f.apiKey}
                      </code>
                      <button onClick={() => copyKey(f.apiKey)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        {copiedKey === f.apiKey ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => rotateKey(f.id)} title="Rotate key" className="text-gray-400 hover:text-orange-500 flex-shrink-0">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {new Date(f.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <Link href={`/admin/funnels/${f.id}`} className="text-gray-400 hover:text-maxxed-blue">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button onClick={() => deleteFunnel(f.id, f.name)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
