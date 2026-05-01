/**
 * Course is now the single source of truth for checkoutAfterApply. Clear
 * any stored funnel-level overrides so the legacy column reads `null`
 * everywhere.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const before = await prisma.funnelConfig.findMany({
    where: { checkoutAfterApplyOverride: { not: null } },
    select: { id: true, deploymentId: true, checkoutAfterApplyOverride: true },
  });
  console.log(`Funnels with override set:`, before);
  const cleared = await prisma.funnelConfig.updateMany({
    where: { checkoutAfterApplyOverride: { not: null } },
    data: { checkoutAfterApplyOverride: null },
  });
  console.log(`Cleared ${cleared.count} override(s)`);
  await prisma.$disconnect();
}

main();
