"use client";

import { useState } from "react";
import { IconArrowRight, IconPlus } from "./Icons";

const input =
  "w-full rounded-lg border border-black/10 bg-surface dark:border-white/15 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const btn = "btn-primary px-4 py-2 text-sm";
const btnGhost = "rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-ink-body transition hover:border-brand hover:text-brand";

type Benefit = { title: string; desc?: string };
type AgendaItem = { title: string; desc?: string };
type Testimonial = { name: string; role?: string; quote: string };
type Faq = { q: string; a: string };
type Content = {
  heroHeadline?: string;
  heroSubhead?: string;
  vslUrl?: string;
  hostTitle?: string;
  hostBio?: string;
  hostCredentials?: string[];
  bonuses?: string[];
  benefits?: Benefit[];
  bullets?: string[];
  agenda?: AgendaItem[];
  testimonials?: Testimonial[];
  faq?: Faq[];
};

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${method} ${url} failed`);
  return data;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3">
        <h3 className="font-extrabold tracking-tight text-ink">{title}</h3>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-light">{label}</span>
      {children}
    </label>
  );
}

/** Add/remove/reorder list of arbitrary rows. */
function ListEditor<T>({
  items,
  onChange,
  render,
  blank,
  addLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  blank: T;
  addLabel: string;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-black/10 bg-canvas dark:border-white/10 p-3">
          {render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-ink-muted">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30 hover:text-brand">↑ up</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="disabled:opacity-30 hover:text-brand">↓ down</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="ml-auto text-red-500 hover:underline">Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className={btnGhost} onClick={() => onChange([...items, structuredClone(blank)])}>
        <span className="inline-flex items-center gap-1.5"><IconPlus className="h-4 w-4" /> {addLabel}</span>
      </button>
    </div>
  );
}

/** Simple string-array editor (credentials, bonuses). */
function StringList({ items, onChange, placeholder, addLabel }: { items: string[]; onChange: (n: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input className={input} value={v} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded-lg px-2 text-ink-light hover:text-red-500">✕</button>
        </div>
      ))}
      <button type="button" className={btnGhost} onClick={() => onChange([...items, ""])}>
        <span className="inline-flex items-center gap-1.5"><IconPlus className="h-4 w-4" /> {addLabel}</span>
      </button>
    </div>
  );
}

/**
 * OG-style share preview — a 1200×630 card showing how the site reads at a
 * glance, driven live by the hero fields being edited. Stays on the navy brand
 * in both themes on purpose: this mirrors the real share image, not the admin.
 */
function SharePreview({ url, headline, subhead }: { url: string; headline: string; subhead: string }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-2 dark:border-white/10">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-light">Live preview</span>
        <span className="max-w-[60%] truncate text-[11px] font-semibold text-ink-muted">{url}</span>
      </div>
      <div className="relative aspect-[1200/630] w-full overflow-hidden bg-gradient-night [container-type:inline-size]">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle, #7aa5ff 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
        <div className="relative flex h-full flex-col justify-between p-[5%]">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand px-2 py-1 text-[clamp(9px,1.4cqw,13px)] font-extrabold uppercase tracking-widest text-white">Maxxed Out</span>
            <span className="text-[clamp(8px,1.2cqw,12px)] font-bold uppercase tracking-[0.2em] text-white/50">Free live masterclass</span>
          </div>
          <div>
            <h3 className="line-clamp-3 text-[clamp(16px,3.6cqw,36px)] font-black leading-[1.05] tracking-tight text-white">{headline}</h3>
            {subhead && <p className="mt-[2%] line-clamp-2 text-[clamp(9px,1.7cqw,17px)] leading-snug text-white/70">{subhead}</p>}
          </div>
          <div className="flex items-center gap-2 text-[clamp(8px,1.2cqw,12px)] font-semibold text-white/50">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
            <span className="truncate">{url}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentEditor({
  id,
  initialContent,
  title,
  slug,
  appBaseUrl = "",
  flash,
}: {
  id: string;
  initialContent: Content;
  title?: string;
  slug?: string;
  appBaseUrl?: string;
  flash: (m: string) => void;
}) {
  const c = initialContent ?? {};
  const [f, setF] = useState<Content>({
    heroHeadline: c.heroHeadline ?? "",
    heroSubhead: c.heroSubhead ?? "",
    vslUrl: c.vslUrl ?? "",
    hostTitle: c.hostTitle ?? "",
    hostBio: c.hostBio ?? "",
    hostCredentials: c.hostCredentials ?? [],
    bonuses: c.bonuses ?? [],
    // benefits supersede the legacy bullets; migrate on load if needed.
    benefits: c.benefits ?? (c.bullets ?? []).map((b) => ({ title: b, desc: "" })),
    agenda: c.agenda ?? [],
    testimonials: c.testimonials ?? [],
    faq: c.faq ?? [],
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Content>) => setF((prev) => ({ ...prev, ...patch }));

  async function save() {
    setSaving(true);
    try {
      // Omit empty strings/arrays so the landing's fallback defaults still apply.
      const clean: Content = {};
      const str = (v?: string) => (v && v.trim() ? v.trim() : undefined);
      clean.heroHeadline = str(f.heroHeadline);
      clean.heroSubhead = str(f.heroSubhead);
      clean.vslUrl = str(f.vslUrl);
      clean.hostTitle = str(f.hostTitle);
      clean.hostBio = str(f.hostBio);
      const creds = (f.hostCredentials ?? []).map((s) => s.trim()).filter(Boolean);
      if (creds.length) clean.hostCredentials = creds;
      const bonuses = (f.bonuses ?? []).map((s) => s.trim()).filter(Boolean);
      if (bonuses.length) clean.bonuses = bonuses;
      const benefits = (f.benefits ?? []).filter((b) => b.title.trim()).map((b) => ({ title: b.title.trim(), desc: b.desc?.trim() || undefined }));
      if (benefits.length) clean.benefits = benefits;
      const agenda = (f.agenda ?? []).filter((a) => a.title.trim()).map((a) => ({ title: a.title.trim(), desc: a.desc?.trim() || undefined }));
      if (agenda.length) clean.agenda = agenda;
      const testimonials = (f.testimonials ?? []).filter((t) => t.quote.trim() && t.name.trim()).map((t) => ({ name: t.name.trim(), role: t.role?.trim() || undefined, quote: t.quote.trim() }));
      if (testimonials.length) clean.testimonials = testimonials;
      const faq = (f.faq ?? []).filter((q) => q.q.trim() && q.a.trim()).map((q) => ({ q: q.q.trim(), a: q.a.trim() }));
      if (faq.length) clean.faq = faq;

      await api(`/api/webinar-admin/webinars/${id}`, "PATCH", { content: clean });
      flash("Content saved");
    } catch (e) {
      flash(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Everything here renders on the public landing page. Cleared sections fall back to sensible defaults.</p>
        <a href="#" className="hidden text-xs text-brand sm:block" />
      </div>

      <SharePreview
        url={`${appBaseUrl}/${slug ?? ""}`.replace(/^https?:\/\//, "")}
        headline={f.heroHeadline?.trim() || title?.trim() || "Your webinar headline"}
        subhead={f.heroSubhead?.trim() || ""}
      />

      <Section title="Hero" hint="Top of the landing page.">
        <div className="space-y-3">
          <Field label="Headline"><input className={input} value={f.heroHeadline} onChange={(e) => set({ heroHeadline: e.target.value })} placeholder="(defaults to the webinar title)" /></Field>
          <Field label="Subhead"><textarea className={input} rows={2} value={f.heroSubhead} onChange={(e) => set({ heroSubhead: e.target.value })} /></Field>
          <Field label="VSL / video embed URL"><input className={input} value={f.vslUrl} onChange={(e) => set({ vslUrl: e.target.value })} placeholder="https://… (optional)" /></Field>
        </div>
      </Section>

      <Section title="What you'll learn" hint="Benefit cards. Title + optional one-line description.">
        <ListEditor<Benefit>
          items={f.benefits ?? []}
          onChange={(benefits) => set({ benefits })}
          blank={{ title: "", desc: "" }}
          addLabel="Add benefit"
          render={(it, s) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={input} placeholder="Benefit title" value={it.title} onChange={(e) => s({ title: e.target.value })} />
              <input className={input} placeholder="Short description (optional)" value={it.desc ?? ""} onChange={(e) => s({ desc: e.target.value })} />
            </div>
          )}
        />
      </Section>

      <Section title="Host" hint="Authority section.">
        <div className="space-y-3">
          <Field label="Host title / tagline"><input className={input} value={f.hostTitle} onChange={(e) => set({ hostTitle: e.target.value })} placeholder="e.g. Founder, Maxxed Out" /></Field>
          <Field label="Bio"><textarea className={input} rows={3} value={f.hostBio} onChange={(e) => set({ hostBio: e.target.value })} /></Field>
          <Field label="Credential chips"><StringList items={f.hostCredentials ?? []} onChange={(hostCredentials) => set({ hostCredentials })} placeholder="e.g. Proven operator" addLabel="Add credential" /></Field>
        </div>
      </Section>

      <Section title="Agenda" hint="Numbered timeline of what you'll cover live.">
        <ListEditor<AgendaItem>
          items={f.agenda ?? []}
          onChange={(agenda) => set({ agenda })}
          blank={{ title: "", desc: "" }}
          addLabel="Add agenda item"
          render={(it, s) => (
            <div className="space-y-2">
              <input className={input} placeholder="Step title" value={it.title} onChange={(e) => s({ title: e.target.value })} />
              <input className={input} placeholder="Description (optional)" value={it.desc ?? ""} onChange={(e) => s({ desc: e.target.value })} />
            </div>
          )}
        />
      </Section>

      <Section title="Testimonials" hint="Social proof cards with avatars.">
        <ListEditor<Testimonial>
          items={f.testimonials ?? []}
          onChange={(testimonials) => set({ testimonials })}
          blank={{ name: "", role: "", quote: "" }}
          addLabel="Add testimonial"
          render={(it, s) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={input} placeholder="Name" value={it.name} onChange={(e) => s({ name: e.target.value })} />
                <input className={input} placeholder="Role / location (optional)" value={it.role ?? ""} onChange={(e) => s({ role: e.target.value })} />
              </div>
              <textarea className={input} rows={2} placeholder="Quote" value={it.quote} onChange={(e) => s({ quote: e.target.value })} />
            </div>
          )}
        />
      </Section>

      <Section title="FAQ" hint="Accordion at the bottom of the page.">
        <ListEditor<Faq>
          items={f.faq ?? []}
          onChange={(faq) => set({ faq })}
          blank={{ q: "", a: "" }}
          addLabel="Add question"
          render={(it, s) => (
            <div className="space-y-2">
              <input className={input} placeholder="Question" value={it.q} onChange={(e) => s({ q: e.target.value })} />
              <textarea className={input} rows={2} placeholder="Answer" value={it.a} onChange={(e) => s({ a: e.target.value })} />
            </div>
          )}
        />
      </Section>

      <Section title="Bonuses" hint="Shown in the urgency band near the final CTA.">
        <StringList items={f.bonuses ?? []} onChange={(bonuses) => set({ bonuses })} placeholder="e.g. Live Q&A with your host" addLabel="Add bonus" />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button className={`${btn} shadow-cta`} onClick={save} disabled={saving}>
          <span className="inline-flex items-center gap-1.5">{saving ? "Saving…" : "Save all content"} <IconArrowRight className="h-4 w-4" /></span>
        </button>
      </div>
    </div>
  );
}
