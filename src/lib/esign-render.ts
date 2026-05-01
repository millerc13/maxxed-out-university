// Isomorphic markdown / HTML helpers — safe to import from both server
// and client modules. Crypto-using helpers (signing tokens, hashes) live
// in esign-tokens.ts because the Node 'crypto' import breaks the browser
// bundle when pulled into a 'use client' component.

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export type TokenValues = Record<string, string | number>;

const TOKEN_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_.]*)\s*\}\}/g;

// Pulls out every {{Token.Name}} placeholder appearing in `template`.
export function extractTokens(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(TOKEN_PATTERN)) {
    found.add(m[1]);
  }
  return Array.from(found).sort();
}

// Substitutes every {{Token}} in `template` with its value. Throws on any
// token in the template that has no value supplied — we never want to ship
// a contract that says "{{Payment.Total}}" because someone forgot to wire it.
export function renderMarkdown(template: string, tokens: TokenValues): string {
  const missing: string[] = [];
  const out = template.replace(TOKEN_PATTERN, (_, name: string) => {
    if (!(name in tokens)) {
      missing.push(name);
      return '';
    }
    return String(tokens[name]);
  });
  if (missing.length > 0) {
    throw new Error(`renderMarkdown: missing token values for: ${missing.join(', ')}`);
  }
  return out;
}

// Markdown → sanitized HTML. Same pipeline runs server-side (canonical
// renderedHtml snapshot) and client-side (live preview) so the hash on a
// signed row is reproducible from any environment.
export function markdownToHtml(md: string): string {
  marked.setOptions({ gfm: true, breaks: false });
  const raw = marked.parse(md, { async: false }) as string;
  // sanitize-html is no-DOM (htmlparser2 under the hood) so it works
  // in Lambda/Vercel without dragging jsdom in. Whitelist mirrors the
  // tags marked emits for our markdown contracts plus our own
  // data-callout attribute on <li>/<p> from decorateContractHtml.
  return sanitizeHtml(raw, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'b', 'i', 'u', 'sub', 'sup', 'code',
      'ul', 'ol', 'li',
      'blockquote', 'pre',
      'a', 'span', 'div',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      '*': ['class', 'data-callout'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

// Render-time decoration. The renderedHtml stored in the DB stays
// format-agnostic — the red callout boxes are layered on at display
// time so swapping styles later doesn't require re-hashing rows.
const CALLOUT_PATTERNS: RegExp[] = [
  /\bNO\s+REFUNDS\b/i,
  /\bNO\s+CHARGEBACKS\b/i,
  /\bALL\s+SALES\s+ARE\s+FINAL\b/i,
  /\bNON-?REFUNDABLE\b/i,
  /\bMATERIAL\s+BREACH\b/i,
];

export function decorateContractHtml(html: string): string {
  return html.replace(/<(li|p)>([\s\S]*?)<\/\1>/g, (full, tag, inner) => {
    if (CALLOUT_PATTERNS.some((p) => p.test(inner))) {
      return `<${tag} data-callout="warning">${inner}</${tag}>`;
    }
    return full;
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Replaces the empty CLIENT signature spans in the immutable
// renderedHtml with the customer's typed name + signed date. Source
// template intentionally leaves these blank — `<span class="sig-blank-name"></span>`
// etc. — so the live page (pre-sign) and the snapshot stored in the DB
// stay clean. We layer the signed values on at display + PDF time so
// the `renderedHtml` snapshot remains canonical for the signatureHash.
//
// If `signaturePng` is provided, the signature blank renders as an
// <img> of the captured PNG (typed-cursive render OR drawn canvas).
// Otherwise it falls back to the typed name in cursive (legacy path
// for older rows that pre-date the SignatureCaptureModal).
export function fillClientSignature(
  html: string,
  filled: { name: string; date: string; signaturePng?: string | null },
): string {
  const safeName = escapeHtml(filled.name);
  const safeDate = escapeHtml(filled.date);
  const signatureMarkup = filled.signaturePng
    ? `<img class="sig-mark-png" src="${filled.signaturePng}" alt="Signed by ${safeName}" />`
    : safeName;
  return html
    .replace(
      /<span class="([^"]*\bsig-blank-name\b[^"]*)"><\/span>/g,
      (_, cls) => `<span class="${cls}">${safeName}</span>`,
    )
    .replace(
      /<span class="([^"]*\bsig-blank-signature\b[^"]*)"><\/span>/g,
      (_, cls) => `<span class="${cls}">${signatureMarkup}</span>`,
    )
    .replace(
      /<span class="([^"]*\bsig-blank-date\b[^"]*)"><\/span>/g,
      (_, cls) => `<span class="${cls}">${safeDate}</span>`,
    );
}
