"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SimuliveEditor } from "./SimuliveEditor";
import { BotsManager } from "./BotsManager";
import { ContentEditor } from "./ContentEditor";
import {
  IconArrowRight,
  IconBell,
  IconCalendar,
  IconChart,
  IconExternal,
  IconLink,
  IconSettings,
  IconSparkles,
  IconTicket,
  IconUsers,
  IconVideo,
} from "./Icons";

const input =
  "w-full rounded-lg border border-black/10 bg-surface dark:border-white/15 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const btn = "btn-primary px-4 py-2 text-sm";
const btnGhost = "rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-ink-body transition hover:border-brand hover:text-brand";

type AnyRec = Record<string, any>;

const TAB_ICONS: Record<string, (p: { className?: string }) => React.ReactNode> = {
  Overview: IconChart,
  Settings: IconSettings,
  Content: IconVideo,
  Sessions: IconCalendar,
  Bots: IconSparkles,
  Tickets: IconTicket,
  Reminders: IconBell,
  GHL: IconLink,
  Registrants: IconUsers,
};

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${method} ${url} failed`);
  return data;
}

const TABS = ["Overview", "Settings", "Content", "Sessions", "Bots", "Tickets", "Reminders", "GHL", "Registrants"] as const;
type Tab = (typeof TABS)[number];

export function WebinarEditor({ initial, appBaseUrl }: { initial: AnyRec; appBaseUrl: string }) {
  const id = initial.id as string;
  // Default to Sessions so opening a webinar on mobile lands straight on its
  // sessions (the operator's most common need); Overview is one tap away.
  const [tab, setTab] = useState<Tab>("Sessions");
  const [toast, setToast] = useState("");
  // When jumping to Registrants from a session card, pre-filter to that
  // session's date (matched on session label). "" = show all.
  const [regSession, setRegSession] = useState("");

  // Deep-link the active tab via ?tab= so admins can share/bookmark e.g. …?tab=Reminders.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("tab");
    if (p && (TABS as readonly string[]).includes(p)) setTab(p as Tab);
    // Deep-link a pre-filtered registrant view: ?tab=Registrants&session=<label>
    const s = params.get("session");
    if (s) setRegSession(s);
  }, []);
  const selectTab = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  };
  // Go to the registrant list, optionally pre-filtered to one session's date.
  const goRegistrants = (sessionLabel = "") => {
    setRegSession(sessionLabel);
    selectTab("Registrants");
  };

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const statusStyle: Record<string, string> =
    {
      published: "bg-emerald-100 text-emerald-700",
      draft: "bg-amber-100 text-amber-700",
      archived: "bg-ink-light/15 text-ink-muted",
    };

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted transition hover:text-brand">
        ← All webinars
      </Link>

      {/* Header card */}
      <div className="card mt-3 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-gradient-webinar-hero text-white">
          <IconVideo className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">{initial.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusStyle[initial.status] ?? ""}`}>
              {initial.status}
            </span>
          </div>
          <a href={`/${initial.slug}`} target="_blank" className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {appBaseUrl || ""}/{initial.slug} <IconExternal className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Section nav.
          Mobile: two large quick-tiles for the primary destinations (Sessions,
          Registrants) plus a full "jump to section" dropdown for the rest —
          replaces a wrapping pill cloud that was hard to tap on a phone.
          Desktop (lg+): the icon pill row. */}
      <div className="mt-5 lg:mt-6">
        <div className="space-y-2.5 lg:hidden">
          <div className="grid grid-cols-2 gap-2.5">
            {(["Sessions", "Registrants"] as Tab[]).map((t) => {
              const Icon = TAB_ICONS[t];
              const active = tab === t;
              const sub = t === "Sessions" ? `${initial.sessions?.length ?? 0} scheduled` : "View list";
              return (
                <button
                  key={t}
                  onClick={() => (t === "Registrants" ? goRegistrants("") : selectTab(t))}
                  aria-pressed={active}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                    active
                      ? "border-brand bg-brand text-white shadow-card"
                      : "border-black/10 bg-surface text-ink hover:border-brand/40 dark:border-white/15"
                  }`}
                >
                  <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${active ? "bg-white/20" : "bg-brand-tint text-brand"}`}>
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{t}</span>
                    <span className={`block text-[11px] leading-tight ${active ? "text-white/75" : "text-ink-muted"}`}>{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <select
              value={tab}
              onChange={(e) => { const t = e.target.value as Tab; if (t === "Registrants") goRegistrants(""); else selectTab(t); }}
              aria-label="Jump to section"
              className="w-full appearance-none rounded-xl border border-black/10 bg-surface px-4 py-3 pr-10 text-sm font-bold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/15"
            >
              {TABS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="hidden flex-wrap gap-1.5 lg:flex">
          {TABS.map((t) => {
            const Icon = TAB_ICONS[t];
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => selectTab(t)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-brand text-white shadow-card" : "text-ink-body hover:bg-brand-tint hover:text-brand"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {toast && <div className="mt-4 rounded-lg border border-brand/40 bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">{toast}</div>}

      <div className="mt-6">
        {tab === "Overview" && <OverviewTab id={id} slug={initial.slug} status={initial.status} />}
        {tab === "Settings" && <SettingsTab id={id} initial={initial} flash={flash} />}
        {tab === "Content" && <ContentEditor id={id} initialContent={initial.content ?? {}} title={initial.title} slug={initial.slug} appBaseUrl={appBaseUrl} flash={flash} />}
        {tab === "Sessions" && <SessionsTab id={id} slug={initial.slug} appBaseUrl={appBaseUrl} initialSessions={initial.sessions} tz={initial.defaultTimezone} flash={flash} goRegistrants={goRegistrants} />}
        {tab === "Bots" && <BotsManager webinarId={id} flash={flash} />}
        {tab === "Tickets" && <TicketsTab id={id} initialTiers={initial.tiers} flash={flash} />}
        {tab === "Reminders" && <RemindersTab id={id} initialReminders={initial.reminderTemplates} sessions={initial.sessions ?? []} tz={initial.defaultTimezone} flash={flash} />}
        {tab === "GHL" && <GhlTab id={id} initial={initial} flash={flash} />}
        {tab === "Registrants" && <RegistrantsTab id={id} flash={flash} initialSession={regSession} />}
      </div>
    </div>
  );
}

function OverviewTab({ id, slug, status }: { id: string; slug: string; status: string }) {
  const [stats, setStats] = useState<AnyRec | null>(null);
  const [sim, setSim] = useState<AnyRec | null>(null);
  const [ops, setOps] = useState<AnyRec | null>(null);
  const [abTest, setAbTest] = useState<AnyRec[]>([]);
  useEffect(() => {
    api(`/api/webinar-admin/webinars/${id}/stats`, "GET")
      .then((d) => {
        setStats(d.stats);
        setSim(d.simulated ?? null);
        setOps(d.ops ?? null);
        setAbTest(d.abTest ?? []);
      })
      .catch(() => {});
  }, [id]);

  const fmtDur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
  const cards = stats
    ? [
        { label: "Registered", value: stats.registered, tone: "brand" },
        { label: "Free confirmed", value: stats.freeConfirmed, tone: "brand" },
        { label: "VIP purchased", value: stats.vipPurchased, tone: "gold" },
        { label: "Attended", value: stats.attended, tone: "emerald" },
        { label: "No-show", value: stats.noShow, tone: "muted" },
        { label: "Attendance rate", value: `${stats.attendanceRatePct}%`, tone: "emerald" },
        { label: "Avg watch time", value: fmtDur(stats.avgWatchSec ?? 0), tone: "brand" },
        { label: "Real chat msgs", value: stats.realChatMessages ?? 0, tone: "brand" },
        { label: "VIP conversion", value: `${stats.vipConversionPct}%`, tone: "gold" },
        { label: "Revenue", value: `$${((stats.revenueCents ?? 0) / 100).toFixed(2)}`, tone: "emerald" },
      ]
    : [];

  const toneBar: Record<string, string> = {
    brand: "before:bg-brand",
    gold: "before:bg-gold",
    emerald: "before:bg-emerald-500",
    muted: "before:bg-ink-light",
  };
  const toneText: Record<string, string> = {
    brand: "text-brand",
    gold: "text-amber-600",
    emerald: "text-emerald-600",
    muted: "text-ink-muted",
  };

  return (
    <div>
      {status !== "published" && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 h-2 w-2 flex-none rounded-full bg-amber-500" />
          <p>
            This webinar is <b>{status}</b> — the public page at <code className="font-semibold">/{slug}</code> won&apos;t accept
            registrations until it&apos;s published (Settings tab).
          </p>
        </div>
      )}
      {!stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Real numbers</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className={`card relative overflow-hidden p-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneBar[c.tone]}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{c.label}</p>
                <p className={`mt-1 text-2xl font-extrabold tabular-nums ${toneText[c.tone]}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Funnel visualization — real numbers only */}
          {stats.registered > 0 && (
            <div className="card mt-6 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Funnel</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { label: "Registered", v: stats.registered, cls: "bg-brand" },
                  { label: "Confirmed", v: stats.freeConfirmed + stats.vipPurchased, cls: "bg-brand/70" },
                  { label: "Attended", v: stats.attended, cls: "bg-emerald-500" },
                  { label: "VIP purchased", v: stats.vipPurchased, cls: "bg-gold" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3 text-sm">
                    <span className="w-28 flex-none text-xs font-semibold text-ink-body">{r.label}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/10">
                      <div className={`h-full rounded ${r.cls}`} style={{ width: `${Math.max(2, Math.round((r.v / stats.registered) * 100))}%` }} />
                    </div>
                    <span className="w-16 flex-none text-right text-xs font-extrabold tabular-nums text-ink">
                      {r.v} <span className="font-semibold text-ink-muted">({Math.round((r.v / stats.registered) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A/B landing test — Todd's judgement funnel per copy variant */}
          {abTest.some((r) => r.variant !== "none" && r.registrations > 0) && (
            <div className="card mt-6 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">A/B landing test</p>
              <p className="mt-1 text-xs text-ink-muted">
                A = &ldquo;Hidden Industry&rdquo; (curiosity) · B = &ldquo;Contrarian&rdquo; (operators). Judge on show-up → purchase, not opt-in alone.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                      <th className="pb-2">Variant</th>
                      <th className="pb-2 text-right">Registrations</th>
                      <th className="pb-2 text-right">Showed up</th>
                      <th className="pb-2 text-right">Show-up %</th>
                      <th className="pb-2 text-right">VIP bought</th>
                      <th className="pb-2 text-right">VIP %</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abTest.map((r) => (
                      <tr key={r.variant} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-2 font-extrabold text-ink">
                          {r.variant === "a" ? "A — Hidden Industry" : r.variant === "b" ? "B — Contrarian" : "(untagged)"}
                        </td>
                        <td className="py-2 text-right font-bold tabular-nums text-ink">{r.registrations}</td>
                        <td className="py-2 text-right tabular-nums text-ink-body">{r.showedUp}</td>
                        <td className="py-2 text-right tabular-nums text-ink-body">{r.showUpPct}%</td>
                        <td className="py-2 text-right tabular-nums text-gold">{r.purchased}</td>
                        <td className="py-2 text-right tabular-nums text-ink-body">{r.purchasePct}%</td>
                        <td className="py-2 text-right font-bold tabular-nums text-emerald-600">${(r.revenueCents / 100).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ops: sessions & bots + pipelines */}
          {ops && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="card p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Sessions & bots</p>
                <div className="mt-3 space-y-2">
                  {ops.sessions.map((s: AnyRec) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-black/5 px-3 py-2 text-xs dark:border-white/10">
                      <span className="font-bold text-ink">{s.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${s.mode === "simulive" ? "bg-brand-tint text-brand" : "bg-black/5 text-ink-muted dark:bg-white/10"}`}>{s.mode === "simulive" ? "Simulive" : "Zoom"}</span>
                      <span className="text-ink-muted">{s.registered} reg</span>
                      {s.mode === "live_zoom" && (
                        <>
                          <span className={s.hasJoinUrl ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 font-bold"}>{s.hasJoinUrl ? "✓ zoom link" : "✕ no zoom link"}</span>
                          <span className={s.autoPlayBot ? (s.hasVideo ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 font-bold") : "text-amber-600"}>
                            {s.autoPlayBot ? (s.hasVideo ? "✓ video bot" : "! bot on, no video") : "bot off"}
                          </span>
                          {s.zoomChatBots && <span className="text-amber-600 dark:text-gold">chat crew{s.personaBots ? ` (${s.personaBots})` : ""}</span>}
                        </>
                      )}
                      {s.botStatus && <span className="ml-auto rounded bg-black/5 px-1.5 py-0.5 font-bold uppercase text-ink-muted dark:bg-white/10">{s.botStatus}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="card p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Reminders</p>
                  <div className="mt-2 flex gap-5">
                    <div><p className="text-xl font-extrabold tabular-nums text-ink">{ops.reminders.pending}</p><p className="text-[10px] font-bold uppercase text-ink-muted">Queued</p></div>
                    <div><p className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{ops.reminders.sent}</p><p className="text-[10px] font-bold uppercase text-ink-muted">Sent</p></div>
                    <div><p className={`text-xl font-extrabold tabular-nums ${ops.reminders.failed ? "text-red-500" : "text-ink"}`}>{ops.reminders.failed}</p><p className="text-[10px] font-bold uppercase text-ink-muted">Failed</p></div>
                  </div>
                </div>
                <div className="card p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">GHL sync</p>
                  <div className="mt-2 flex gap-5">
                    <div><p className="text-xl font-extrabold tabular-nums text-ink">{ops.ghl.pending}</p><p className="text-[10px] font-bold uppercase text-ink-muted">Pending</p></div>
                    <div><p className={`text-xl font-extrabold tabular-nums ${ops.ghl.failed ? "text-red-500" : "text-ink"}`}>{ops.ghl.failed}</p><p className="text-[10px] font-bold uppercase text-ink-muted">Failed</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simulated overlay — clearly separated, never mixed with real numbers. */}
          {sim && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-brand/30 bg-brand-tint/40 p-5">
              <div className="flex items-center gap-2">
                <IconSparkles className="h-4 w-4 text-brand" />
                <p className="text-xs font-bold uppercase tracking-wide text-brand">Simulated overlay (shown to attendees — not real)</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Bots", value: sim.bots },
                  { label: "Scripted msgs", value: sim.scriptedMessages },
                  { label: "AI-written", value: sim.aiMessages },
                  { label: "Hand-authored", value: sim.hardcodedMessages },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl bg-surface/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{c.label}</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand">{c.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-muted">{sim.note}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SettingsTab({ id, initial, flash }: { id: string; initial: AnyRec; flash: (m: string) => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "",
    subtitle: initial.subtitle ?? "",
    hostName: initial.hostName ?? "",
    template: initial.template ?? "classic",
    status: initial.status ?? "draft",
    defaultTimezone: initial.defaultTimezone ?? "America/New_York",
    paymentProvider: initial.paymentProvider ?? "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      // "" = follow the PAYMENT_PROVIDER env default → stored as null.
      await api(`/api/webinar-admin/webinars/${id}`, "PATCH", { ...f, paymentProvider: f.paymentProvider || null });
      flash("Settings saved");
    } catch (e) {
      flash(String(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-xl space-y-3">
      <Field label="Title"><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="Subtitle"><input className={input} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></Field>
      <Field label="Host name"><input className={input} value={f.hostName} onChange={(e) => setF({ ...f, hostName: e.target.value })} /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Template">
          <select className={input} value={f.template} onChange={(e) => setF({ ...f, template: e.target.value })}>
            <option value="classic">classic</option>
            <option value="dark">dark</option>
            <option value="bold">bold</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </Field>
        <Field label="Timezone"><input className={input} value={f.defaultTimezone} onChange={(e) => setF({ ...f, defaultTimezone: e.target.value })} /></Field>
      </div>
      <Field label="Payment provider (VIP checkout)">
        <select className={input} value={f.paymentProvider} onChange={(e) => setF({ ...f, paymentProvider: e.target.value })}>
          <option value="">Platform default</option>
          <option value="fanbasis">Fanbasis</option>
          <option value="stripe">Stripe</option>
        </select>
      </Field>
      <p className="-mt-1 text-xs text-ink-muted">
        Which processor handles VIP purchases for this webinar. &ldquo;Platform default&rdquo; follows the server
        setting{f.paymentProvider === "" ? "" : " (overridden here)"}; if Fanbasis is selected but unreachable,
        checkout automatically falls back to Stripe so no sale is lost.
      </p>
      <button className={btn} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
    </div>
  );
}

function SessionsTab({ id, slug, appBaseUrl, initialSessions, tz, flash, goRegistrants }: { id: string; slug: string; appBaseUrl: string; initialSessions: AnyRec[]; tz: string; flash: (m: string) => void; goRegistrants: (label?: string) => void }) {
  const [sessions, setSessions] = useState<AnyRec[]>(initialSessions);
  const [n, setN] = useState({ startsAt: "", joinUrl: "", vipJoinUrl: "", qaUrl: "", zoomMeetingId: "", capacity: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function add() {
    if (!n.startsAt) return flash("Pick a date/time");
    try {
      const { session } = await api(`/api/webinar-admin/webinars/${id}/sessions`, "POST", {
        startsAt: new Date(n.startsAt).toISOString(),
        joinUrl: n.joinUrl || undefined,
        vipJoinUrl: n.vipJoinUrl || undefined,
        qaUrl: n.qaUrl || undefined,
        zoomMeetingId: n.zoomMeetingId || undefined,
        capacity: n.capacity ? Number(n.capacity) : undefined,
      });
      setSessions([...sessions, session].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setN({ startsAt: "", joinUrl: "", vipJoinUrl: "", qaUrl: "", zoomMeetingId: "", capacity: "" });
      flash("Session added");
    } catch (e) {
      flash(String(e));
    }
  }
  async function del(sid: string) {
    if (!window.confirm("Delete this session? Its registrations and reminder jobs are removed too. This cannot be undone.")) return;
    await api(`/api/webinar-admin/webinars/${id}/sessions/${sid}`, "DELETE");
    setSessions(sessions.filter((s) => s.id !== sid));
    flash("Session deleted");
  }

  const totalReg = sessions.reduce((sum, s) => sum + (s.registeredCount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Fast path to the FULL registrant list (per-session buttons live on each
          card below). */}
      <button
        onClick={() => goRegistrants("")}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand-tint/50 px-4 py-3 text-left transition hover:bg-brand-tint active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand/15 text-brand">
            <IconUsers className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-ink">All registrants</span>
            <span className="block text-xs text-ink-muted"><span className="tabular-nums font-semibold text-ink-body">{totalReg}</span> across {sessions.length} session{sessions.length === 1 ? "" : "s"}</span>
          </span>
        </span>
        <IconArrowRight className="h-5 w-5 flex-none text-brand" />
      </button>

      {/* Session cards */}
      <div className="space-y-2.5">
        {sessions.map((s) => {
          const d = new Date(s.startsAt);
          const dateStr = fmtTz(d, tz, { weekday: "short", month: "short", day: "numeric" });
          const timeStr = fmtTz(d, tz, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
          const isSim = s.mode === "simulive";
          const open = expanded === s.id;
          return (
            <div key={s.id} className="overflow-hidden rounded-xl border border-black/10 bg-surface dark:border-white/10">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${isSim ? "bg-brand-tint text-brand" : "bg-black/5 text-ink-muted dark:bg-white/10"}`}>
                      {isSim ? "Simulive" : "Live Zoom"}
                    </span>
                    <p className="mt-1.5 text-base font-extrabold leading-tight text-ink">{Number.isNaN(d.getTime()) ? (s.label ?? "—") : dateStr}</p>
                    {!Number.isNaN(d.getTime()) && <p className="text-sm font-bold tabular-nums text-brand">{timeStr}</p>}
                  </div>
                  <div className="flex-none rounded-lg bg-black/5 px-3 py-1.5 text-center dark:bg-white/10">
                    <p className="text-2xl font-extrabold leading-none tabular-nums text-ink">{s.registeredCount ?? 0}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">registered</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                  <span className="font-semibold">{s.sessionCode}</span>
                  {s.mode === "live_zoom" && (
                    <span className={s.zoomMeetingId ? "" : "font-bold text-red-500"}>
                      {s.zoomMeetingId ? `Zoom ${s.zoomMeetingId}` : "no zoom id"}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {/* Primary, unmistakable blue action → this date's registrants. */}
                  <button
                    onClick={() => goRegistrants(s.label ?? "")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand/90 active:scale-[0.99]"
                  >
                    <IconUsers className="h-4 w-4" /> See registrants ({s.registeredCount ?? 0})
                  </button>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${open ? "border-brand bg-brand-tint text-brand" : "border-black/10 text-ink-body hover:border-brand hover:text-brand dark:border-white/15"}`}
                      onClick={() => setExpanded(open ? null : s.id)}
                    >
                      {open ? "Close setup" : "Session setup"}
                    </button>
                    <button
                      className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-500/10"
                      onClick={() => del(s.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {open && (
                <div className="border-t border-black/10 bg-canvas/40 p-4 dark:border-white/10">
                  <SimuliveEditor
                    webinarId={id}
                    slug={slug}
                    appBaseUrl={appBaseUrl}
                    session={{ id: s.id, mode: s.mode, replayUrl: s.replayUrl, videoDurationSec: s.videoDurationSec, simChatEnabled: s.simChatEnabled, viewerBase: s.viewerBase, autoPlayBot: s.autoPlayBot, botVideoUrl: s.botVideoUrl, botStatus: s.botStatus, zoomChatBots: s.zoomChatBots }}
                    flash={flash}
                  />
                </div>
              )}
            </div>
          );
        })}
        {sessions.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 bg-surface p-6 text-center text-sm text-ink-muted dark:border-white/15">
            No sessions yet — add one below.
          </div>
        )}
      </div>

      {/* Add session — collapsed by default to keep the list clean on mobile. */}
      <div className="rounded-xl border border-black/10 bg-surface dark:border-white/10">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-ink"
        >
          <span className="flex items-center gap-2"><IconCalendar className="h-4 w-4 text-brand" /> Add session</span>
          <span className="text-ink-muted">{showAdd ? "–" : "+"}</span>
        </button>
        {showAdd && (
          <div className="border-t border-black/10 p-4 dark:border-white/10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Times in {tz}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={input} type="datetime-local" value={n.startsAt} onChange={(e) => setN({ ...n, startsAt: e.target.value })} />
              <input className={input} placeholder="Zoom meeting/webinar ID" value={n.zoomMeetingId} onChange={(e) => setN({ ...n, zoomMeetingId: e.target.value })} />
              <input className={input} placeholder="Join URL (free)" value={n.joinUrl} onChange={(e) => setN({ ...n, joinUrl: e.target.value })} />
              <input className={input} placeholder="VIP join URL" value={n.vipJoinUrl} onChange={(e) => setN({ ...n, vipJoinUrl: e.target.value })} />
              <input className={input} placeholder="Q&A URL" value={n.qaUrl} onChange={(e) => setN({ ...n, qaUrl: e.target.value })} />
              <input className={input} placeholder="Capacity (optional)" value={n.capacity} onChange={(e) => setN({ ...n, capacity: e.target.value })} />
            </div>
            <button className={`${btn} mt-3 w-full sm:w-auto`} onClick={add}>Add session</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketsTab({ id, initialTiers, flash }: { id: string; initialTiers: AnyRec[]; flash: (m: string) => void }) {
  const [tiers, setTiers] = useState<AnyRec[]>(initialTiers);
  const [n, setN] = useState({ name: "", price: "", capacity: "", ghlPackageValue: "" });

  async function add() {
    if (!n.name) return flash("Name required");
    try {
      const { tier } = await api(`/api/webinar-admin/webinars/${id}/tiers`, "POST", {
        name: n.name,
        priceCents: Math.round(Number(n.price || 0) * 100),
        capacity: n.capacity ? Number(n.capacity) : undefined,
        ghlPackageValue: n.ghlPackageValue || undefined,
        order: tiers.length,
      });
      setTiers([...tiers, tier]);
      setN({ name: "", price: "", capacity: "", ghlPackageValue: "" });
      flash("Tier added");
    } catch (e) {
      flash(String(e));
    }
  }
  async function del(tid: string) {
    await api(`/api/webinar-admin/webinars/${id}/tiers/${tid}`, "DELETE");
    setTiers(tiers.filter((t) => t.id !== tid));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-black/10 bg-surface p-3 text-sm">
            <div>
              <p className="font-medium">{t.name} — {t.priceCents === 0 ? "Free" : `$${(t.priceCents / 100).toFixed(2)}`}</p>
              <p className="text-xs text-ink-light">{t.ghlPackageValue ? `pkg: ${t.ghlPackageValue}` : "no pkg"}{t.capacity ? ` · cap ${t.capacity}` : ""}</p>
            </div>
            <button className={btnGhost} onClick={() => del(t.id)}>Delete</button>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-black/10 bg-surface p-4">
        <p className="mb-2 text-sm font-semibold">Add ticket tier</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={input} placeholder="Name (e.g. VIP Session)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <input className={input} placeholder="Price USD (0 = free)" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} />
          <input className={input} placeholder="Capacity (optional)" value={n.capacity} onChange={(e) => setN({ ...n, capacity: e.target.value })} />
          <input className={input} placeholder="GHL package value (e.g. VIP)" value={n.ghlPackageValue} onChange={(e) => setN({ ...n, ghlPackageValue: e.target.value })} />
        </div>
        <button className={`${btn} mt-3`} onClick={add}>Add tier</button>
      </div>
    </div>
  );
}

const REM_STATUS_STYLE: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  pending: "bg-black/5 text-ink-muted dark:bg-white/10",
  skipped: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-black/5 text-ink-light dark:bg-white/10",
};

function fmtTz(d: Date, tz: string, opts: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz || "America/New_York", ...opts }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  }
}

function RemindersTab({ id, initialReminders, sessions, tz, flash }: { id: string; initialReminders: AnyRec[]; sessions: AnyRec[]; tz: string; flash: (m: string) => void }) {
  const [rems, setRems] = useState<AnyRec[]>(initialReminders);
  const [view, setView] = useState<"list" | "calendar" | "sends">("list");
  const [sends, setSends] = useState<AnyRec | null>(null);
  useEffect(() => {
    if (view === "sends" && sends === null) {
      api(`/api/webinar-admin/webinars/${id}/sends`, "GET").then(setSends).catch(() => {});
    }
  }, [view, sends, id]);
  const [logsFor, setLogsFor] = useState<AnyRec | null>(null);
  const [n, setN] = useState({ channel: "email", offsetMinutes: "-1440", anchor: "session_start", audience: "all", subject: "", body: "" });

  async function add() {
    if (!n.body) return flash("Body required");
    try {
      const { reminder } = await api(`/api/webinar-admin/webinars/${id}/reminders`, "POST", {
        channel: n.channel,
        offsetMinutes: Number(n.offsetMinutes),
        anchor: n.anchor,
        audience: n.audience,
        subject: n.subject || undefined,
        body: n.body,
        order: rems.length,
      });
      setRems([...rems, reminder]);
      setN({ ...n, subject: "", body: "" });
      flash("Reminder added");
    } catch (e) {
      flash(String(e));
    }
  }
  async function del(rid: string) {
    await api(`/api/webinar-admin/webinars/${id}/reminders/${rid}`, "DELETE");
    setRems(rems.filter((r) => r.id !== rid));
  }
  async function toggleActive(r: AnyRec) {
    try {
      const { reminder } = await api(`/api/webinar-admin/webinars/${id}/reminders/${r.id}`, "PATCH", { active: !(r.active !== false) });
      setRems(rems.map((x) => (x.id === r.id ? { ...x, active: reminder?.active ?? !(r.active !== false) } : x)));
      flash(r.active !== false ? "Reminder paused" : "Reminder resumed — jobs materialize on the next registration/purchase sync");
    } catch (e) {
      flash(String(e));
    }
  }
  async function seedPresets() {
    try {
      const res = await api(`/api/webinar-admin/webinars/${id}/reminders/presets`, "POST");
      if (res.reminders) setRems(res.reminders);
      flash(res.added > 0 ? `Added ${res.added} preset reminders` : "All presets already present");
    } catch (e) {
      flash(String(e));
    }
  }
  async function testSend(rid: string) {
    const to = window.prompt("Send a test render to which email?");
    if (!to) return;
    try {
      const res = await api(`/api/webinar-admin/webinars/${id}/reminders/${rid}/test`, "POST", { to });
      flash(res.sent ? `Test sent to ${to}` : `Not sent: ${res.skipped ?? "unknown"}`);
    } catch (e) {
      flash(String(e));
    }
  }
  const fmtOffset = (m: number) => (m < 0 ? `T${Math.round(m / 60)}h` : m === 0 ? "T0" : `+${m}m`);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-surface p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-body">Email via Resend · SMS via GoHighLevel. Tokens resolve per-registrant at send time.</p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-black/5 p-0.5 dark:bg-white/10">
            <button className={`rounded-md px-3 py-1 text-xs font-bold transition ${view === "list" ? "bg-brand text-white shadow-card" : "text-ink-muted hover:text-brand"}`} onClick={() => setView("list")}>List</button>
            <button className={`rounded-md px-3 py-1 text-xs font-bold transition ${view === "calendar" ? "bg-brand text-white shadow-card" : "text-ink-muted hover:text-brand"}`} onClick={() => setView("calendar")}>Calendar</button>
            <button className={`rounded-md px-3 py-1 text-xs font-bold transition ${view === "sends" ? "bg-brand text-white shadow-card" : "text-ink-muted hover:text-brand"}`} onClick={() => { setSends(null); setView("sends"); }}>Delivery log</button>
          </div>
          <button className={btnGhost} onClick={seedPresets}>Add presets</button>
        </div>
      </div>

      {view === "sends" ? (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Every message this webinar has sent (latest 200)</p>
            {sends && (
              <p className="text-xs font-semibold text-ink-muted">
                {Object.entries(sends.counts ?? {}).map(([k, v]) => `${v} ${k}`).join(" · ") || "no jobs yet"}
              </p>
            )}
          </div>
          {!sends ? (
            <p className="mt-4 text-sm text-ink-muted">Loading…</p>
          ) : (sends.sends ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Nothing sent yet — sends appear here the moment the first reminder goes out.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
                  <tr><th className="p-2">When</th><th className="p-2">To</th><th className="p-2">Ch</th><th className="p-2">Message</th><th className="p-2">Session</th><th className="p-2">Status</th></tr>
                </thead>
                <tbody>
                  {(sends.sends ?? []).map((j: AnyRec) => (
                    <tr key={j.id} className="border-t border-black/5 dark:border-white/10">
                      <td className="whitespace-nowrap p-2 text-xs text-ink-muted">{new Date(j.sentAt ?? j.scheduledFor).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      <td className="p-2 font-medium text-ink">{j.to}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${j.channel === "sms" ? "bg-violet-100 text-violet-700" : "bg-brand-tint text-brand"}`}>{j.channel}</span></td>
                      <td className="max-w-[240px] truncate p-2 text-ink-body">#{j.templateOrder} · {j.message}</td>
                      <td className="whitespace-nowrap p-2 text-xs text-ink-muted">{j.session}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${REM_STATUS_STYLE[j.status] ?? ""}`}>{j.status}</span>{j.error && <span className="ml-1 text-[10px] text-red-500" title={j.error}>!</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : view === "calendar" ? (
        <ReminderCalendar rems={rems} sessions={sessions} tz={tz} onLogs={setLogsFor} fmtOffset={fmtOffset} />
      ) : (
        <div className="space-y-2">
          {rems.map((r) => (
            <div key={r.id} onClick={() => setLogsFor(r)} className="flex cursor-pointer flex-col gap-2 rounded-xl border border-black/10 bg-surface p-3 text-sm transition hover:border-brand/50 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${r.channel === "sms" ? "bg-violet-100 text-violet-700" : "bg-brand-tint text-brand"}`}>{r.channel}</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-muted dark:bg-white/10">{fmtOffset(r.offsetMinutes)} · {String(r.anchor).replace("_", " ")}</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-muted dark:bg-white/10">{r.audience}</span>
                  {r.active === false && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">paused</span>}
                </div>
                <p className="mt-1 truncate text-xs text-ink-light">{r.subject ? `${r.subject} — ` : ""}{String(r.body).slice(0, 90)}…</p>
              </div>
              <div className="flex flex-none items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-brand">View log →</span>
                {r.channel === "email" && <button className={btnGhost} onClick={() => testSend(r.id)}>Test</button>}
                <button className={btnGhost} onClick={() => toggleActive(r)}>{r.active === false ? "Resume" : "Pause"}</button>
                <button className={btnGhost} onClick={() => del(r.id)}>Delete</button>
              </div>
            </div>
          ))}
          {rems.length === 0 && <p className="text-sm text-ink-muted">No reminders yet — add the standard presets above or create one below.</p>}
        </div>
      )}
      <div className="rounded-xl border border-black/10 bg-surface p-4">
        <p className="mb-2 text-sm font-semibold">Add reminder</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <select className={input} value={n.channel} onChange={(e) => setN({ ...n, channel: e.target.value })}><option value="email">email</option><option value="sms">sms</option></select>
          <input className={input} placeholder="offset min (-1440)" value={n.offsetMinutes} onChange={(e) => setN({ ...n, offsetMinutes: e.target.value })} />
          <select className={input} value={n.anchor} onChange={(e) => setN({ ...n, anchor: e.target.value })}><option value="session_start">session_start</option><option value="registration">registration</option><option value="purchase">purchase</option></select>
          <select className={input} value={n.audience} onChange={(e) => setN({ ...n, audience: e.target.value })}><option value="all">all</option><option value="free">free</option><option value="vip">vip</option><option value="attended">attended (free + VIP)</option><option value="free_attended">free_attended</option><option value="vip_attended">vip_attended</option><option value="no_show">no_show (free)</option><option value="vip_no_show">vip_no_show</option><option value="abandoned">abandoned</option></select>
        </div>
        <input className={`${input} mt-2`} placeholder="Subject (email only)" value={n.subject} onChange={(e) => setN({ ...n, subject: e.target.value })} />
        <textarea className={`${input} mt-2`} rows={3} placeholder="Body — tokens: {{firstName}} {{joinUrl}} {{sessionLabel}} {{ticketCode}}" value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} />
        <button className={`${btn} mt-3`} onClick={add}>Add reminder</button>
      </div>

      {logsFor && <ReminderLogsDrawer webinarId={id} reminder={logsFor} tz={tz} fmtOffset={fmtOffset} onClose={() => setLogsFor(null)} />}
    </div>
  );
}

/** Reminder schedule on a real clock: session-anchored reminders plotted at
 *  their concrete fire time (session start + offset), grouped by day. */
function ReminderCalendar({ rems, sessions, tz, onLogs, fmtOffset }: { rems: AnyRec[]; sessions: AnyRec[]; tz: string; onLogs: (r: AnyRec) => void; fmtOffset: (m: number) => string }) {
  const now = Date.now();
  const active = rems.filter((r) => r.active !== false);
  const sessionAnchored = active.filter((r) => r.anchor === "session_start");
  const relative = active.filter((r) => r.anchor !== "session_start");

  type Ev = { at: number; kind: "session" | "reminder"; rem?: AnyRec; session: AnyRec };
  const events: Ev[] = [];
  for (const s of sessions) {
    const start = new Date(s.startsAt).getTime();
    if (Number.isNaN(start)) continue;
    events.push({ at: start, kind: "session", session: s });
    for (const r of sessionAnchored) events.push({ at: start + Number(r.offsetMinutes) * 60000, kind: "reminder", rem: r, session: s });
  }
  events.sort((a, b) => a.at - b.at);

  const groups: { day: string; items: Ev[] }[] = [];
  for (const e of events) {
    const day = fmtTz(new Date(e.at), tz, { weekday: "long", month: "long", day: "numeric" });
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) { g = { day, items: [] }; groups.push(g); }
    g.items.push(e);
  }

  if (sessions.length === 0) {
    return <div className="rounded-xl border border-dashed border-black/15 bg-surface p-6 text-center text-sm text-ink-muted dark:border-white/15">Add a session (Sessions tab) to see the reminder calendar — session reminders fire relative to each session&apos;s start time.</div>;
  }

  return (
    <div className="space-y-5">
      {relative.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-surface p-3 dark:border-white/10">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-light">Fires per-registrant (no fixed clock time)</p>
          <div className="flex flex-wrap gap-1.5">
            {relative.map((r) => (
              <button key={r.id} onClick={() => onLogs(r)} className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-ink-body transition hover:border-brand hover:text-brand dark:border-white/10">
                {r.channel} · {fmtOffset(r.offsetMinutes)} after {String(r.anchor).replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.day}>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-light">{g.day}</p>
          <div className="space-y-1.5 border-l-2 border-black/10 pl-4 dark:border-white/10">
            {g.items.map((e, i) => {
              const time = fmtTz(new Date(e.at), tz, { hour: "numeric", minute: "2-digit" });
              const past = e.at <= now;
              if (e.kind === "session") {
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gradient-night px-3 py-2 text-white">
                    <span className="w-16 flex-none text-xs font-bold tabular-nums text-white/70">{time}</span>
                    <span className="text-sm font-extrabold">🎥 {e.session.label ?? "Webinar session"}</span>
                    {past && <span className="ml-auto text-[10px] font-bold uppercase text-white/50">ended</span>}
                  </div>
                );
              }
              const r = e.rem!;
              return (
                <button key={i} onClick={() => onLogs(r)} className="flex w-full items-center gap-3 rounded-lg border border-black/10 bg-surface px-3 py-2 text-left transition hover:border-brand/50 dark:border-white/10">
                  <span className="w-16 flex-none text-xs font-bold tabular-nums text-ink-muted">{time}</span>
                  <span className={`h-2 w-2 flex-none rounded-full ${past ? "bg-emerald-500" : "bg-ink-light"}`} />
                  <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${r.channel === "sms" ? "bg-violet-100 text-violet-700" : "bg-brand-tint text-brand"}`}>{r.channel}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-body">{r.subject || String(r.body).slice(0, 60)}</span>
                  <span className="flex-none text-xs font-semibold text-brand">{past ? "view log →" : "scheduled"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Slide-over showing the per-recipient delivery log (ReminderJobs) for a
 *  template — who it sent to, on which channel, when, and the outcome. */
function ReminderLogsDrawer({ webinarId, reminder, tz, fmtOffset, onClose }: { webinarId: string; reminder: AnyRec; tz: string; fmtOffset: (m: number) => string; onClose: () => void }) {
  const [data, setData] = useState<AnyRec | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/webinar-admin/webinars/${webinarId}/reminders/${reminder.id}/jobs`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Failed to load log");
        if (alive) setData(j);
      } catch (e) {
        if (alive) setErr(String(e));
      }
    })();
    return () => { alive = false; };
  }, [webinarId, reminder.id]);

  const counts: Record<string, number> = data?.counts ?? {};
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-canvas shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-black/10 p-4 dark:border-white/10">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">Delivery log</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">{reminder.channel} · {fmtOffset(reminder.offsetMinutes)} · {reminder.audience} · {reminder.subject || String(reminder.body).slice(0, 40)}</p>
          </div>
          <button onClick={onClose} className="flex-none rounded-lg p-1.5 text-ink-light transition hover:bg-black/5 hover:text-ink dark:hover:bg-white/10">✕</button>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-black/10 p-4 dark:border-white/10">
          {["sent", "pending", "skipped", "failed"].map((k) => (
            <span key={k} className={`rounded-full px-2.5 py-1 text-xs font-bold ${REM_STATUS_STYLE[k]}`}>{counts[k] ?? 0} {k}</span>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {err && <p className="p-4 text-sm text-red-500">{err}</p>}
          {!data && !err && <p className="p-4 text-sm text-ink-muted">Loading…</p>}
          {data && data.total === 0 && <p className="p-6 text-center text-sm text-ink-muted">Nothing sent yet. Recipients show up here once someone registers and this reminder fires.</p>}
          {data?.jobs?.map((j: AnyRec) => (
            <div key={j.id} className="flex items-center gap-3 border-b border-black/5 px-4 py-2.5 dark:border-white/5">
              <span className={`h-2 w-2 flex-none rounded-full ${j.status === "sent" ? "bg-emerald-500" : j.status === "failed" ? "bg-red-500" : j.status === "skipped" ? "bg-amber-500" : "bg-ink-light"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{j.name || j.email}</p>
                <p className="truncate text-xs text-ink-muted">{j.email}{j.error ? ` · ${j.error}` : ""}</p>
              </div>
              <div className="flex-none text-right">
                <p className="text-[10px] font-bold uppercase text-ink-muted">{j.status}</p>
                <p className="text-[10px] tabular-nums text-ink-light">{j.sentAt ? fmtTz(new Date(j.sentAt), tz, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : j.scheduledFor ? "→ " + fmtTz(new Date(j.scheduledFor), tz, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</p>
              </div>
            </div>
          ))}
          {data?.truncated && <p className="p-3 text-center text-xs text-ink-light">Showing the most recent {data.jobs.length} of {data.total}.</p>}
        </div>
      </div>
    </div>
  );
}

function GhlTab({ id, initial, flash }: { id: string; initial: AnyRec; flash: (m: string) => void }) {
  const [cfg, setCfg] = useState<AnyRec>(initial.ghlConfig ?? {});
  const [pipelineName, setPipelineName] = useState(cfg.pipelineName ?? "");
  const [busy, setBusy] = useState(false);

  async function provision() {
    setBusy(true);
    try {
      const res = await api(`/api/webinar-admin/webinars/${id}/provision`, "POST", { pipelineName: pipelineName || undefined });
      setCfg(res.config);
      flash(`Provisioned: ${res.created.length} created, ${res.reused.length} reused${res.pipelineResolved ? ", pipeline linked" : ", no pipeline"}`);
    } catch (e) {
      flash(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-lg border border-black/10 bg-surface p-4 text-sm">
        <p className="font-semibold">GHL sync config</p>
        <p className="mt-1 text-ink-muted">Tag prefix: <span className="text-brand">{cfg.tagPrefix ?? "—"}</span></p>
        <p className="text-ink-muted">Pipeline: <span className="text-brand">{cfg.pipelineName ?? "not linked"}</span></p>
        <p className="mt-2 text-ink-muted">Custom fields mapped: {Object.keys(cfg.customFieldMap ?? {}).length}/7</p>
        <p className="text-ink-muted">Stages mapped: {Object.keys(cfg.stageMap ?? {}).length}</p>
      </div>
      <Field label="Link a GHL pipeline by name (cannot create via API)">
        <input className={input} value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} placeholder="Mastermind Webinar" />
      </Field>
      <button className={btn} onClick={provision} disabled={busy}>{busy ? "Provisioning…" : "Provision / re-sync GHL"}</button>
      <p className="text-xs text-ink-light">Creates any missing custom fields in GHL and links + maps the pipeline stages. Safe to re-run (idempotent).</p>
    </div>
  );
}

const REG_STATUS_STYLE: Record<string, string> = {
  free_confirmed: "bg-emerald-100 text-emerald-700",
  vip_purchased: "bg-gold/20 text-amber-700",
  registered: "bg-brand-tint text-brand",
  attended: "bg-emerald-100 text-emerald-700",
  no_show: "bg-red-100 text-red-600",
};

function RegistrantsTab({ id, flash, initialSession = "" }: { id: string; flash: (m: string) => void; initialSession?: string }) {
  const [rows, setRows] = useState<AnyRec[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Pre-filtered to one session's date when arriving from a "See registrants" card button.
  const [sessionFilter, setSessionFilter] = useState(initialSession);

  async function load() {
    setLoading(true);
    try {
      const data = await api(`/api/webinar-admin/webinars/${id}/registrants`, "GET");
      setRows(data.registrants ?? []);
    } catch (e) {
      flash(String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  // Auto-load so tapping "Registrants" lands straight on the list — no extra tap.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function mark(rid: string, status: string) {
    setRows((rows ?? []).map((r) => (r.id === rid ? { ...r, status } : r)));
    try {
      await api(`/api/webinar-admin/registrants/${rid}/attendance`, "POST", { status });
    } catch (e) {
      flash(String(e));
      load();
    }
  }

  if (rows === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5 dark:bg-white/5 md:h-12" />
        ))}
      </div>
    );
  }

  const term = q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (sessionFilter === "" || r.session === sessionFilter) &&
      (!term || `${r.name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(term)),
  );
  const statuses = ["all", ...Array.from(new Set(rows.map((r) => r.status)))];
  const sessionOpts = Array.from(new Set(rows.map((r) => r.session).filter(Boolean)));

  return (
    <div>
      <div className="mb-3 space-y-2">
        <input
          className={input}
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <select className={`${input} appearance-none pr-9`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statuses.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All statuses" : String(s).replace("_", " ")}</option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
          </div>
          <div className="relative">
            <select className={`${input} appearance-none pr-9`} value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} aria-label="Filter by date">
              <option value="">All dates</option>
              {sessionOpts.map((s) => (
                <option key={String(s)} value={String(s)}>{String(s)}</option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-semibold text-ink-muted">
            <span className="tabular-nums">{filtered.length}</span> of <span className="tabular-nums">{rows.length}</span>
            {sessionFilter && <span className="ml-1 rounded-full bg-brand-tint px-2 py-0.5 font-bold text-brand">on {sessionFilter}</span>}
          </span>
          <a className={`${btnGhost} flex-none`} href={`/api/webinar-admin/webinars/${id}/registrants?format=csv`}>Export CSV</a>
        </div>
      </div>

      {/* Mobile: card list — no sideways scroll, full-width mark buttons. */}
      <div className="space-y-2 md:hidden">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-black/10 bg-surface p-3 dark:border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{r.name || "—"}</p>
                <p className="truncate text-sm text-ink-body">{r.email}</p>
              </div>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${REG_STATUS_STYLE[r.status] ?? "bg-black/5 text-ink-muted"}`}>
                {String(r.status).replace("_", " ")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
              {r.session && <span>{r.session}</span>}
              <span>{r.tier}</span>
              {r.variant && <span className="font-extrabold uppercase text-brand">{r.variant}</span>}
              <span>GHL {r.ghlContactId ? <span className="font-bold text-emerald-600">✓</span> : "—"}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${r.status === "attended" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"}`}
                onClick={() => mark(r.id, "attended")}
              >
                Attended
              </button>
              <button
                className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${r.status === "no_show" ? "border-red-500 bg-red-500/10 text-red-500" : "border-red-400/40 text-red-500 hover:bg-red-500/10"}`}
                onClick={() => mark(r.id, "no_show")}
              >
                No-show
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-ink-muted dark:border-white/15">No registrants match.</p>
        )}
      </div>

      {/* Desktop: full table */}
      <div className="hidden overflow-x-auto rounded-xl border border-black/10 md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Session</th><th className="p-3">Tier</th><th className="p-3">A/B</th><th className="p-3">Status</th><th className="p-3">GHL</th><th className="p-3">Mark</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-black/5 hover:bg-canvas/60">
                <td className="p-3 font-medium text-ink">{r.name || "—"}</td>
                <td className="p-3 text-ink-body">{r.email}</td>
                <td className="p-3 text-xs text-ink-muted">{r.session ?? "—"}</td>
                <td className="p-3 text-ink-body">{r.tier}</td>
                <td className="p-3 font-extrabold uppercase text-brand">{r.variant || "—"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${REG_STATUS_STYLE[r.status] ?? "bg-black/5 text-ink-muted"}`}>
                    {String(r.status).replace("_", " ")}
                  </span>
                </td>
                <td className="p-3">{r.ghlContactId ? <span className="text-emerald-600">✓</span> : <span className="text-ink-light">—</span>}</td>
                <td className="p-3 whitespace-nowrap">
                  <button className="text-xs font-semibold text-emerald-600 hover:underline" onClick={() => mark(r.id, "attended")}>attended</button>
                  <span className="text-ink-light"> · </span>
                  <button className="text-xs font-semibold text-red-500 hover:underline" onClick={() => mark(r.id, "no_show")}>no-show</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-ink-muted">No registrants match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-ink-light">{label}</span>
      {children}
    </label>
  );
}
