// One-shot seed for the two Setting rows that back the new admin toggles.
// Idempotent — upserts so re-running is a no-op if rows already exist.
//
// Seeds:
//   · internalNotificationsEnabled = "true" (global SMS+Slack kill switch, default ON)
//   · testPhoneOverride            = ""     (E.164 phone to reroute all SMS to, default empty)

import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from '@/lib/prisma';

const DEFAULTS: Array<{ key: string; value: string; description: string }> = [
  {
    key: 'internalNotificationsEnabled',
    value: 'true',
    description: 'Global kill for SMS + Slack fan-out',
  },
  {
    key: 'testPhoneOverride',
    value: '',
    description: 'Reroute all SMS to one number (E.164). Empty = normal fan-out.',
  },
];

async function main() {
  for (const d of DEFAULTS) {
    const result = await prisma.setting.upsert({
      where: { key: d.key },
      create: { key: d.key, value: d.value },
      update: {}, // Don't overwrite if already exists
      select: { key: true, value: true, updatedAt: true },
    });
    console.log(`✓ ${result.key} = ${JSON.stringify(result.value)}  (${d.description})`);
  }
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
