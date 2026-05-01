// Shared CSS for the contract render. Used by both the web signing page
// (injected via <style> in ContractDisplay) and the PDF generator
// (inlined in buildPdfHtml). Keep the two consumers in lockstep — any
// rule edits affect both surfaces.
//
// Design intent: modern SaaS-style agreement (think Stripe/Linear/Notion
// terms-of-service docs). Not "1990s lawyer's printout." Single
// font-family (Montserrat — same as the rest of the platform), clean
// hierarchy via weight + size, no all-caps shouting, restrained
// callouts. Brand-blue is reserved for one place: the signature
// dividers below the company countersignature.

export const CONTRACT_FONT_LINKS = [
  // Montserrat: matches the rest of the platform. Body at 400, heavy
  // headings at 700, signatures at 600 italic.
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
  // Caveat for the actual handwriting-style countersignature only.
  'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap',
];

// Relative path so server-rendered HTML hydrates identically on the
// client. The browser resolves it against the page origin; for the PDF
// generator (where there's no page origin), `buildPdfHtml` upgrades it
// to an absolute URL using NEXTAUTH_URL.
export const CONTRACT_LOGO_URL = '/downloads/logo.png';

const COLORS = {
  ink: '#0f172a',           // slate-900 — headings + emphasis
  body: '#334155',          // slate-700 — body text (warmer than gray)
  muted: '#64748b',          // slate-500 — labels, supporting copy
  rule: '#e2e8f0',           // slate-200 — section dividers
  brandBlue: '#0000FF',      // maxxed brand blue — only on signature lines
  warningInk: '#7f1d1d',     // red-900 — warning text emphasis
  warningRule: '#fca5a5',    // red-300 — left rule on important callouts
  warningTint: '#fef2f2',    // red-50 — barely-there callout background
} as const;

// Both web (signing page) and print (PDF) render through the same class
// hierarchy so visual changes ship in lockstep.
export const CONTRACT_STYLES = `
  .contract-wrap {
    font-family: 'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: ${COLORS.body};
    font-size: 15.5px;
    font-weight: 400;
    line-height: 1.75;
    max-width: 720px;
    margin: 0 auto;
    letter-spacing: -0.005em;
  }
  .contract-letterhead {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 0 32px;
    margin: 0 0 40px;
    border-bottom: 1px solid ${COLORS.rule};
  }
  .contract-letterhead img {
    width: 180px;
    height: auto;
    max-width: 60%;
    margin: 0 0 16px;
    display: block;
  }
  .contract-letterhead .lh-meta {
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${COLORS.muted};
    margin: 0;
  }

  .contract-display {
    /* Slightly narrower readable measure than the wrap so the page
       breathes a bit — keeps eye-tracking comfortable on long blocks. */
  }
  .contract-display h1 {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(22px, 3.4vw, 28px);
    font-weight: 800;
    color: ${COLORS.ink};
    letter-spacing: -0.015em;
    text-align: center;
    margin: 0 0 36px;
    padding: 0 0 8px;
    line-height: 1.2;
  }
  .contract-display h2 {
    font-family: 'Montserrat', sans-serif;
    font-size: 19px;
    font-weight: 700;
    color: ${COLORS.ink};
    letter-spacing: -0.01em;
    margin: 40px 0 12px;
    line-height: 1.3;
  }
  .contract-display h3 {
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: ${COLORS.ink};
    letter-spacing: 0;
    margin: 24px 0 8px;
    line-height: 1.4;
  }
  .contract-display p {
    margin: 0 0 14px;
  }
  .contract-display strong {
    /* Match strong to body color so emphasis comes from weight only.
       Coloring strong darker than body created a wall-of-bold effect
       in the intro paragraphs where every defined term is a <strong>. */
    color: inherit;
    font-weight: 600;
  }
  .contract-display ul,
  .contract-display ol {
    margin: 0 0 16px;
    padding-left: 22px;
  }
  .contract-display ul { list-style-type: disc; }
  .contract-display ol { list-style-type: decimal; }
  .contract-display li {
    margin-bottom: 6px;
    padding-left: 4px;
  }
  .contract-display li::marker {
    color: ${COLORS.muted};
  }
  .contract-display ul ul,
  .contract-display ol ol,
  .contract-display ul ol,
  .contract-display ol ul {
    margin: 6px 0 8px;
  }
  .contract-display hr {
    border: 0;
    border-top: 1px solid ${COLORS.rule};
    margin: 32px 0;
  }
  .contract-display a {
    color: ${COLORS.brandBlue};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Callouts intentionally render the same as any other list item or
     paragraph. The previous treatment (red tint + red border + red
     ink on strong) made the no-refunds / no-chargebacks lines pop
     out visually — owner asked for them to read as ordinary contract
     terms. The data-callout="warning" attribute is still applied by
     decorateContractHtml so we can re-introduce styling later
     without changing the source markdown.  */

  /* ── Signature block ─────────────────────────────────────────
     Two-column row: company on the left, client on the right. Each
     cell stacks: handwritten mark → underline → role caption →
     small date line. Stacks single-column on mobile. The same
     markup is used in the contract template body (raw HTML inside
     markdown), in the unsigned React block on the live page (so
     the visual is identical), and in the rendered PDF. */
  .contract-display .sig-row {
    display: flex;
    gap: 32px;
    margin: 28px 0 16px;
    flex-wrap: wrap;
  }
  .contract-display .sig-cell {
    flex: 1 1 240px;
    min-width: 0;
  }
  .contract-display .sig-mark {
    display: flex;
    align-items: flex-end;
    min-height: 56px;
    padding: 0 4px 6px;
    font-family: 'Caveat', 'Brush Script MT', cursive;
    font-weight: 700;
    font-size: 32px;
    color: ${COLORS.ink};
    line-height: 1;
  }
  .contract-display .sig-mark .sig-mark-png {
    display: block;
    height: 48px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
  }
  .contract-display .sig-rule {
    height: 1.5px;
    background: ${COLORS.ink};
    margin: 0;
  }
  .contract-display .sig-caption {
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: ${COLORS.body};
    margin-top: 8px;
    line-height: 1.4;
  }
  .contract-display .sig-date {
    display: block;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: ${COLORS.muted};
    margin-top: 4px;
    letter-spacing: 0.01em;
  }

  /* Empty client signature mark — small visual cue, no text on the
     live web page (it's replaced by the React block). In the signed
     PDF it stays as a thin space so the layout doesn't collapse. */
  .contract-display .sig-blank-signature:empty::before {
    content: '\\00a0';
  }

  /* Server-injected interactive button. Replaces the empty client
     signature span on the live page so the recipient signs WITHIN
     Section 18. Visually a soft dashed placeholder with a hover
     state — clicking opens the SignatureCaptureModal. */
  .contract-display button.sig-blank-signature[data-cta="sign"] {
    appearance: none;
    -webkit-appearance: none;
    border: 2px dashed ${COLORS.rule};
    background: #f8fafc;
    border-radius: 10px;
    width: 100%;
    min-height: 56px;
    padding: 8px 14px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: ${COLORS.muted};
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .contract-display button.sig-blank-signature[data-cta="sign"]:hover,
  .contract-display button.sig-blank-signature[data-cta="sign"]:focus-visible {
    border-color: ${COLORS.brandBlue};
    background: #eff6ff;
    color: ${COLORS.brandBlue};
    outline: none;
  }
  .contract-display button.sig-blank-signature[data-cta="sign"]:empty::before {
    content: none;
  }

  /* Legacy classes still referenced by old (pre-redesign) snapshotted
     renderedHtml. Keep them rendering reasonably — body text + a thin
     underline — so old test docs don't look broken. New docs use the
     sig-row layout above. */
  .contract-display .signature-cursive {
    font-family: 'Caveat', 'Brush Script MT', cursive;
    font-weight: 700;
    font-size: 26px;
    color: ${COLORS.ink};
    line-height: 1.1;
  }
  .contract-display .sig-line,
  .contract-display .sig-blank-name {
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    color: ${COLORS.ink};
  }

  @media (max-width: 640px) {
    .contract-display .sig-row {
      gap: 28px;
      flex-direction: column;
      margin: 24px 0 12px;
    }
    /* On mobile (column flex), the desktop `flex: 1 1 240px` becomes
       a 240px HEIGHT basis on each cell, padding-stretching every
       cell to ~240px tall and creating a huge dead gap between
       company + client. Switch to natural sizing on column. */
    .contract-display .sig-cell {
      flex: 0 0 auto;
    }
    .contract-display .sig-mark { font-size: 28px; min-height: 50px; }
    .contract-display .sig-mark .sig-mark-png { height: 44px; }
    .contract-display .sig-caption { font-size: 12px; }
    .contract-display .sig-date { font-size: 11px; }
  }

  @media (max-width: 640px) {
    .contract-wrap {
      font-size: 15px;
      line-height: 1.7;
    }
    .contract-letterhead {
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .contract-letterhead img { width: 150px; }
    .contract-display h2 { font-size: 17px; margin-top: 32px; }
    .contract-display h3 { font-size: 14px; margin-top: 20px; }
    .contract-display .signature-cursive,
    .contract-display .sig-blank-signature { font-size: 22px; min-width: 180px; }
    .contract-display .sig-line,
    .contract-display .sig-blank-name,
    .contract-display .sig-blank-date { min-width: 180px; font-size: 14px; }
    .contract-display p:has(> .signature-cursive),
    .contract-display p:has(> .sig-line),
    .contract-display p:has(> .sig-blank-name),
    .contract-display p:has(> .sig-blank-signature),
    .contract-display p:has(> .sig-blank-date) {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
  }
`;
