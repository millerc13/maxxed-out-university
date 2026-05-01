// Isomorphic markdown / HTML helpers — safe to import from both server
// and client modules. Crypto-using helpers (signing tokens, hashes) live
// in esign-tokens.ts because the Node 'crypto' import breaks the browser
// bundle when pulled into a 'use client' component.

import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

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
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['class', 'data-callout'],
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
