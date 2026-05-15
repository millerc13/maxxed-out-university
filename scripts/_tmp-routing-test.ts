// Routing-only test for Slack fan-out. For each program slug a funnel
// could emit, calls notifySlackChannels('lead', slug, payload) — the EXACT
// code path /api/notify/lead uses. Proves the LMS-side routing per program.
//
// What this DOES touch: Slack (sends one [ROUTING TEST] message to every
// channel whose sources[] matches the slug).
//
// What this does NOT touch: SMS (notifyRecipients is never called),
// Meta CAPI, GHL, the funnel apiKey auth path, /api/notify/lead.
//
// Safe to re-run. No DB writes.

import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from '@/lib/prisma';
import { notifySlackChannels, type SlackEventPayload } from '@/lib/slack';

interface ProgramTest {
  slug: string;
  funnelLabel: string;
}

// Every slug the funnel's detectProgram() can return (apply/route.ts:36).
// Only the first 5 correspond to live FunnelDeployment subdomains; the
// rest are accepted by the funnel code but have no deployment row.
const PROGRAMS: ProgramTest[] = [
  { slug: 'mentorship',          funnelLabel: 'mentorship.maxxedout.com → 6 Month Mentorship' },
  { slug: 'blueprint',           funnelLabel: 'blueprint.maxxedout.com → Real Estate Empire Blueprint' },
  { slug: 'accelerator',         funnelLabel: 'accelerator.maxxedout.com → Business Accelerator' },
  { slug: 'business-mentorship', funnelLabel: 'business-mentorship.maxxedout.com → BAM' },
  { slug: 'experience',          funnelLabel: 'experience.maxxedout.com → Inner Circle Experience' },
];

async function main() {
  console.log(`📡 ROUTING TEST — ${PROGRAMS.length} program slug(s)\n`);
  console.log('Calls notifySlackChannels() directly. No SMS, no CAPI, no /api/notify/lead auth.');
  console.log('Each line below is the actual Slack fan-out result for that program.\n');

  let totalFired = 0;
  let totalFailed = 0;
  const noMatch: string[] = [];

  for (const p of PROGRAMS) {
    console.log(`\n── source="${p.slug}"  (${p.funnelLabel})`);
    const payload: SlackEventPayload = {
      headline: `[ROUTING TEST] ${p.slug}`,
      contactName: '[TEST] Routing Verification',
      email: 'routing-test@maxxedout.com',
      phone: '+15555550100',
    };
    const results = await notifySlackChannels('lead', p.slug, payload);

    if (results.length === 0) {
      console.log(`   ⚠️  NO MATCH — no SlackChannel.sources[] contains "${p.slug}"`);
      noMatch.push(p.slug);
      continue;
    }

    for (const r of results) {
      if (r.ok) {
        console.log(`   ✓ ${r.channelName}`);
        totalFired++;
      } else {
        console.log(`   ✗ ${r.channelName}  — ${r.error ?? 'unknown error'}`);
        totalFailed++;
      }
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Fired: ${totalFired}  ·  Failed: ${totalFailed}  ·  No-match: ${noMatch.length}`);
  if (noMatch.length > 0) {
    console.log(`Programs with no matching channel: ${noMatch.join(', ')}`);
  }
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
