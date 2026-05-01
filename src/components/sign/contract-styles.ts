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
    color: ${COLORS.ink};
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

  /* Important callouts. Restrained — no loud red boxes; just a quiet
     left border + faint tint so the legally-charged terms (no refunds,
     no chargebacks, etc.) read as emphatic without shouting. */
  .contract-display [data-callout="warning"] {
    background: ${COLORS.warningTint};
    border-left: 3px solid ${COLORS.warningRule};
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    margin: 8px 0;
    list-style: none;
  }
  .contract-display [data-callout="warning"] strong {
    color: ${COLORS.warningInk};
    font-weight: 700;
  }
  .contract-display ul [data-callout="warning"],
  .contract-display ol [data-callout="warning"] {
    margin-left: -22px;
    padding-left: 14px;
  }

  /* Signature blocks. Two-column on wide; stacks cleanly on mobile.
     Company signature uses Caveat for the handwritten feel; client
     signature lines render with the same handwriting style after sign,
     and read as a clean underlined value field before sign. */
  .contract-display .signature-cursive {
    font-family: 'Caveat', 'Brush Script MT', cursive;
    font-weight: 700;
    font-size: 26px;
    color: ${COLORS.ink};
    line-height: 1.1;
    display: inline-block;
    padding: 2px 18px 2px 8px;
    border-bottom: 1.5px solid ${COLORS.brandBlue};
    min-width: 240px;
    vertical-align: bottom;
  }
  .contract-display .sig-line,
  .contract-display .sig-blank-name,
  .contract-display .sig-blank-date {
    display: inline-block;
    border-bottom: 1px solid ${COLORS.body};
    min-width: 240px;
    padding: 2px 12px 4px;
    margin-left: 6px;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    color: ${COLORS.ink};
    vertical-align: bottom;
  }
  .contract-display .sig-blank-signature {
    border-bottom: 1px solid ${COLORS.body};
    min-width: 240px;
  }
  .contract-display .sig-blank-signature {
    /* Once filled, the signature still wants the handwriting style. */
    font-family: 'Caveat', 'Brush Script MT', cursive;
    font-weight: 700;
    font-size: 24px;
    line-height: 1.1;
    border-bottom: 1.5px solid ${COLORS.brandBlue};
  }
  /* When the signature is a captured PNG (typed-cursive render OR
     a finger-drawn canvas), drop the text styling and fit the image
     to the line height of the signature row. */
  .contract-display .sig-blank-signature:has(.sig-mark-png),
  .contract-display .sig-blank-signature .sig-mark-png {
    line-height: 0;
  }
  .contract-display .sig-blank-signature .sig-mark-png {
    display: inline-block;
    height: 44px;
    width: auto;
    max-width: 240px;
    vertical-align: bottom;
    margin: 0 0 -4px;
  }
  @media (max-width: 640px) {
    .contract-display .sig-blank-signature .sig-mark-png {
      height: 36px;
      max-width: 180px;
    }
  }

  /* Block-style signature rows so each label sits on its own line. */
  .contract-display p:has(> .signature-cursive),
  .contract-display p:has(> .sig-line),
  .contract-display p:has(> .sig-blank-name),
  .contract-display p:has(> .sig-blank-signature),
  .contract-display p:has(> .sig-blank-date) {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin: 16px 0;
  }
  .contract-display p:has(> .signature-cursive) > strong,
  .contract-display p:has(> .sig-line) > strong,
  .contract-display p:has(> .sig-blank-name) > strong,
  .contract-display p:has(> .sig-blank-signature) > strong,
  .contract-display p:has(> .sig-blank-date) > strong {
    min-width: 96px;
    flex-shrink: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${COLORS.muted};
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
