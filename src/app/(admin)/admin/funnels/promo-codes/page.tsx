'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  Search,
  Copy,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Toggle } from '@/components/admin/Toggle';
import { Dropdown } from '@/components/admin/Dropdown';

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
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      fetch('/api/admin/promo-codes').then((r) => r.json()),
      fetch('/api/admin/courses').then((r) => r.json()),
    ]);
    setPromos(Array.isArray(p) ? p : []);
    setCourses(
      Array.isArray(c)
        ? c.filter((c: Course & { published: boolean }) => c.published)
        : [],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      discountValue:
        promo.discountType === 'PERCENTAGE'
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
    if (!form.code.trim()) {
      setError('Code is required');
      return;
    }
    const discountVal = parseFloat(form.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      setError('Discount value must be a positive number');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountVal > 100) {
      setError('Percentage cannot exceed 100');
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discountType: form.discountType,
      discountValue:
        form.discountType === 'PERCENTAGE'
          ? Math.round(discountVal)
          : Math.round(discountVal * 100),
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      applyToAll: form.applyToAll,
      courseIds: form.applyToAll ? [] : form.courseIds,
      active: form.active,
    };

    const url = editingId
      ? `/api/admin/promo-codes/${editingId}`
      : '/api/admin/promo-codes';
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

  async function toggleActive(id: string, next: boolean) {
    // Optimistic flip — revert on failure.
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: next } : p)),
    );
    const res = await fetch(`/api/admin/promo-codes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: !next } : p)),
      );
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      /* ignore */
    }
  }

  function formatDiscount(promo: PromoCode) {
    if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}%`;
    return `$${(promo.discountValue / 100).toFixed(0)}`;
  }

  function expiryState(expiresAt: string | null): {
    label: string;
    tone: 'muted' | 'expired' | 'soon';
  } {
    if (!expiresAt) return { label: 'No expiry', tone: 'muted' };
    const d = new Date(expiresAt);
    const now = new Date();
    if (d < now) return { label: 'Expired', tone: 'expired' };
    const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    if (days <= 7) return { label: `${days}d left`, tone: 'soon' };
    return {
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      tone: 'muted',
    };
  }

  const filteredPromos = promos.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.code.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      p.courses.some((c) => c.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-maxxed-blue/10 text-maxxed-blue">
              <Tag className="w-4 h-4" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          </div>
          <p className="text-gray-500 mt-1.5 text-sm">
            Discount codes applied at checkout. Per-course or apply to everything.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-maxxed-blue text-white rounded-lg text-sm font-semibold hover:bg-maxxed-blue-dark shadow-[0_4px_14px_rgba(0,0,255,0.25)] hover:shadow-[0_8px_22px_rgba(0,0,255,0.35)] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Promo Code
        </button>
      </div>

      {/* Visibility note */}
      <div className="flex items-start gap-3 mb-7 px-4 py-3 rounded-lg border border-maxxed-blue/15 bg-maxxed-blue/5 text-[13px] text-gray-700">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-maxxed-blue/15 text-maxxed-blue mt-0.5">
          <Tag className="w-3 h-3" />
        </span>
        <span>
          The promo input only appears at checkout when there&apos;s at least one
          active code for that course. Pause every applicable code and the
          field disappears entirely.
        </span>
      </div>

      {/* Search + counts */}
      {!loading && promos.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, description, or course"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-maxxed-blue"
            />
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            {filteredPromos.length} of {promos.length}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-maxxed-blue/10 text-maxxed-blue mb-4">
            <Tag className="w-6 h-6" />
          </span>
          <p className="text-lg font-bold text-gray-900">No promo codes yet</p>
          <p className="text-sm text-gray-500 mt-1.5">
            Create your first code to offer discounts at checkout.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-semibold hover:bg-maxxed-blue-dark"
          >
            <Plus className="w-4 h-4" />
            Create your first code
          </button>
        </div>
      ) : filteredPromos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No codes match &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPromos.map((p) => {
            const expiry = expiryState(p.expiresAt);
            const usagePct = p.maxUses
              ? Math.min(100, Math.round((p.currentUses / p.maxUses) * 100))
              : null;
            return (
              <div
                key={p.id}
                className={`group relative bg-white rounded-xl border transition-shadow hover:shadow-md overflow-hidden ${
                  p.active ? 'border-gray-200' : 'border-gray-200 opacity-70'
                }`}
              >
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    p.active ? 'bg-maxxed-blue' : 'bg-gray-300'
                  }`}
                />

                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-4 items-center px-6 py-4 pl-8">
                  {/* Code + description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(p.code)}
                        className="inline-flex items-center gap-1.5 font-mono font-bold text-gray-900 hover:text-maxxed-blue transition-colors"
                        title="Copy code"
                      >
                        {p.code}
                        {copiedCode === p.code ? (
                          <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                      {!p.active && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Paused
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-maxxed-blue/10 text-maxxed-blue">
                      {p.discountType === 'PERCENTAGE' ? (
                        <Percent className="w-3.5 h-3.5" />
                      ) : (
                        <DollarSign className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="text-base font-bold text-gray-900">
                      {formatDiscount(p)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                      {p.discountType === 'PERCENTAGE' ? 'off' : 'off'}
                    </span>
                  </div>

                  {/* Uses */}
                  <div className="text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold text-gray-900">{p.currentUses}</span>
                      <span className="text-gray-400">
                        / {p.maxUses ?? '∞'}
                      </span>
                    </div>
                    {usagePct !== null && (
                      <div className="mt-1.5 h-1 w-20 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full ${usagePct >= 100 ? 'bg-red-400' : 'bg-maxxed-blue'}`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Scope + expiry */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5">
                      {p.applyToAll ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] bg-amber-100 text-amber-700">
                            All courses
                          </span>
                        </>
                      ) : p.courses.length === 0 ? (
                        <span className="text-gray-400 italic">No courses</span>
                      ) : (
                        <span className="text-gray-600 truncate">
                          {p.courses.length === 1
                            ? p.courses[0].title
                            : `${p.courses.length} courses`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span
                        className={
                          expiry.tone === 'expired'
                            ? 'text-red-500 font-semibold'
                            : expiry.tone === 'soon'
                            ? 'text-amber-600 font-semibold'
                            : 'text-gray-500'
                        }
                      >
                        {expiry.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions — status switch + caption, then edit/delete */}
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.active}
                      aria-label={`${p.active ? 'Pause' : 'Activate'} promo code ${p.code}`}
                      onClick={() => toggleActive(p.id, !p.active)}
                      className="flex items-center gap-2 group/sw cursor-pointer"
                    >
                      <span
                        aria-hidden
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                          width: '32px',
                          height: '18px',
                          borderRadius: '9999px',
                          background: p.active ? '#0000FF' : '#CBD5E1',
                          transition: 'background-color 200ms ease-out',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            width: '14px',
                            height: '14px',
                            borderRadius: '9999px',
                            background: '#fff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            transform: `translateX(${p.active ? '14px' : '0'})`,
                            transition: 'transform 200ms ease-out',
                          }}
                        />
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.14em] transition-colors"
                        style={{ color: p.active ? '#0000FF' : '#9CA3AF' }}
                      >
                        {p.active ? 'On' : 'Off'}
                      </span>
                    </button>
                    <div className="w-px h-5 bg-gray-200" />
                    <button
                      onClick={() => openEdit(p)}
                      className="p-2 rounded-md text-gray-400 hover:text-maxxed-blue hover:bg-maxxed-blue/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePromo(p.id, p.code)}
                      className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="bg-white shadow-2xl w-full overflow-hidden flex flex-col"
            style={{
              maxWidth: '520px',
              maxHeight: 'calc(100vh - 2rem)',
              borderRadius: '12px',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 shrink-0">
              <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">
                {editingId ? 'Edit promo code' : 'New promo code'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ fontSize: '14px' }}>
              {/* Code + note */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.toUpperCase().replace(/\s/g, ''),
                      })
                    }
                    placeholder="LAUNCH50"
                    className="w-full border border-gray-300 rounded-md px-3 h-9 text-[14px] font-mono font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-maxxed-blue/30 focus:border-maxxed-blue"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Internal note <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Black Friday 2026 — 20% off"
                    className="w-full border border-gray-300 rounded-md px-3 h-9 text-[14px] focus:outline-none focus:ring-2 focus:ring-maxxed-blue/30 focus:border-maxxed-blue"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Discount type
                  </label>
                  <Dropdown
                    value={form.discountType}
                    onChange={(v) => setForm({ ...form, discountType: v })}
                    options={[
                      {
                        value: 'PERCENTAGE',
                        label: 'Percentage',
                        icon: <Percent className="w-3.5 h-3.5" />,
                      },
                      {
                        value: 'FIXED',
                        label: 'Fixed amount',
                        icon: <DollarSign className="w-3.5 h-3.5" />,
                      },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    {form.discountType === 'PERCENTAGE' ? 'Percent off' : 'Dollars off'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] pointer-events-none">
                      {form.discountType === 'PERCENTAGE' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                      step={form.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                      value={form.discountValue}
                      onChange={(e) =>
                        setForm({ ...form, discountValue: e.target.value })
                      }
                      placeholder={form.discountType === 'PERCENTAGE' ? '20' : '50'}
                      className="w-full bg-white border border-gray-300 rounded-md pl-7 pr-3 h-9 text-[14px] focus:outline-none focus:ring-2 focus:ring-maxxed-blue/30 focus:border-maxxed-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Max uses + expires */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Max uses <span className="text-gray-400 font-normal">(blank = unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm({ ...form, maxUses: e.target.value })
                    }
                    placeholder="∞"
                    className="w-full bg-white border border-gray-300 rounded-md px-3 h-9 text-[14px] focus:outline-none focus:ring-2 focus:ring-maxxed-blue/30 focus:border-maxxed-blue"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Expires <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded-md px-3 h-9 text-[14px] focus:outline-none focus:ring-2 focus:ring-maxxed-blue/30 focus:border-maxxed-blue"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Scope */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-2">
                  Applies to
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, applyToAll: true, courseIds: [] })}
                    className={`text-left px-3 py-2 rounded-md border text-[13px] transition-colors ${
                      form.applyToAll
                        ? 'border-maxxed-blue bg-maxxed-blue/5 text-maxxed-blue font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All courses
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, applyToAll: false })}
                    className={`text-left px-3 py-2 rounded-md border text-[13px] transition-colors ${
                      !form.applyToAll
                        ? 'border-maxxed-blue bg-maxxed-blue/5 text-maxxed-blue font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Specific courses
                  </button>
                </div>
                {!form.applyToAll && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-md p-2 max-h-44 overflow-y-auto">
                    {courses.length === 0 ? (
                      <p className="text-[13px] text-gray-400 text-center py-2">
                        No published courses yet.
                      </p>
                    ) : (
                      courses.map((c) => {
                        const checked = form.courseIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const ids = checked
                                ? form.courseIds.filter((id) => id !== c.id)
                                : [...form.courseIds, c.id];
                              setForm({ ...form, courseIds: ids });
                            }}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left text-[13px] transition-colors ${
                              checked
                                ? 'bg-maxxed-blue/10 text-maxxed-blue'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className={`shrink-0 inline-flex h-4 w-4 items-center justify-center rounded border ${
                                checked
                                  ? 'border-maxxed-blue bg-maxxed-blue'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {checked && (
                                <svg
                                  viewBox="0 0 12 12"
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M2 6 L5 9 L10 3" />
                                </svg>
                              )}
                            </span>
                            <span className="flex-1 truncate">{c.title}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* Active */}
              <Toggle
                checked={form.active}
                onChange={(next) => setForm({ ...form, active: next })}
                label="Active"
                description="Inactive codes will be rejected at checkout."
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-3.5 h-9 text-[13px] font-medium text-gray-600 hover:text-gray-900 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 h-9 bg-maxxed-blue text-white rounded-md text-[13px] font-semibold hover:bg-maxxed-blue-dark disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
