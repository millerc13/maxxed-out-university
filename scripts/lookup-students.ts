// Usage: npx tsx scripts/lookup-students.ts email1 email2 ...
// Prints user record + enrollment metadata (incl. phone) for each email.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error('Usage: npx tsx scripts/lookup-students.ts email1 email2 ...');
    process.exit(1);
  }

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        enrollments: {
          include: { course: { select: { title: true, price: true } } },
          orderBy: { enrolledAt: 'asc' },
        },
      },
    });

    console.log('\n=== ' + email + ' ===');
    if (!user) {
      console.log('NOT FOUND');
      continue;
    }
    console.log('Name:', user.name);
    console.log('Phone (User row):', user.phone || '(none)');
    console.log('GHL Contact:', user.ghlContactId || '(none)');
    console.log('Created:', user.createdAt.toISOString());
    console.log('Enrollments (' + user.enrollments.length + '):');
    for (const e of user.enrollments) {
      console.log(
        '  - ' + e.course.title +
        ' | source=' + (e.source || '') +
        ' | originalPrice=' + (e.originalPrice ?? 'null') +
        ' | txn=' + (e.transactionId || '') +
        ' | metadata=' + JSON.stringify(e.metadata)
      );
    }
  }
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
