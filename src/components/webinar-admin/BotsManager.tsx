"use client";

import { useEffect, useState } from "react";
import { Avatar, IconBolt, IconPlus, IconSparkles, IconUsers } from "./Icons";

const input =
  "w-full rounded-lg border border-black/10 bg-surface dark:border-white/15 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const btn = "btn-primary px-4 py-2 text-sm";
const btnGhost = "rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-ink-body transition hover:border-brand hover:text-brand";

type Bot = {
  id: string;
  displayName: string;
  role: string | null;
  archetype: string;
  accent: string | null;
  avatarUrl: string | null;
  persona: string | null;
  aiEnabled: boolean;
  active: boolean;
};

const ARCHETYPES = ["attendee", "host", "skeptic", "cheerleader", "newbie", "expert"] as const;
const ACCENTS = ["#2563eb", "#0891b2", "#db2777", "#ca8a04", "#7c3aed", "#16a34a", "#e11d48", "#0d9488", "#D4AF37"];

const ARCHETYPE_STYLE: Record<string, string> = {
  host: "bg-gold/15 text-amber-700",
  skeptic: "bg-orange-100 text-orange-700",
  cheerleader: "bg-pink-100 text-pink-700",
  newbie: "bg-sky-100 text-sky-700",
  expert: "bg-violet-100 text-violet-700",
  attendee: "bg-brand-tint text-brand",
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

const EMPTY = { displayName: "", role: "", archetype: "attendee", accent: ACCENTS[0], persona: "", aiEnabled: true, avatarUrl: "" };

export function BotsManager({ webinarId, flash }: { webinarId: string; flash: (m: string) => void }) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api(`/api/webinar-admin/webinars/${webinarId}/bots`, "GET")
      .then((d) => setBots(d.bots ?? []))
      .catch((e) => flash(String(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinarId]);

  const aiCount = bots.filter((b) => b.aiEnabled && b.active).length;

  async function seed() {
    setBusy(true);
    try {
      const res = await api(`/api/webinar-admin/webinars/${webinarId}/bots`, "POST", { seed: true });
      setBots(res.bots ?? bots);
      flash(res.created > 0 ? `Added ${res.created} starter bots` : "Starter roster already present");
    } catch (e) {
      flash(String(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(b: Bot) {
    setEditing(b.id);
    setForm({
      displayName: b.displayName,
      role: b.role ?? "",
      archetype: b.archetype,
      accent: b.accent ?? ACCENTS[0],
      persona: b.persona ?? "",
      aiEnabled: b.aiEnabled,
      avatarUrl: b.avatarUrl ?? "",
    });
  }
  function startNew() {
    setEditing("new");
    setForm(EMPTY);
  }

  async function save() {
    if (!form.displayName.trim()) return flash("Name required");
    setBusy(true);
    try {
      const payload = {
        displayName: form.displayName.trim(),
        role: form.role.trim() || null,
        archetype: form.archetype,
        accent: form.accent,
        persona: form.persona.trim() || null,
        aiEnabled: form.aiEnabled,
        avatarUrl: form.avatarUrl.trim() || null,
      };
      if (editing === "new") {
        await api(`/api/webinar-admin/webinars/${webinarId}/bots`, "POST", payload);
      } else if (editing) {
        await api(`/api/webinar-admin/webinars/${webinarId}/bots/${editing}`, "PATCH", payload);
      }
      setEditing(null);
      await load();
      flash("Bot saved");
    } catch (e) {
      flash(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAi(b: Bot) {
    setBots(bots.map((x) => (x.id === b.id ? { ...x, aiEnabled: !x.aiEnabled } : x)));
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/bots/${b.id}`, "PATCH", { aiEnabled: !b.aiEnabled });
    } catch (e) {
      flash(String(e));
      load();
    }
  }
  async function del(b: Bot) {
    setBots(bots.filter((x) => x.id !== b.id));
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/bots/${b.id}`, "DELETE");
    } catch (e) {
      flash(String(e));
      load();
    }
  }

  return (
    <div className="space-y-5">
      {/* Explainer + actions */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand">
            <IconUsers className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold text-ink">Chat bots</p>
            <p className="text-sm text-ink-muted">
              Reusable personas for the simulated-live room. <b className="text-brand">{aiCount}</b>{" "}
              AI-enabled — they&apos;ll converse with each other when you generate a script. Bots never touch real attendee numbers.
            </p>
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <button className={btnGhost} onClick={seed} disabled={busy}>
            <span className="inline-flex items-center gap-1.5"><IconSparkles className="h-4 w-4" /> Seed roster</span>
          </button>
          <button className={btn} onClick={startNew}>
            <span className="inline-flex items-center gap-1.5"><IconPlus className="h-4 w-4" /> Add bot</span>
          </button>
        </div>
      </div>

      {/* Editor form */}
      {editing && (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-extrabold text-ink">{editing === "new" ? "New bot" : "Edit bot"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">Display name</span>
              <input className={input} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Marcus T." />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">Role / context</span>
              <input className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Austin, TX" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">Archetype</span>
              <select className={input} value={form.archetype} onChange={(e) => setForm({ ...form, archetype: e.target.value })}>
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <div className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">Name color</span>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, accent: c })}
                    className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${form.accent === c ? "ring-ink" : "ring-transparent"}`}
                    style={{ background: c }}
                    aria-label={`accent ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">Avatar image URL (optional — falls back to initials)</span>
            <input className={input} value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…/photo.jpg" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">Personality (used by AI)</span>
            <textarea className={input} rows={2} value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} placeholder="Upbeat, hypes the host, drops fire emojis, encourages others." />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-body">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.aiEnabled} onChange={(e) => setForm({ ...form, aiEnabled: e.target.checked })} />
              <IconBolt className="h-4 w-4 text-brand" /> Include in AI conversations
            </label>
            <div className="flex gap-2">
              <button className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
              <button className={btn} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save bot"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Roster grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-black/5" />)}
        </div>
      ) : bots.length === 0 ? (
        <div className="card p-8 text-center text-ink-muted">
          No bots yet. Click <b className="text-brand">Seed roster</b> for a believable starter cast, or add your own.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((b) => (
            <div key={b.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                {b.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.avatarUrl} alt="" className="h-11 w-11 flex-none rounded-full object-cover" />
                ) : (
                  <Avatar name={b.displayName} size={44} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold" style={{ color: b.accent ?? undefined }}>{b.displayName}</p>
                  {b.role && <p className="truncate text-xs text-ink-muted">{b.role}</p>}
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ARCHETYPE_STYLE[b.archetype] ?? ARCHETYPE_STYLE.attendee}`}>
                    {b.archetype}
                  </span>
                </div>
              </div>
              {b.persona && <p className="line-clamp-2 text-xs text-ink-body">{b.persona}</p>}
              <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3">
                <button
                  onClick={() => toggleAi(b)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    b.aiEnabled ? "bg-brand text-white" : "bg-black/5 text-ink-muted hover:bg-black/10"
                  }`}
                  title="Toggle whether AI voices this bot"
                >
                  <IconBolt className="h-3.5 w-3.5" /> {b.aiEnabled ? "AI on" : "AI off"}
                </button>
                <div className="flex gap-2 text-xs font-semibold">
                  <button className="text-brand hover:underline" onClick={() => startEdit(b)}>Edit</button>
                  <button className="text-red-500 hover:underline" onClick={() => del(b)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
