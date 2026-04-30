'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Users,
  TrendingUp,
  ShoppingBag,
  Inbox,
} from 'lucide-react';
import { ConversationViewer } from '@/components/admin/ConversationViewer';

interface Contact {
  id: string;
  email: string | null;
  name: string | null;
  ghlContactId: string;
  lastActivity: string;
  badge: 'lead' | 'purchased';
  purchasedCourse: string | null;
  enrollmentCount: number;
  totalSpentCents: number;
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function initialOf(c: Contact): string {
  return (c.name || c.email || '?').trim().charAt(0).toUpperCase();
}

const BADGE_STYLE: Record<Contact['badge'], { label: string; cls: string }> = {
  lead: {
    label: 'Lead',
    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  purchased: {
    label: 'Purchased',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
};

export function MessagesPageClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{
    key: string; // unique id used for highlighting (Contact.id)
    contactId?: string;
    email?: string;
    label?: string;
  } | null>(null);
  const [filter, setFilter] = useState<'all' | 'lead' | 'purchased'>('all');
  const [includeAll, setIncludeAll] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/messages/contacts${includeAll ? '?includeAll=1' : ''}`)
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((d) => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false));
  }, [includeAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => filter === 'all' || c.badge === filter)
      .filter((c) => {
        if (!q) return true;
        return (
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q)
        );
      });
  }, [contacts, search, filter]);

  // KPI counts derived from the unfiltered list so the totals don't
  // shift as the admin types in the search box.
  const counts = useMemo(() => {
    const leads = contacts.filter((c) => c.badge === 'lead').length;
    const purchased = contacts.filter((c) => c.badge === 'purchased').length;
    const revenueCents = contacts.reduce(
      (sum, c) => sum + (c.totalSpentCents || 0),
      0
    );
    return { total: contacts.length, leads, purchased, revenueCents };
  }, [contacts]);

  function manualSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = search.trim();
    if (!v.includes('@')) return; // a name search just filters the list above
    setSelected({ key: `manual:${v}`, email: v, label: v });
  }

  async function deleteContact(c: Contact) {
    const display = c.name || c.email || c.ghlContactId;
    if (
      !confirm(
        `Delete GHL contact "${display}"?\n\nThis removes the contact and all of their messages from GHL. The local university account (if any) is not touched. This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting((prev) => new Set(prev).add(c.id));
    try {
      const res = await fetch(`/api/admin/ghl/contacts/${c.ghlContactId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setContacts((prev) => prev.filter((x) => x.id !== c.id));
        if (selected?.key === c.id) setSelected(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Delete failed: ${data.error ?? res.status}`);
      }
    } catch (err) {
      alert(`Delete failed: ${(err as Error).message}`);
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }
  }

  // Selecting a contact swaps the whole page over to the conversation
  // viewer at every viewport. Click "Back" to return to the list.
  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to contacts
          </button>
          {selected.label && (
            <span className="text-xs sm:text-sm text-gray-500 truncate">
              <span className="font-semibold text-gray-900 capitalize">
                {selected.label}
              </span>
            </span>
          )}
        </div>
        <ConversationViewer
          contactId={selected.contactId}
          email={selected.email}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* ─── Header ────────────────────────────────────────── */}
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-maxxed-blue to-maxxed-blue-dark text-white shadow-sm">
            <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
              Messages
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-tight">
              {includeAll
                ? 'Every recent GHL contact (course leads, mastermind, everything).'
                : 'Course funnel applicants and buyers only.'}{' '}
              <button
                type="button"
                onClick={() => setIncludeAll((v) => !v)}
                className="font-semibold text-maxxed-blue hover:text-maxxed-blue-dark underline-offset-2 hover:underline cursor-pointer"
              >
                {includeAll ? 'Show course only' : 'Show all GHL'}
              </button>
            </p>
          </div>
        </div>
      </header>

      {/* ─── KPI strip ─────────────────────────────────────── */}
      <section
        aria-label="Inbox summary"
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        <KpiCard
          icon={Users}
          label="Contacts"
          value={loading ? '—' : counts.total.toLocaleString()}
          tone="neutral"
        />
        <KpiCard
          icon={TrendingUp}
          label="Leads"
          value={loading ? '—' : counts.leads.toLocaleString()}
          tone="amber"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Purchased"
          value={loading ? '—' : counts.purchased.toLocaleString()}
          subValue={
            !loading && counts.revenueCents > 0
              ? formatUsd(counts.revenueCents)
              : undefined
          }
          tone="emerald"
        />
      </section>

      {/* ─── Search + list ─────────────────────────────────── */}
      <section className="flex flex-col gap-3" aria-label="Contacts">
          {/* Search + filter chips */}
          <form
            onSubmit={manualSearch}
            className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100"
          >
            <div className="flex items-center gap-2 px-3.5 py-2.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or email…"
                className="flex-1 bg-transparent text-sm placeholder:text-gray-400 outline-none focus:outline-none"
                aria-label="Filter contacts"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Clear filter"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
              {(['all', 'lead', 'purchased'] as const).map((f) => {
                const isActive = filter === f;
                const n =
                  f === 'all'
                    ? counts.total
                    : f === 'lead'
                      ? counts.leads
                      : counts.purchased;
                const label = f === 'all' ? 'All' : f === 'lead' ? 'Leads' : 'Purchased';
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maxxed-blue/40 ${
                      isActive
                        ? 'bg-maxxed-blue text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-gray-500 ring-1 ring-gray-200'
                      }`}
                    >
                      {loading ? '…' : n}
                    </span>
                  </button>
                );
              })}
            </div>
          </form>

          {/* Contact list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyList contactsLength={contacts.length} />
            ) : (
              <ul
                role="list"
                className="divide-y divide-gray-100"
              >
                {filtered.map((c) => (
                  <li key={c.id}>
                    <ContactRow
                      contact={c}
                      isDeleting={deleting.has(c.id)}
                      onSelect={() =>
                        setSelected({
                          key: c.id,
                          contactId: c.ghlContactId,
                          email: c.email ?? undefined,
                          label: c.name || c.email || c.ghlContactId,
                        })
                      }
                      onDelete={() => deleteContact(c)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  subValue,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  subValue?: string;
  tone: 'neutral' | 'amber' | 'emerald';
}) {
  const toneCls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-gray-50 text-gray-700 ring-gray-200';
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-2.5 py-2.5 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
      <span
        className={`inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${toneCls}`}
      >
        <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          {label}
        </div>
        <div className="text-sm sm:text-base font-extrabold text-gray-900 tabular-nums leading-tight">
          {value}
        </div>
        {subValue && (
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 tabular-nums leading-tight mt-0.5">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactRow({
  contact: c,
  isDeleting,
  onSelect,
  onDelete,
}: {
  contact: Contact;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const badge = BADGE_STYLE[c.badge];
  const display = c.name || c.email || c.ghlContactId;
  const isPurchased = c.badge === 'purchased';

  return (
    <div className="group relative flex items-stretch transition-colors duration-200 hover:bg-gray-50/80">
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 min-w-0 items-center gap-3 px-3.5 py-3 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-maxxed-blue/40"
      >
        {/* Avatar */}
        <span
          className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-sm ${
            isPurchased
              ? 'bg-gradient-to-br from-maxxed-blue to-maxxed-blue-dark text-white'
              : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
          }`}
        >
          {initialOf(c)}
        </span>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate capitalize">
              {c.name || c.email || '(no name)'}
            </p>
            <span
              className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-[0.14em] ${badge.cls}`}
            >
              {badge.label}
            </span>
          </div>
          {c.name && c.email && (
            <p className="text-xs text-gray-500 truncate normal-case">{c.email}</p>
          )}
          {c.purchasedCourse && (
            <p className="text-xs text-gray-600 truncate mt-0.5 flex items-center gap-1.5">
              <span className="truncate">{c.purchasedCourse}</span>
              {c.enrollmentCount > 1 && (
                <span className="text-gray-400 shrink-0">
                  +{c.enrollmentCount - 1}
                </span>
              )}
              {c.totalSpentCents > 0 && (
                <span className="ml-auto pl-2 font-bold text-emerald-700 tabular-nums shrink-0">
                  {formatUsd(c.totalSpentCents)}
                </span>
              )}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-0.5">
            {new Date(c.lastActivity).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </button>

      {/* Right-side actions */}
      <div className="flex items-center gap-0.5 pr-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="p-2 rounded-lg text-gray-400 transition-colors duration-200 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          title="Delete this contact from GHL"
          aria-label={`Delete ${display}`}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 self-center group-hover:text-gray-500 transition-colors" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
            <div className="h-2.5 w-2/3 bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-1/3 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyList({ contactsLength }: { contactsLength: number }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
        <Inbox className="w-6 h-6" />
      </span>
      <p className="text-sm font-semibold text-gray-700 mb-1">
        No contacts to show
      </p>
      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
        {contactsLength === 0
          ? 'Anyone who applies, buys, or is manually enrolled with a phone or email will show up here.'
          : 'Nothing matches the current filter. Try clearing the search or switching the chip above.'}
      </p>
    </div>
  );
}

