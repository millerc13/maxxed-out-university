import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const EMAIL = (process.argv[2] || 'cj-miller@resurgence.cloud').trim().toLowerCase();
const prisma = new PrismaClient();

async function main() {
  console.log(`Target email: ${EMAIL}`);
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: {
      enrollments: true,
      progress: true,
      certificates: true,
      magicLinks: true,
      passwordResetTokens: true,
      accounts: true,
      sessions: true,
    },
  });

  if (!user) {
    console.log(`No user found with email: ${EMAIL}`);
    return;
  }

  console.log(`Found user: ${user.name || user.email} (${user.id})`);
  console.log(`  Enrollments: ${user.enrollments.length}`);
  console.log(`  Lesson progress: ${user.progress.length}`);
  console.log(`  Certificates: ${user.certificates.length}`);
  console.log(`  Magic links: ${user.magicLinks.length}`);
  console.log(`  Password reset tokens: ${user.passwordResetTokens.length}`);
  console.log(`  Accounts: ${user.accounts.length}`);
  console.log(`  Sessions: ${user.sessions.length}`);

  // Cascade delete removes all related records
  await prisma.user.delete({ where: { email: EMAIL } });

  console.log(`\nDeleted user and all associated data.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
