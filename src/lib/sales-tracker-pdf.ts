/**
 * PDF report renderer for the Sales Tracker. Builds a self-contained
 * HTML document with all session stats + the full entry list, then
 * uses puppeteer to print it. Mirrors the esign PDF pattern in
 * src/lib/esign-pdf.ts (same chromium-min runtime, same retry logic).
 *
 * Charts are inline SVG so we don't need React/DOM at PDF time —
 * keeps the rendering deterministic and snapshot-stable.
 */
import type { SalesTrackerEntry, SalesTrackerSession } from '@prisma/client';

// --- Chromium launch (duplicated from esign-pdf.ts to keep blast
// radius small — both files are short and changes are rare).
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar';

async function launchBrowser() {
  const puppeteer = await import('puppeteer-core');
  const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;
  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium-min')).default;
    const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 1600, deviceScaleFactor: 2 },
      executablePath,
      headless: true,
    });
  }
  const exe = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!exe) {
    throw new Error(
      'PUPPETEER_EXECUTABLE_PATH not set. Point at a Chrome/Chromium binary for local PDF rendering.'
    );
  }
  return puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

// --- Stat helpers (mirror src/components/admin/sales-tracker/types.ts)
function effectiveCommission(e: SalesTrackerEntry): number {
  if (e.commissionAmountCents != null) return e.commissionAmountCents;
  if (e.dealAmountCents == null || e.commissionRate == null) return 0;
  return Math.round(e.dealAmountCents * Number(e.commissionRate));
}

function formatUSD(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Curated palette mirroring `tagStyles` in the editor. Used for the
// section bars in the PDF entries table.
const COLOR_HEX: Record<string, { bar: string; text: string }> = {
  rose: { bar: '#be123c', text: '#fff' },
  orange: { bar: '#c2410c', text: '#fff' },
  amber: { bar: '#92400e', text: '#fff' },
  yellow: { bar: '#854d0e', text: '#fff' },
  lime: { bar: '#4d7c0f', text: '#fff' },
  emerald: { bar: '#047857', text: '#fff' },
  teal: { bar: '#0f766e', text: '#fff' },
  cyan: { bar: '#0e7490', text: '#fff' },
  sky: { bar: '#0369a1', text: '#fff' },
  blue: { bar: '#1d4ed8', text: '#fff' },
  indigo: { bar: '#4338ca', text: '#fff' },
  violet: { bar: '#6d28d9', text: '#fff' },
  pink: { bar: '#be185d', text: '#fff' },
};
const AUTO_PALETTE = [
  'rose', 'orange', 'amber', 'emerald', 'teal',
  'sky', 'blue', 'indigo', 'violet', 'pink',
];
function tagColor(tag: string | null, explicit?: string): { bar: string; text: string } {
  if (!tag) return { bar: '#e5e7eb', text: '#374151' };
  if (explicit && COLOR_HEX[explicit]) return COLOR_HEX[explicit];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return COLOR_HEX[AUTO_PALETTE[h % AUTO_PALETTE.length]];
}

// --- Stat aggregation
interface ReportStats {
  totalContacts: number;
  shows: number;
  closes: number;
  totalDealCents: number;
  totalCommissionCents: number;
  paidCents: number;
  unpaidCents: number;
  topDeals: Array<{ name: string; deal: number; commission: number }>;
  byDay: Array<{ day: string; commission: number; deal: number }>;
  bySection: Array<{
    tag: string | null;
    color: { bar: string; text: string };
    entries: SalesTrackerEntry[];
    closed: number;
    commission: number;
    paid: number;
    owed: number;
  }>;
}

function deriveStats(
  entries: SalesTrackerEntry[],
  tagColors: Record<string, string>
): ReportStats {
  const totalContacts = entries.length;
  const shows = entries.filter((e) => e.didShow === 'YES').length;
  const closes = entries.filter((e) => e.didClose === 'YES').length;
  const closed = entries.filter((e) => e.didClose === 'YES');
  const totalDealCents = closed.reduce((a, e) => a + (e.dealAmountCents ?? 0), 0);
  let totalCommissionCents = 0;
  let paidCents = 0;
  for (const e of closed) {
    const eff = effectiveCommission(e);
    totalCommissionCents += eff;
    if (e.commissionPaid) paidCents += eff;
  }

  // Top 5 deals by deal amount
  const topDeals = closed
    .filter((e) => (e.dealAmountCents ?? 0) > 0)
    .sort((a, b) => (b.dealAmountCents ?? 0) - (a.dealAmountCents ?? 0))
    .slice(0, 5)
    .map((e) => ({
      name: e.name ?? '(no name)',
      deal: e.dealAmountCents ?? 0,
      commission: effectiveCommission(e),
    }));

  // By day for the chart
  const dayMap = new Map<string, { commission: number; deal: number }>();
  for (const e of closed) {
    if (!e.contactDate) continue;
    const day = new Date(e.contactDate).toISOString().slice(0, 10);
    const cur = dayMap.get(day) ?? { commission: 0, deal: 0 };
    cur.commission += effectiveCommission(e);
    cur.deal += e.dealAmountCents ?? 0;
    dayMap.set(day, cur);
  }
  const byDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, v]) => ({ day, commission: v.commission, deal: v.deal }));

  // Group entries by section, preserving editor order.
  const sectionMap = new Map<string | null, SalesTrackerEntry[]>();
  for (const e of entries) {
    const k = e.tag && e.tag.trim() ? e.tag : null;
    const arr = sectionMap.get(k) ?? [];
    arr.push(e);
    sectionMap.set(k, arr);
  }
  const bySection = Array.from(sectionMap.entries())
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return 0;
    })
    .map(([tag, ents]) => {
      let secCommission = 0;
      let secPaid = 0;
      let closedCount = 0;
      for (const e of ents) {
        if (e.didClose !== 'YES') continue;
        closedCount++;
        const eff = effectiveCommission(e);
        secCommission += eff;
        if (e.commissionPaid) secPaid += eff;
      }
      return {
        tag,
        color: tagColor(tag, tag ? tagColors[tag] : undefined),
        entries: ents,
        closed: closedCount,
        commission: secCommission,
        paid: secPaid,
        owed: secCommission - secPaid,
      };
    });

  return {
    totalContacts,
    shows,
    closes,
    totalDealCents,
    totalCommissionCents,
    paidCents,
    unpaidCents: totalCommissionCents - paidCents,
    topDeals,
    byDay,
    bySection,
  };
}

// --- SVG line chart for "Closed Commission Over Time".
// Hand-rolled so we don't need React/DOM at PDF time. Two lines:
// deal value (blue) and commission (green).
function buildAreaChartSvg(byDay: ReportStats['byDay']): string {
  if (byDay.length === 0) return '';

  const W = 800;
  const H = 220;
  const PAD_L = 56;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36;

  const max = Math.max(
    1,
    ...byDay.map((d) => Math.max(d.deal, d.commission))
  );
  // Round up to a "nice" tick. Aim for ~5 horizontal gridlines.
  const niceMax = niceRound(max);
  const yTicks = 5;

  const xFor = (i: number) =>
    PAD_L +
    (byDay.length === 1
      ? 0
      : (i / (byDay.length - 1)) * (W - PAD_L - PAD_R));
  const yFor = (v: number) =>
    PAD_T + (1 - v / niceMax) * (H - PAD_T - PAD_B);

  const dealPath = byDay
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(d.deal).toFixed(1)}`)
    .join(' ');
  const commPath = byDay
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(d.commission).toFixed(1)}`)
    .join(' ');

  // Filled area under each line.
  const dealArea =
    `${dealPath} L${xFor(byDay.length - 1).toFixed(1)},${yFor(0)} L${xFor(0).toFixed(1)},${yFor(0)} Z`;
  const commArea =
    `${commPath} L${xFor(byDay.length - 1).toFixed(1)},${yFor(0)} L${xFor(0).toFixed(1)},${yFor(0)} Z`;

  // Gridlines + Y labels
  const grid: string[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const v = (niceMax * i) / yTicks;
    const y = yFor(v).toFixed(1);
    grid.push(
      `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="3 3" />`
    );
    grid.push(
      `<text x="${PAD_L - 6}" y="${(parseFloat(y) + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#6b7280">$${shortCurrency(v / 100)}</text>`
    );
  }

  // X labels — first, mid, last to avoid clutter
  const xLabels: string[] = [];
  const labelIdx = byDay.length <= 5
    ? byDay.map((_, i) => i)
    : [0, Math.floor(byDay.length / 2), byDay.length - 1];
  for (const i of labelIdx) {
    const d = new Date(byDay[i].day);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    xLabels.push(
      `<text x="${xFor(i).toFixed(1)}" y="${H - PAD_B + 16}" text-anchor="middle" font-size="10" fill="#6b7280">${escapeHtml(label)}</text>`
    );
  }

  return `
  <svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <linearGradient id="dealFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="commFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#059669" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#059669" stop-opacity="0" />
      </linearGradient>
    </defs>
    ${grid.join('')}
    <path d="${dealArea}" fill="url(#dealFill)" />
    <path d="${commArea}" fill="url(#commFill)" />
    <path d="${dealPath}" fill="none" stroke="#1d4ed8" stroke-width="2" />
    <path d="${commPath}" fill="none" stroke="#059669" stroke-width="2" />
    ${xLabels.join('')}
  </svg>`;
}

function niceRound(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (n <= m * base) return m * base;
  }
  return 10 * base;
}

function shortCurrency(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toFixed(0);
}

// --- HTML builder
function buildHtml(
  session: SalesTrackerSession & { tagColors: unknown },
  entries: SalesTrackerEntry[]
): string {
  const tagColors =
    typeof session.tagColors === 'object' &&
    session.tagColors !== null &&
    !Array.isArray(session.tagColors)
      ? (session.tagColors as Record<string, string>)
      : {};
  const stats = deriveStats(entries, tagColors);

  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const closingRate =
    stats.totalContacts === 0
      ? 0
      : Math.round((stats.closes / stats.totalContacts) * 100);
  const showRate =
    stats.totalContacts === 0
      ? 0
      : Math.round((stats.shows / stats.totalContacts) * 100);
  const paidPct =
    stats.totalCommissionCents === 0
      ? 0
      : Math.round((stats.paidCents / stats.totalCommissionCents) * 100);

  const chartSvg = buildAreaChartSvg(stats.byDay);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(session.name)} — Sales Report</title>
<style>
  @page { size: Letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    color: #111827;
    font-size: 11px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { margin: 0; }
  h1 { font-size: 22px; font-weight: 800; }
  h2 { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 8px; }
  .header {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px;
  }
  .header .meta { text-align: right; font-size: 10px; color: #6b7280; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi {
    border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px;
    background: #fff;
  }
  .kpi .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 700; }
  .kpi .value { font-size: 18px; font-weight: 800; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .kpi .sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .card {
    border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff;
  }
  .card h2 { margin-bottom: 8px; }

  /* Commission bar */
  .progress { height: 10px; border-radius: 999px; background: #fef3c7; overflow: hidden; display: flex; }
  .progress .paid { background: #10b981; }
  .legend { display: flex; justify-content: space-between; margin-top: 6px; font-size: 9px; color: #4b5563; }
  .legend .dot { display: inline-block; width: 6px; height: 6px; border-radius: 1px; vertical-align: middle; margin-right: 4px; }

  /* Funnel */
  .funnel { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: stretch; gap: 6px; }
  .funnel .stage { padding: 8px; border-radius: 6px; font-size: 9px; }
  .funnel .stage .label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.8; }
  .funnel .stage .num { font-size: 18px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .funnel .stage .rate { margin-top: 2px; opacity: 0.7; font-size: 9px; }
  .funnel .stage.contacts { background: #eff6ff; color: #1e3a8a; }
  .funnel .stage.showed { background: #f0f9ff; color: #075985; }
  .funnel .stage.closed { background: #ecfdf5; color: #064e3b; }
  .funnel .arrow { display: flex; align-items: center; color: #9ca3af; font-size: 14px; }

  /* Top deals */
  .top-deals { list-style: none; padding: 0; margin: 0; }
  .top-deals li { display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px solid #f3f4f6; font-size: 10px; }
  .top-deals li:first-child { border-top: 0; }
  .top-deals .name { font-weight: 600; }
  .top-deals .amount { font-variant-numeric: tabular-nums; font-weight: 700; }
  .top-deals .comm { color: #6b7280; font-size: 9px; }

  /* Entries table */
  .section-bar {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 6px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.05em; margin-top: 12px;
  }
  table.entries { width: 100%; border-collapse: collapse; font-size: 9px; }
  table.entries th, table.entries td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  table.entries thead th { font-size: 8px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  table.entries .right { text-align: right; font-variant-numeric: tabular-nums; }
  table.entries .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; }
  table.entries .yes { background: #d1fae5; color: #065f46; }
  table.entries .no { background: #fee2e2; color: #991b1b; }
  table.entries .pending { background: #f3f4f6; color: #4b5563; }
  table.entries .paid { background: #d1fae5; color: #065f46; }
  table.entries .owed { background: #fef3c7; color: #92400e; }
  .notes-cell { max-width: 200px; color: #4b5563; font-size: 8px; }
  .empty-dash { color: #d1d5db; }

  .chart-wrap { margin-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(session.name)}</h1>
      <div style="color:#6b7280; font-size:10px; margin-top:4px;">Sales Tracker Report</div>
    </div>
    <div class="meta">
      <div>Generated ${escapeHtml(generatedAt)}</div>
      <div>${stats.totalContacts} entries · ${stats.closes} closed</div>
    </div>
  </div>

  <div class="grid-4">
    ${kpi('Total Deal Value', formatUSD(stats.totalDealCents), 'Closed deal volume')}
    ${kpi('My Commission', formatUSD(stats.totalCommissionCents), `From ${stats.closes} closed deals`)}
    ${kpi('Closing Rate', `${closingRate}%`, `${stats.closes} of ${stats.totalContacts} contacts`)}
    ${kpi('Show Rate', `${showRate}%`, `${stats.shows} of ${stats.totalContacts} contacts`)}
  </div>

  <div class="row-2">
    <div class="card">
      <h2>My Commission</h2>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <div>
          <div style="font-size:9px; color:#065f46; font-weight:700; text-transform:uppercase;">Paid to me</div>
          <div style="font-size:14px; font-weight:800; font-variant-numeric:tabular-nums;">${formatUSD(stats.paidCents)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px; color:#92400e; font-weight:700; text-transform:uppercase;">Still owed to me</div>
          <div style="font-size:14px; font-weight:800; font-variant-numeric:tabular-nums;">${formatUSD(stats.unpaidCents)}</div>
        </div>
      </div>
      <div class="progress">
        ${paidPct > 0 ? `<div class="paid" style="width:${paidPct}%"></div>` : ''}
      </div>
      <div class="legend">
        <span><span class="dot" style="background:#10b981"></span>Paid ${paidPct}%</span>
        <span><span class="dot" style="background:#f59e0b"></span>Owed ${100 - paidPct}%</span>
      </div>
    </div>

    <div class="card">
      <h2>Show / Close Funnel</h2>
      <div class="funnel">
        <div class="stage contacts">
          <div class="label">Contacts</div>
          <div class="num">${stats.totalContacts}</div>
        </div>
        <div class="arrow">→</div>
        <div class="stage showed">
          <div class="label">Showed</div>
          <div class="num">${stats.shows}</div>
          <div class="rate">${showRate}% show rate</div>
        </div>
        <div class="arrow">→</div>
        <div class="stage closed">
          <div class="label">Closed</div>
          <div class="num">${stats.closes}</div>
          <div class="rate">${stats.shows === 0 ? 0 : Math.round((stats.closes / stats.shows) * 100)}% close rate</div>
        </div>
      </div>
    </div>
  </div>

  ${
    chartSvg
      ? `<div class="card" style="margin-bottom:16px;">
          <h2>Closed Commission Over Time</h2>
          <div class="chart-wrap">${chartSvg}</div>
          <div style="display:flex; gap:16px; font-size:9px; color:#4b5563; margin-top:6px;">
            <span><span class="dot" style="background:#1d4ed8; display:inline-block; width:8px; height:2px; vertical-align:middle; margin-right:4px;"></span>Deal Value</span>
            <span><span class="dot" style="background:#059669; display:inline-block; width:8px; height:2px; vertical-align:middle; margin-right:4px;"></span>Commission</span>
          </div>
        </div>`
      : ''
  }

  ${
    stats.topDeals.length > 0
      ? `<div class="card" style="margin-bottom:16px;">
          <h2>Top ${stats.topDeals.length} Closed Deals</h2>
          <ol class="top-deals">
            ${stats.topDeals
              .map(
                (d, i) => `
              <li>
                <span><span style="display:inline-block; width:14px; color:#9ca3af;">${i + 1}.</span> <span class="name">${escapeHtml(d.name)}</span></span>
                <span><span class="amount">${formatUSD(d.deal)}</span> <span class="comm">· comm ${formatUSD(d.commission)}</span></span>
              </li>`
              )
              .join('')}
          </ol>
        </div>`
      : ''
  }

  <div style="page-break-before: always;"></div>
  <h2 style="margin-bottom:8px;">All entries</h2>
  ${stats.bySection
    .map((sec) => sectionTable(sec))
    .join('')}
</body>
</html>`;
}

function kpi(label: string, value: string, sub: string): string {
  return `<div class="kpi">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value">${escapeHtml(value)}</div>
    <div class="sub">${escapeHtml(sub)}</div>
  </div>`;
}

function sectionTable(sec: ReportStats['bySection'][number]): string {
  const label = sec.tag ?? 'Uncategorized';
  return `
  <div class="section-bar" style="background:${sec.color.bar}; color:${sec.color.text};">
    <span>${escapeHtml(label)}</span>
    <span style="opacity:0.85; text-transform:none; letter-spacing:0; font-size:9px;">
      ${sec.entries.length} ${sec.entries.length === 1 ? 'entry' : 'entries'}
      ${sec.commission > 0 ? ` · ${formatUSD(sec.commission)} commission · ${formatUSD(sec.owed)} owed` : ''}
    </span>
  </div>
  <table class="entries">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Date</th>
        <th>Time</th>
        <th>Showed</th>
        <th>Closed</th>
        <th class="right">Deal</th>
        <th class="right">Comm</th>
        <th>Pay date</th>
        <th>Paid?</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${sec.entries.map((e) => entryRow(e)).join('')}
    </tbody>
  </table>`;
}

function entryRow(e: SalesTrackerEntry): string {
  const eff = effectiveCommission(e);
  const dash = '<span class="empty-dash">—</span>';
  const tri = (v: string | null) => {
    if (v === 'YES') return '<span class="badge yes">YES</span>';
    if (v === 'NO') return '<span class="badge no">NO</span>';
    return '<span class="badge pending">—</span>';
  };
  return `<tr>
    <td>${escapeHtml(e.name) || dash}</td>
    <td>${escapeHtml(e.email) || dash}</td>
    <td>${escapeHtml(e.phone) || dash}</td>
    <td>${e.contactDate ? formatDate(e.contactDate) : dash}</td>
    <td>${escapeHtml(e.contactTime) || dash}</td>
    <td>${tri(e.didShow)}</td>
    <td>${tri(e.didClose)}</td>
    <td class="right">${e.dealAmountCents != null ? formatUSD(e.dealAmountCents) : dash}</td>
    <td class="right">${eff > 0 ? formatUSD(eff) : dash}</td>
    <td>${e.commissionDue ? formatDate(e.commissionDue) : dash}</td>
    <td>${e.commissionPaid ? '<span class="badge paid">PAID</span>' : '<span class="badge owed">OWED</span>'}</td>
    <td class="notes-cell">${escapeHtml(e.notes) || ''}</td>
  </tr>`;
}

export async function renderSalesTrackerPdf(
  session: SalesTrackerSession & { tagColors: unknown },
  entries: SalesTrackerEntry[]
): Promise<Buffer> {
  const html = buildHtml(session, entries);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
