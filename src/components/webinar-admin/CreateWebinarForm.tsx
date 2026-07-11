"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-lg border border-black/10 bg-surface dark:border-white/15 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export function CreateWebinarForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", slug: "", subtitle: "", hostName: "", ghlPipelineName: "" });
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [msg, setMsg] = useState("");

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");
    const res = await fetch("/api/webinar-admin/webinars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        slug: form.slug || autoSlug(form.title),
        subtitle: form.subtitle || undefined,
        hostName: form.hostName || undefined,
        ghlPipelineName: form.ghlPipelineName || undefined,
        provision: true,
      }),
    });
    const data = await res.json();
    setState("idle");
    if (!res.ok) {
      setMsg(data.error ?? "Failed");
      return;
    }
    const created = data.provisioning?.created?.length ?? 0;
    setMsg(`Created. GHL: ${created} custom fields provisioned${data.provisioning?.pipelineResolved ? ", pipeline linked" : ""}.`);
    router.push(`/admin/webinar/${data.webinar.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || autoSlug(e.target.value) })} required />
        <input className={input} placeholder="slug (kebab-case)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
        <input className={input} placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        <input className={input} placeholder="Host name" value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} />
      </div>
      <input className={input} placeholder="GHL pipeline name to link (optional, e.g. Mastermind Webinar)" value={form.ghlPipelineName} onChange={(e) => setForm({ ...form, ghlPipelineName: e.target.value })} />
      <p className="text-xs text-ink-light">On create, the engine auto-provisions this webinar&apos;s GHL custom fields and links the pipeline.</p>
      {msg && <p className="text-sm font-semibold text-brand">{msg}</p>}
      <button disabled={state === "loading"} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
        {state === "loading" ? "Creating…" : "Create webinar"}
      </button>
    </form>
  );
}
