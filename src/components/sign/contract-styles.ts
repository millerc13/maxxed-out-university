// Shared CSS for the contract render. Used by both the web signing page
// (injected via <style> in ContractDisplay) and the PDF generator
// (inlined in buildPdfHtml). Keep the two consumers in lockstep — any
// rule edits affect both surfaces.

export const CONTRACT_FONT_LINKS = [
  // Inter for headings (brand sans).
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  // EB Garamond for body — classical legal-document gravitas.
  'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap',
  // Caveat for the company countersignature only.
  'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap',
];

// Relative path so server-rendered HTML hydrates identically on the
// client. The browser resolves it against the page origin; for the PDF
// generator (where there's no page origin), `buildPdfHtml` upgrades it
// to an absolute URL using NEXTAUTH_URL.
export const CONTRACT_LOGO_URL = '/downloads/logo.png';

const COLORS = {
  ink: '#0f172a',           // slate-900 — body text emphasis (used for strong)
  body: '#1f2937',          // gray-800 — body text
  muted: '#6b7280',          // gray-500
  divider: '#d1d5db',        // gray-300
  rule: '#e5e7eb',           // gray-200
  brandBlue: '#0000FF',      // maxxed brand blue — ONLY on the brand divider rule
  accentBar: '#1e40af',      // blue-800 — h2 left accent (more conservative than #0000FF)
  warningBg: '#fef2f2',      // red-50
  warningBorder: '#dc2626',  // red-600
  warningInk: '#991b1b',     // red-800
} as const;

// Both web (signing page) and print (PDF) render through the same class
// hierarchy so visual changes ship in lockstep.
export const CONTRACT_STYLES = `
  .contract-wrap {
    font-family: 'EB Garamond', Georgia, 'Times New Roman', serif;
    color: ${COLORS.body};
    font-size: 17px;
    line-height: 1.65;
    max-width: 760px;
    margin: 0 auto;
  }
  .contract-letterhead {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 0 28px;
    border-bottom: 2px solid ${COLORS.brandBlue};
    margin: 0 0 36px;
  }
  .contract-letterhead img {
    width: 200px;
    height: auto;
    max-width: 60%;
    margin: 0 0 18px;
    display: block;
  }
  .contract-letterhead .lh-meta {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${COLORS.muted};
    margin: 0;
  }
  .contract-display h1 {
    font-family: 'Inter', sans-serif;
    font-size: clamp(20px, 3.6vw, 26px);
    font-weight: 800;
    color: ${COLORS.ink};
    text-transform: uppercase;
    letter-spacing: 0.16em;
    text-align: center;
    margin: 0 0 24px;
    padding: 0 0 18px;
    line-height: 1.3;
    border-bottom: 1px solid ${COLORS.rule};
  }
  .contract-display h2 {
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    font-weight: 800;
    color: ${COLORS.ink};
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border-left: 4px solid ${COLORS.accentBar};
    padding-left: 14px;
    margin: 36px 0 12px;
    line-height: 1.3;
  }
  .contract-display h3 {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: ${COLORS.ink};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 22px 0 6px;
  }
  .contract-display p { margin: 0 0 14px; }
  .contract-display strong {
    color: ${COLORS.ink};
    font-weight: 600;
  }
  .contract-display ul {
    margin: 0 0 16px;
    padding-left: 24px;
    list-style-type: disc;
  }
  .contract-display ul li {
    margin-bottom: 4px;
    padding-left: 4px;
  }
  .contract-display ul li::marker { color: ${COLORS.muted}; }
  .contract-display hr {
    border: 0;
    border-top: 1px solid ${COLORS.rule};
    margin: 28px 0;
  }
  .contract-display [data-callout="warning"] {
    background: ${COLORS.warningBg};
    border-left: 4px solid ${COLORS.warningBorder};
    padding: 12px 16px;
    border-radius: 0 4px 4px 0;
    margin: 10px 0;
    list-style: none;
  }
  .contract-display [data-callout="warning"] strong {
    color: ${COLORS.warningInk};
    font-weight: 700;
  }
  .contract-display ul [data-callout="warning"] {
    margin-left: -24px;
    padding-left: 16px;
  }
  .contract-display .signature-cursive {
    font-family: 'Caveat', 'Brush Script MT', cursive;
    font-weight: 700;
    font-size: 32px;
    color: ${COLORS.ink};
    line-height: 1.1;
    display: inline-block;
    padding: 4px 24px 2px 12px;
    border-bottom: 1px solid ${COLORS.ink};
    min-width: 280px;
  }
  .contract-display .sig-line,
  .contract-display .sig-blank-name,
  .contract-display .sig-blank-date {
    display: inline-block;
    border-bottom: 1px solid ${COLORS.ink};
    min-width: 280px;
    padding: 2px 12px;
    margin-left: 6px;
    font-family: 'EB Garamond', Georgia, serif;
    color: ${COLORS.ink};
    vertical-align: bottom;
  }
  .contract-display .sig-blank-signature {
    border-bottom: 1px solid ${COLORS.ink};
    min-width: 280px;
  }
  /* Block-style signature rows so each label sits on its own line. */
  .contract-display p:has(> .signature-cursive),
  .contract-display p:has(> .sig-line),
  .contract-display p:has(> .sig-blank-name),
  .contract-display p:has(> .sig-blank-signature),
  .contract-display p:has(> .sig-blank-date) {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin: 14px 0;
  }
  .contract-display p:has(> .signature-cursive) > strong,
  .contract-display p:has(> .sig-line) > strong,
  .contract-display p:has(> .sig-blank-name) > strong,
  .contract-display p:has(> .sig-blank-signature) > strong,
  .contract-display p:has(> .sig-blank-date) > strong {
    min-width: 110px;
    flex-shrink: 0;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${COLORS.muted};
  }
  @media (max-width: 640px) {
    .contract-wrap { font-size: 16px; line-height: 1.6; }
    .contract-letterhead { padding-bottom: 22px; margin-bottom: 28px; }
    .contract-letterhead img { width: 160px; }
    .contract-display h1 { letter-spacing: 0.1em; }
    .contract-display h2 { font-size: 15px; padding-left: 10px; margin-top: 28px; }
    .contract-display .signature-cursive { font-size: 26px; min-width: 200px; }
    .contract-display .sig-line,
    .contract-display .sig-blank-name,
    .contract-display .sig-blank-date,
    .contract-display .sig-blank-signature { min-width: 200px; }
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
