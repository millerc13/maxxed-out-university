/**
 * Backfill `User.ghlContactId` for every existing buyer by looking up
 * their email in GHL. Idempotent — skips users that already have a
 * contact id linked.
 *
 * IMPORTANT — this script does NOT add any GHL tags retroactively. Adding
 * "enrolled-{slug}" tags to existing buyers could trigger Todd's GHL
 * automations (welcome SMS, follow-up sequences) for old customers, which
 * we don't want. New purchases get tagged in real-time by the webhook;
 * for old buyers we just link the contactId so the messages page can
 * show them as Sales without triggering anything.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { searchGhlContactByEmail } from '../src/lib/ghl';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { ghlContactId: null },
    select: { id: true, email: true },
  });
  const eligible = users.filter((u) => !!u.email);

  console.log(
    `Found ${users.length} users without ghlContactId (${eligible.length} have an email to look up).\n`
  );

  let linked = 0;
  let notFound = 0;
  for (const u of eligible) {
    const email = u.email!;
    try {
      const contact = await searchGhlContactByEmail(email);
      if (!contact?.id) {
        console.log(`  · ${email.padEnd(38)} no GHL match`);
        notFound++;
        continue;
      }
      await prisma.user.update({
        where: { id: u.id },
        data: { ghlContactId: contact.id },
      });
      console.log(`  ✓ ${email.padEnd(38)} → ${contact.id}`);
      linked++;
    } catch (err) {
      console.error(`  ! ${email}: ${(err as Error).message}`);
    }
  }

  console.log(`\nLinked ${linked}, no-match ${notFound}, total ${eligible.length}.`);
  console.log(`(No tags were added — automations were not triggered.)`);
  await prisma.$disconnect();
}

main();
