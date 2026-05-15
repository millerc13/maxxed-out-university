/**
 * Runtime-flippable settings backed by the `Setting` Postgres table.
 *
 * Why: env vars require a Vercel redeploy to change. Pulling these knobs
 * into Postgres lets admins flip them from /admin/notifications without
 * touching infra. Hot paths (notify-lead, sms.ts) hit this on every lead,
 * so reads are cached in-memory for 10 seconds — DB load stays trivial
 * and a flip propagates within 10s across all serverless instances.
 *
 * Known keys (see prisma/schema.prisma Setting model):
 *   · internalNotificationsEnabled — "true" | "false" — kills SMS+Slack fan-out
 *   · testPhoneOverride            — E.164 phone or "" — reroutes all SMS to one number
 */

import { prisma } from './prisma';

const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Read a setting from Postgres with a 10s in-memory cache. Returns the
 * fallback if the row doesn't exist. Never throws — on DB error, logs
 * and returns fallback so a Postgres blip can't take down the hot path.
 */
export async function getSetting(key: string, fallback: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value ?? fallback;
  }

  try {
    const row = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    const value = row?.value ?? null;
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value ?? fallback;
  } catch (err) {
    console.error(`[settings] read failed for key=${key}, returning fallback`, err);
    return fallback;
  }
}

/** Boolean convenience reader. Treats "true" (case-insensitive) as true. */
export async function getSettingBool(key: string, fallback: boolean): Promise<boolean> {
  const raw = await getSetting(key, fallback ? 'true' : 'false');
  return raw.trim().toLowerCase() === 'true';
}

/**
 * Write a setting and bust the cache locally. Other serverless instances
 * pick up the new value when their cache expires (≤10s).
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  cache.delete(key);
}
