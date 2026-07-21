'use client';

import { useMemo, useState } from 'react';
import {
  READINESS_OPTIONS,
  INVESTMENT_OPTIONS,
  WORK_OPTIONS,
  TIER_ACTION,
  type Tier,
} from '@/lib/cohort-scoring';

export type CohortRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  readiness: string;
  investment: string;
  work: string;
  note: string | null;
  score: number;
  tier: string;
  isVip: boolean;
  smsConsent: boolean;
  smsConsentAt: string | null;
  ghlContactId: string | null;
  createdAt: string;
};

const TIER_UI: Record<string, { chip: string; accent: string; ring: string; label: string }> = {
  A: { chip: 'bg-emerald-600 text-white', accent: 'border-l-emerald-500', ring: 'ring-emerald-200', label: 'Call first' },
  B: { chip: 'bg-blue-600 text-white', accent: 'border-l-blue-500', ring: 'ring-blue-200', label: 'Call same night' },
  C: { chip: 'bg-amber-500 text-white', accent: 'border-l-amber-400', ring: 'ring-amber-200', label: 'Next morning' },
  D: { chip: 'bg-gray-400 text-white', accent: 'border-l-gray-300', ring: 'ring-gray-200', label: 'Nurture' },
};

const find = <T extends { value: string }>(opts: readonly T[], v: string) => opts.find((o) => o.value === v);

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * "Send checkout" — emails AND texts the applicant their enrollment link.
 * Two buttons because whether to give the 15% discount is a judgement the
 * closer makes on the call, not a global setting. Reports what actually
 * delivered rather than a blanket "sent".
 */
function SendCheckout({ id, name }: { id: string; name: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function send(promo: boolean) {
    if (state === 'sending') return;
    const label = promo ? `Send ${name.split(' ')[0]} the link WITH the 15% discount?` : `Send ${name.split(' ')[0]} the full-price enrollment link?`;
    if (!confirm(label)) return;
    setState('sending');
    try {
      const res = await fetch(`/api/cohort-application/${id}/send-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promo }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || d.smsError || 'Send failed');
      setState('done');
      setMsg(`Sent${d.promo ? ` (${d.promo})` : ''} — email ${d.email ? '✓' : '✗'} · text ${d.sms ? '✓' : '✗'}`);
    } catch (e) {
      setState('error');
      setMsg(e instanceof Error ? e.message : 'Send failed');
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-center text-sm font-bold text-emerald-800">
        ✅ {msg}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => send(false)}
          disabled={state === 'sending'}
          className="rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-gray-700 disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending…' : '💳 Send checkout'}
        </button>
        <button
          onClick={() => send(true)}
          disabled={state === 'sending'}
          className="rounded-lg border-2 border-emerald-600 px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          {state === 'sending' ? '…' : '🏷️ Send + 15% off'}
        </button>
      </div>
      {state === 'error' && <p className="mt-1.5 text-center text-xs font-semibold text-red-600">{msg}</p>}
    </div>
  );
}

/** One labelled answer block — replaces the old dot-separated run-on line. */
function Answer({ q, label, points }: { q: string; label: string; points?: number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{q}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">
        {label}
        {points != null && (
          <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-gray-500 ring-1 ring-gray-200">
            {points} pts
          </span>
        )}
      </p>
    </div>
  );
}

export function CohortCallSheet({ rows }: { rows: CohortRow[] }) {
  const [tierFilter, setTierFilter] = useState<'ALL' | Tier>('ALL');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length, A: 0, B: 0, C: 0, D: 0 };
    rows.forEach((r) => { c[r.tier] = (c[r.tier] ?? 0) + 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (tierFilter === 'ALL' || r.tier === tierFilter) &&
        (!term || `${r.name} ${r.email} ${r.phone} ${r.state}`.toLowerCase().includes(term))
    );
  }, [rows, tierFilter, q]);

  return (
    <div>
      {/* Tier filter — closers work one tier at a time */}
      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {(['ALL', 'A', 'B', 'C', 'D'] as const).map((t) => {
          const active = tierFilter === t;
          const ui = t === 'ALL' ? null : TIER_UI[t];
          return (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`flex flex-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {t === 'ALL' ? 'All' : `Tier ${t}`}
              {ui && !active && <span className="hidden text-xs font-semibold text-gray-400 sm:inline">{ui.label}</span>}
              <span className={`rounded-full px-1.5 text-xs font-black tabular-nums ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                {counts[t] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, phone, state…"
        className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
      />

      <p className="mt-3 text-sm text-gray-500">
        {filtered.length} of {rows.length} · tap a card for the full application
      </p>

      <div className="mt-3 space-y-3">
        {filtered.map((r) => {
          const ui = TIER_UI[r.tier] ?? TIER_UI.D;
          const open = openId === r.id;
          const readiness = find(READINESS_OPTIONS, r.readiness);
          const investment = find(INVESTMENT_OPTIONS, r.investment);
          const work = find(WORK_OPTIONS, r.work);

          return (
            <div
              key={r.id}
              className={`overflow-hidden rounded-2xl border border-l-4 bg-white shadow-sm ring-1 ring-gray-900/5 transition ${ui.accent} ${
                open ? `ring-2 ${ui.ring}` : ''
              }`}
            >
              {/* ---- Header (tap target) ---- */}
              <button
                onClick={() => setOpenId(open ? null : r.id)}
                className="w-full px-4 pt-4 text-left"
                aria-expanded={open}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black tracking-wide ${ui.chip}`}>
                        {r.tier} · {r.score} pts
                      </span>
                      {r.isVip && (
                        <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-800">
                          ★ VIP buyer
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 truncate text-lg font-extrabold leading-tight text-gray-900">{r.name}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {r.state} · {timeAgo(r.createdAt)}
                    </p>
                  </div>

                  {/* Desktop: contact + compact actions live here, so the wide
                      layout is used instead of leaving a void on the right. */}
                  <div className="hidden flex-none items-center gap-2 sm:flex">
                    <div className="mr-1 text-right">
                      <p className="text-sm font-bold text-gray-900">{r.phone}</p>
                      <p className="max-w-[220px] truncate text-xs text-gray-500">{r.email}</p>
                    </div>
                    <span
                      onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${r.phone}`; }}
                      className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      📞 Call
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); window.location.href = `sms:${r.phone}`; }}
                      className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-blue-500 hover:text-blue-700"
                    >
                      💬
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${r.email}`; }}
                      className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-blue-500 hover:text-blue-700"
                    >
                      ✉️
                    </span>
                  </div>

                </div>

                {/* Summary answers — each labelled with its question, because
                    "Most of it" tells a closer nothing on its own. */}
                {!open && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { q: 'Stage', a: readiness?.short, pts: readiness?.points },
                      { q: '$10k', a: investment?.short, pts: investment?.points },
                      { q: 'Work', a: work?.short, pts: work?.points },
                    ].map((c) => (
                      <div key={c.q} className="min-w-0 rounded-lg bg-gray-50 px-2 py-2">
                        {/* Label truncates and the points badge never shrinks —
                            at 320px the badge was getting clipped mid-character. */}
                        <div className="flex items-baseline gap-1">
                          <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            {c.q}
                          </span>
                          {c.pts != null && (
                            <span className="flex-none text-[10px] font-black text-gray-300">{c.pts}p</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold leading-tight text-gray-800 [overflow-wrap:anywhere] sm:text-xs">{c.a}</p>
                      </div>
                    ))}
                  </div>
                )}

                {r.note && !open && (
                  // Clamp on an inner element — clamping the padded box itself
                  // let a third line bleed past the edge on narrow screens.
                  <div className="mt-3 border-l-[3px] border-blue-400 bg-blue-50/60 px-3 py-2">
                    <p className="line-clamp-2 break-words text-sm italic leading-snug text-gray-800">
                      “{r.note}”
                    </p>
                  </div>
                )}

                {/* Explicit affordance — a bare chevron didn't read as
                    "there's more here". Part of the header tap target. */}
                <span className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 py-2.5 text-xs font-bold text-blue-700">
                  {open ? 'Hide details' : 'View full application'}
                  <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
                    ▼
                  </span>
                </span>
              </button>

              {/* ---- Expanded: the full application ---- */}
              {open && (
                <div className="space-y-3 px-4 pt-4">
                  {r.note && (
                    <div className="rounded-lg border-l-[3px] border-blue-500 bg-blue-50 px-3 py-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                        Before you dial
                      </p>
                      <p className="mt-1 text-sm italic leading-snug text-gray-900">“{r.note}”</p>
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Answer q="State" label={r.state} />
                    <Answer q="Where they are" label={readiness?.label ?? r.readiness} points={readiness?.points} />
                    <Answer q="$10k investment" label={investment?.label ?? r.investment} points={investment?.points} />
                    <Answer q="Work situation" label={work?.label ?? r.work} points={work?.points} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-white">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-300">Total score</span>
                    <span className="text-lg font-black tabular-nums">{r.score} / 28</span>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                    <p className="font-bold uppercase tracking-wide text-gray-400">Record</p>
                    <p className="mt-1">
                      Submitted{' '}
                      {new Date(r.createdAt).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                    <p className="mt-0.5">
                      SMS consent: {r.smsConsent ? '✅ given on submit' : '—'}
                      {r.smsConsentAt &&
                        ` (${new Date(r.smsConsentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })})`}
                    </p>
                    <p className="mt-0.5">CRM: {r.ghlContactId ? '✅ synced to GoHighLevel' : 'not synced'}</p>
                  </div>
                </div>
              )}

              {/* ---- Send the enrollment link, usually mid-call ---- */}
              <SendCheckout id={r.id} name={r.name} />

              {/* ---- Mobile actions: full-width thumb targets (desktop uses the
                   compact group in the header instead) ---- */}
              <div className="mt-3 grid grid-cols-3 gap-px border-t border-gray-100 bg-gray-100 sm:hidden">
                <a
                  href={`tel:${r.phone}`}
                  className="flex items-center justify-center gap-1.5 bg-white py-3.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  📞 Call
                </a>
                <a
                  href={`sms:${r.phone}`}
                  className="flex items-center justify-center gap-1.5 bg-white py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  💬 Text
                </a>
                <a
                  href={`mailto:${r.email}`}
                  className="flex items-center justify-center gap-1.5 bg-white py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  ✉️ Email
                </a>
              </div>

              {open && (
                <div className="space-y-1 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-gray-900 sm:hidden">{r.phone}</p>
                  <p className="break-all text-gray-600 sm:hidden">{r.email}</p>
                  <p className="text-xs text-gray-500">{TIER_ACTION[r.tier as Tier]}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          {rows.length === 0
            ? 'No applications yet — they appear here the moment the form is submitted.'
            : 'No applicants match this filter.'}
        </p>
      )}
    </div>
  );
}
