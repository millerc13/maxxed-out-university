const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 — ambiguous

/**
 * Generate a human-readable certificate ID like "MOU-2026-A7K3X9".
 * Uses Web Crypto API so it works in both Node and Edge runtimes.
 */
export function generateCertificateId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('');
  return `MOU-${new Date().getFullYear()}-${suffix}`;
}
