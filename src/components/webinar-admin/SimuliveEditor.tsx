"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBolt, IconExternal, IconSparkles } from "./Icons";

const input =
  "w-full rounded-lg border border-black/10 bg-surface dark:border-white/15 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const btn = "btn-primary px-4 py-2 text-sm";
const btnGhost = "rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-ink-body transition hover:border-brand hover:text-brand";

type Bot = { id: string; displayName: string; accent: string | null; aiEnabled: boolean; active: boolean; archetype: string };
type ScriptRow = {
  offsetSec: number;
  botId: string | null;
  displayName: string;
  accent: string | null;
  body: string;
  emphasis: boolean;
  source: "hardcoded" | "ai" | "template";
};

const SOURCE_STYLE: Record<string, string> = {
  ai: "bg-brand text-white",
  template: "bg-sky-100 text-sky-700",
  hardcoded: "bg-black/5 text-ink-muted",
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

/** Read a video file's duration (seconds) in the browser without uploading first. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(v.duration));
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    v.src = url;
  });
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SimuliveEditor({
  webinarId,
  slug,
  session,
  appBaseUrl,
  flash,
}: {
  webinarId: string;
  slug: string;
  session: { id: string; mode?: string; replayUrl?: string | null; videoDurationSec?: number | null; simChatEnabled?: boolean; viewerBase?: number | null; autoPlayBot?: boolean; botVideoUrl?: string | null; botStatus?: string | null; zoomChatBots?: boolean };
  appBaseUrl: string;
  flash: (m: string) => void;
}) {
  const [mode, setMode] = useState<string>(session.mode ?? "live_zoom");
  const [replayUrl, setReplayUrl] = useState<string | null>(session.replayUrl ?? null);
  const [durationSec, setDurationSec] = useState<number | null>(session.videoDurationSec ?? null);
  const [simChatEnabled, setSimChatEnabled] = useState<boolean>(session.simChatEnabled ?? true);
  const [viewerBase, setViewerBase] = useState<string>(session.viewerBase != null ? String(session.viewerBase) : "");
  const [autoPlayBot, setAutoPlayBot] = useState<boolean>(session.autoPlayBot ?? false);
  const [botVideoUrl, setBotVideoUrl] = useState<string>(session.botVideoUrl ?? "");
  const [zoomChatBots, setZoomChatBots] = useState<boolean>(session.zoomChatBots ?? false);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<ScriptRow[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loadingScript, setLoadingScript] = useState(false);
  const [density, setDensity] = useState(2);
  const [generating, setGenerating] = useState(false);

  const isSimulive = mode === "simulive";
  const roomUrl = `${appBaseUrl.replace(/\/$/, "")}/${slug}/live/${session.id}`;
  const aiBotCount = bots.filter((b) => b.aiEnabled && b.active).length;

  const loadScript = useCallback(() => {
    setLoadingScript(true);
    return api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}/chat-script`, "GET")
      .then((d) =>
        setRows(
          (d.messages ?? []).map((m: Partial<ScriptRow>) => ({
            offsetSec: m.offsetSec ?? 0,
            botId: m.botId ?? null,
            displayName: m.displayName ?? "",
            accent: m.accent ?? null,
            body: m.body ?? "",
            emphasis: !!m.emphasis,
            source: (m.source as ScriptRow["source"]) ?? "hardcoded",
          })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingScript(false));
  }, [webinarId, session.id]);

  const loadBots = useCallback(() => {
    return api(`/api/webinar-admin/webinars/${webinarId}/bots`, "GET")
      .then((d) => setBots(d.bots ?? []))
      .catch(() => {});
  }, [webinarId]);

  useEffect(() => {
    if (isSimulive) {
      loadScript();
      loadBots();
    }
  }, [isSimulive, loadScript, loadBots]);

  async function saveMode(next: string) {
    setMode(next);
    try {
      const res = await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", { mode: next });
      if (next === "simulive" && res.seededScript > 0) {
        await loadScript();
        flash(`Switched to Simulated Live · added ${res.seededScript} starter chat messages`);
      } else {
        flash(next === "simulive" ? "Switched to Simulated Live" : "Switched to Live Zoom");
      }
    } catch (e) {
      flash(String(e));
    }
  }

  async function onFile(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const duration = await readDuration(file);
      const { uploadUrl, key, publicUrl } = await api(
        `/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}/replay-upload`,
        "POST",
        { filename: file.name, contentType: file.type || "video/mp4" },
      );
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4" }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", {
        mode: "simulive",
        replayUrl: publicUrl,
        replayObjectKey: key,
        videoDurationSec: duration,
      });
      setReplayUrl(publicUrl);
      setDurationSec(duration);
      setMode("simulive");
      flash(`Video uploaded (${mmss(duration)})`);
    } catch (e) {
      flash(String(e));
    } finally {
      setUploading(false);
    }
  }

  async function addSimuliveReminders() {
    try {
      const res = await api(`/api/webinar-admin/webinars/${webinarId}/reminders/simulive`, "POST");
      flash(res.added > 0 ? `Added ${res.added} "we're live" reminder templates` : "Simulive reminders already present");
    } catch (e) {
      flash(String(e));
    }
  }

  async function toggleAutoPlayBot() {
    const next = !autoPlayBot;
    setAutoPlayBot(next);
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", { autoPlayBot: next });
      flash(next ? "Auto-play bot enabled — it joins Zoom at start time" : "Auto-play bot disabled");
    } catch (e) {
      setAutoPlayBot(!next);
      flash(String(e));
    }
  }
  async function toggleZoomChatBots() {
    const next = !zoomChatBots;
    setZoomChatBots(next);
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", { zoomChatBots: next });
      flash(next ? "Zoom chat personas enabled — they join with the video bot" : "Zoom chat personas disabled");
    } catch (e) {
      setZoomChatBots(!next);
      flash(String(e));
    }
  }
  async function saveBotVideoUrl() {
    const v = botVideoUrl.trim() || null;
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", { botVideoUrl: v });
      flash(v ? "Bot video saved" : "Bot video cleared (falls back to replay video)");
    } catch (e) {
      flash(String(e));
    }
  }

  async function toggleSimChat() {
    const next = !simChatEnabled;
    setSimChatEnabled(next);
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", { simChatEnabled: next });
      flash(next ? "Simulated chat enabled" : "Simulated chat hidden");
    } catch (e) {
      setSimChatEnabled(!next);
      flash(String(e));
    }
  }
  async function saveViewerBase() {
    const v = viewerBase.trim() === "" ? null : Math.max(0, Math.floor(Number(viewerBase)));
    try {
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}`, "PATCH", { viewerBase: v });
      flash(v == null ? "Viewer count reset to default curve" : `Viewer base set to ~${v}`);
    } catch (e) {
      flash(String(e));
    }
  }

  async function generate(engine: "auto" | "template") {
    if (bots.length === 0) return flash("Add or seed bots first (Bots tab)");
    setGenerating(true);
    try {
      const res = await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}/chat-script/generate`, "POST", {
        density,
        engine,
        save: true,
      });
      await loadScript();
      const eng = res.engine === "ai" ? "AI" : "template";
      flash(`Generated ${res.saved} messages via ${eng}${res.note ? ` (${res.note})` : ""}${res.keptHardcoded ? ` · kept ${res.keptHardcoded} hand-authored` : ""}`);
    } catch (e) {
      flash(String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function saveScript() {
    try {
      const clean = rows
        .filter((r) => r.body.trim() && r.displayName.trim())
        .map((r) => ({
          offsetSec: Math.max(0, Math.floor(r.offsetSec || 0)),
          botId: r.botId,
          displayName: r.displayName.trim(),
          accent: r.accent,
          body: r.body.trim(),
          emphasis: !!r.emphasis,
          source: r.source,
        }));
      await api(`/api/webinar-admin/webinars/${webinarId}/sessions/${session.id}/chat-script`, "PUT", { messages: clean });
      flash(`Saved ${clean.length} chat messages`);
    } catch (e) {
      flash(String(e));
    }
  }

  function setRow(i: number, patch: Partial<ScriptRow>) {
    setRows(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function pickBot(i: number, botId: string) {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) return setRow(i, { botId: null });
    setRow(i, { botId: bot.id, displayName: bot.displayName, accent: bot.accent, emphasis: bot.archetype === "host" });
  }

  const scriptCounts = rows.reduce(
    (acc, r) => ((acc[r.source] = (acc[r.source] ?? 0) + 1), acc),
    {} as Record<string, number>,
  );

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-canvas p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">Delivery:</span>
          <select className="rounded-lg border border-black/10 bg-surface dark:border-white/15 px-2 py-1 text-sm" value={mode} onChange={(e) => saveMode(e.target.value)}>
            <option value="live_zoom">Live (Zoom)</option>
            <option value="simulive">Simulated Live (recorded-as-live)</option>
          </select>
        </div>
        {isSimulive && (
          <a href={roomUrl} target="_blank" rel="noreferrer" className={`${btnGhost} inline-flex items-center gap-1`} title="Opens the room without crediting attendance">
            Preview as attendee <IconExternal className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {!isSimulive && (
        <div className="rounded-lg border border-black/10 bg-surface dark:border-white/15 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Auto-webinar bot (Recall.ai)</p>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-body">
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={autoPlayBot} onChange={toggleAutoPlayBot} />
            Auto-play a recording via bot at start time
          </label>
          <p className="mt-1 text-xs text-ink-light">
            A bot joins the Zoom meeting when the session starts and streams the video below as its camera feed — no human host needed.
          </p>
          {autoPlayBot && (
            <>
              <div className="mt-2 flex gap-2">
                <input
                  className={`${input} flex-1`}
                  placeholder="Video to play — https://…mp4 or stream:<videoId>"
                  value={botVideoUrl}
                  onChange={(e) => setBotVideoUrl(e.target.value)}
                />
                <button className={btnGhost} onClick={saveBotVideoUrl}>Save</button>
              </div>
              <p className="mt-1 text-xs text-ink-light">
                Leave empty to play this session&apos;s replay video.
                {session.botStatus ? ` · Bot status: ${session.botStatus}` : ""}
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-body">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={zoomChatBots} onChange={toggleZoomChatBots} />
                Send chat personas into Zoom
              </label>
              <p className="mt-1 text-xs text-ink-light">
                Up to 6 persona bots (from this session&apos;s chat script) join under real-looking names and post the
                scripted lines into Zoom&apos;s chat on the video timeline. Each persona bills as a separate bot-hour.
              </p>
            </>
          )}
        </div>
      )}

      {isSimulive && (
        <>
          {/* Replay video */}
          <div className="rounded-lg border border-black/10 bg-surface dark:border-white/15 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Replay video</p>
            {replayUrl ? (
              <p className="text-xs text-ink-body">
                ✓ Uploaded {durationSec ? `· ${mmss(durationSec)}` : ""} ·{" "}
                <a href={replayUrl} target="_blank" rel="noreferrer" className="text-brand underline">preview</a>
              </p>
            ) : (
              <p className="text-xs text-ink-light">No video yet — upload the recording to play it back as live.</p>
            )}
            <input
              type="file"
              accept="video/*"
              disabled={uploading}
              className="mt-2 block w-full text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            {uploading && <p className="mt-2 text-xs text-brand">Uploading… don&apos;t close this tab.</p>}
          </div>

          {/* Reminders */}
          <div className="flex flex-col gap-2 rounded-lg border border-black/10 bg-surface dark:border-white/15 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">&quot;We&apos;re live&quot; reminders</p>
              <p className="text-xs text-ink-light">Adds email/SMS reminders (10 min before → 5 min after) that link to the room.</p>
            </div>
            <button className={btnGhost} onClick={addSimuliveReminders}>Add reminders</button>
          </div>

          {/* Room overlay controls */}
          <div className="rounded-lg border border-black/10 bg-surface dark:border-white/15 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Room overlay</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-body">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={simChatEnabled} onChange={toggleSimChat} />
                Show simulated chat in the room
              </label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-muted">Viewer base</span>
                <input
                  className={`${input} w-24`}
                  type="number"
                  min={0}
                  placeholder="auto"
                  value={viewerBase}
                  onChange={(e) => setViewerBase(e.target.value)}
                  onBlur={saveViewerBase}
                />
                <span className="text-xs text-ink-light">“watching” count</span>
              </div>
            </div>
          </div>

          {/* AI / template generator */}
          <div className="rounded-lg border border-brand/30 bg-brand-tint/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconSparkles className="h-4 w-4 text-brand" />
                <p className="text-xs font-bold uppercase tracking-wide text-brand">Generate chat</p>
              </div>
              <span className="text-[11px] text-ink-muted">{aiBotCount} AI bot{aiBotCount === 1 ? "" : "s"} · {bots.length} total</span>
            </div>
            <p className="mt-1 text-xs text-ink-body">
              Auto-writes a believable conversation from your bot roster{aiBotCount >= 2 ? " (AI has bots reply to each other)" : " (template — enable 2+ AI bots for AI mode)"}. Replaces prior generated messages, keeps hand-authored ones.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-ink-body">
                Density
                <input type="range" min={1} max={10} value={density} onChange={(e) => setDensity(Number(e.target.value))} className="accent-brand" />
                <span className="w-16 tabular-nums">{density}/min</span>
              </label>
              <button className={btn} onClick={() => generate("auto")} disabled={generating}>
                <span className="inline-flex items-center gap-1.5"><IconBolt className="h-4 w-4" /> {generating ? "Generating…" : "Generate"}</span>
              </button>
              <button className={btnGhost} onClick={() => generate("template")} disabled={generating}>Template only</button>
            </div>
          </div>

          {/* Script editor */}
          <div className="rounded-lg border border-black/10 bg-surface dark:border-white/15 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Chat script ({rows.length})</p>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold uppercase">
                {(["ai", "template", "hardcoded"] as const).map((s) =>
                  scriptCounts[s] ? (
                    <span key={s} className={`rounded-full px-2 py-0.5 ${SOURCE_STYLE[s]}`}>{scriptCounts[s]} {s}</span>
                  ) : null,
                )}
              </div>
            </div>
            {loadingScript ? (
              <p className="text-xs text-ink-light">Loading…</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[64px_1fr] items-start gap-2 rounded-lg border border-black/5 bg-canvas p-2 sm:grid-cols-[64px_150px_1fr_auto]">
                    <input
                      className={input}
                      type="number"
                      min={0}
                      placeholder="sec"
                      value={r.offsetSec}
                      onChange={(e) => setRow(i, { offsetSec: Number(e.target.value) })}
                    />
                    <select
                      className={`${input} min-w-0`}
                      value={r.botId ?? ""}
                      onChange={(e) => (e.target.value ? pickBot(i, e.target.value) : setRow(i, { botId: null }))}
                    >
                      <option value="">{r.displayName || "— name —"}</option>
                      {bots.map((b) => (
                        <option key={b.id} value={b.id}>{b.displayName}</option>
                      ))}
                    </select>
                    <input className={input} placeholder="Message" value={r.body} onChange={(e) => setRow(i, { body: e.target.value })} />
                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                      <label className="flex items-center gap-1 text-xs text-ink-muted" title="Host/pinned styling">
                        <input type="checkbox" className="accent-brand" checked={r.emphasis} onChange={(e) => setRow(i, { emphasis: e.target.checked })} />
                        host
                      </label>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${SOURCE_STYLE[r.source]}`}>{r.source}</span>
                      <button className="ml-auto text-ink-light hover:text-red-500" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={btnGhost}
                    onClick={() => setRows([...rows, { offsetSec: rows.length ? rows[rows.length - 1].offsetSec + 15 : 0, botId: null, displayName: "", accent: null, body: "", emphasis: false, source: "hardcoded" }])}
                  >
                    + Add message
                  </button>
                  <button className={btn} onClick={saveScript}>Save chat script</button>
                </div>
                <p className="text-xs text-ink-light">
                  “sec” = seconds into the video the message appears. Pick a bot to voice each line, or type a one-off name. Manually
                  added lines are tagged <b>hardcoded</b> and survive re-generation.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
