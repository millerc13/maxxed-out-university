/**
 * Pull recent GHL contacts and classify each as likely-test vs likely-real
 * based on email/name patterns + tags. Read-only — does not modify or
 * delete anything.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { listRecentGhlContacts } from '../src/lib/ghl';

interface Classified {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
  category: 'test' | 'real' | 'unsure';
  reasons: string[];
}

const TEST_EMAIL_PATTERNS = [
  /^test/i,
  /test@/i,
  /^foo/i,
  /^asdf/i,
  /^qwerty/i,
  /\+test/i,
  /noreply/i,
  /example\.com$/i,
  /test\.com$/i,
  /\.test$/i,
  /yopmail/i,
  /mailinator/i,
];
const TEST_NAME_PATTERNS = [/^test/i, /asdf/i, /qwerty/i, /\bxxx\b/i, /^\.+$/, /^[a-z]{1,2}$/i];
const TEST_PHONE_PATTERNS = [/^\+?15555/, /^\+?17777/, /^\+?12345/, /^0+$/];

function classify(c: {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
}): Classified {
  const email = (c.email ?? '').trim();
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  const phone = (c.phone ?? '').replace(/\s/g, '');
  const tags = c.tags ?? [];
  const reasons: string[] = [];

  if (email && TEST_EMAIL_PATTERNS.some((p) => p.test(email))) {
    reasons.push(`email matches test pattern`);
  }
  if (name && TEST_NAME_PATTERNS.some((p) => p.test(name))) {
    reasons.push(`name looks like test (${name})`);
  }
  if (phone && TEST_PHONE_PATTERNS.some((p) => p.test(phone))) {
    reasons.push(`phone looks fake`);
  }
  if (!email && !phone) {
    reasons.push(`no email and no phone`);
  }
  if (email && email.split('@')[0].length <= 2) {
    reasons.push(`very short local-part`);
  }
  if (email === name?.replace(/\s/g, '').toLowerCase()) {
    reasons.push(`email == name (typed in test)`);
  }

  // Same value repeated (test, test test, etc.)
  if (
    name &&
    name.toLowerCase().split(/\s+/).every((w) => w === 'test' || w === '')
  ) {
    reasons.push(`name is just "test"`);
  }

  let category: Classified['category'] = 'real';
  if (reasons.length >= 2) category = 'test';
  else if (reasons.length === 1) category = 'unsure';

  return {
    id: c.id,
    name: name || '(no name)',
    email: email || '(no email)',
    phone: phone || '(no phone)',
    tags,
    dateAdded: c.dateAdded ?? '',
    category,
    reasons,
  };
}

async function main() {
  const all = await listRecentGhlContacts(100);
  const classified = all.map(classify);
  const groups = {
    test: classified.filter((c) => c.category === 'test'),
    unsure: classified.filter((c) => c.category === 'unsure'),
    real: classified.filter((c) => c.category === 'real'),
  };

  console.log(`\n=== AUDIT — ${classified.length} contacts ===\n`);
  console.log(`Likely test:  ${groups.test.length}`);
  console.log(`Unsure:       ${groups.unsure.length}`);
  console.log(`Likely real:  ${groups.real.length}\n`);

  for (const [label, group] of [
    ['LIKELY TEST', groups.test],
    ['UNSURE', groups.unsure],
    ['LIKELY REAL', groups.real],
  ] as const) {
    console.log(`\n── ${label} (${group.length}) ───────────────`);
    for (const c of group) {
      const tagStr = c.tags.length ? ` [${c.tags.slice(0, 3).join(', ')}]` : '';
      console.log(`  ${c.name.padEnd(28)} ${c.email.padEnd(38)} ${c.phone.padEnd(16)}${tagStr}`);
      if (c.reasons.length) {
        console.log(`    └ ${c.reasons.join('; ')}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
