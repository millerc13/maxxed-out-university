'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
}

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  applyToAll: boolean;
  active: boolean;
  createdAt: string;
  courses: Course[];
  _count: { enrollments: number };
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: '',
  maxUses: '',
  expiresAt: '',
  applyToAll: true,
  courseIds: [] as string[],
  active: true,
};

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      fetch('/api/admin/promo-codes').then((r) => r.json()),
      fetch('/api/admin/courses').then((r) => r.json()),
    ]);
    setPromos(Array.isArray(p) ? p : []);
    setCourses(Array.isArray(c) ? c.filter((c: Course & { published: boolean }) => c.published) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setShowModal(true);
  }

  function openEdit(promo: PromoCode) {
    setForm({
      code: promo.code,
      description: promo.description ?? '',
      discountType: promo.discountType,
      discountValue: promo.discountType === 'PERCENTAGE'
        ? promo.discountValue.toString()
        : (promo.discountValue / 100).toString(),
      maxUses: promo.maxUses?.toString() ?? '',
      expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : '',
      applyToAll: promo.applyToAll,
      courseIds: promo.courses.map((c) => c.id),
      active: promo.active,
    });
    setEditingId(promo.id);
    setError('');
    setShowModal(true);
  }

  async function save() {
    setError('');
    if (!form.code.trim()) { setError('Code is required'); return; }
    const discountVal = parseFloat(form.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) { setError('Discount value must be a positive number'); return; }

    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discountType: form.discountType,
      discountValue: form.discountType === 'PERCENTAGE' ? Math.round(discountVal) : Math.round(discountVal * 100),
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      applyToAll: form.applyToAll,
      courseIds: form.applyToAll ? [] : form.courseIds,
      active: form.active,
    };

    const url = editingId ? `/api/admin/promo-codes/${editingId}` : '/api/admin/promo-codes';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to save');
    }
    setSaving(false);
  }

  async function deletePromo(id: string, code: string) {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/promo-codes/${id}`, { method: 'DELETE' });
    load();
  }

  function formatDiscount(promo: PromoCode) {
    if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}%`;
    return `$${(promo.discountValue / 100).toFixed(0)}`;
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return '—';
    const d = new Date(expiresAt);
    if (d < new Date()) return <span className="text-red-500">Expired</span>;
    return d.toLocaleDateString();
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/funnels" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 mt-1">Create discount codes for use in your funnel checkouts.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          <Plus className="w-4 h-4" />
          Create Promo Code
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Promo Code' : 'Create Promo Code'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="SAVE20"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (internal note)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Black Friday 2025 — 20% off all courses"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.discountType === 'PERCENTAGE' ? 'Percent Off' : 'Amount Off ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    placeholder={form.discountType === 'PERCENTAGE' ? '20' : '50'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (leave blank = unlimited)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="∞"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      checked={form.applyToAll}
                      onChange={() => setForm({ ...form, applyToAll: true, courseIds: [] })}
                      className="accent-maxxed-blue"
                    />
                    All courses
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      checked={!form.applyToAll}
                      onChange={() => setForm({ ...form, applyToAll: false })}
                      className="accent-maxxed-blue"
                    />
                    Specific courses
                  </label>
                </div>
                {!form.applyToAll && (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {courses.length === 0 ? (
                      <p className="text-sm text-gray-400">No published courses</p>
                    ) : courses.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={form.courseIds.includes(c.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...form.courseIds, c.id]
                              : form.courseIds.filter((id) => id !== c.id);
                            setForm({ ...form, courseIds: ids });
                          }}
                          className="accent-maxxed-blue"
                        />
                        {c.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${form.active ? 'bg-maxxed-blue' : 'bg-gray-300'}`}
                  onClick={() => setForm({ ...form, active: !form.active })}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{form.active ? 'Active' : 'Inactive'}</span>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : promos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No promo codes yet</p>
          <p className="text-sm mt-1">Create your first code to offer discounts in the funnel checkout.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Discount</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Uses</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Expires</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Courses</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <code className="font-mono font-semibold text-gray-900">{p.code}</code>
                    {p.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">{formatDiscount(p)}</td>
                  <td className="px-5 py-4">
                    <span className="text-gray-900">{p.currentUses}</span>
                    {p.maxUses && (
                      <span className="text-gray-400"> / {p.maxUses}</span>
                    )}
                    {!p.maxUses && <span className="text-gray-400"> / ∞</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{formatExpiry(p.expiresAt)}</td>
                  <td className="px-5 py-4">
                    {p.applyToAll ? (
                      <span className="text-gray-500 text-xs">All courses</span>
                    ) : p.courses.length === 0 ? (
                      <span className="text-gray-400 text-xs italic">None</span>
                    ) : (
                      <div className="space-y-0.5">
                        {p.courses.map((c) => (
                          <div key={c.id} className="text-xs text-gray-600">{c.title}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-maxxed-blue">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deletePromo(p.id, p.code)} className="text-gray-400 hover:text-red-500">
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
