import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryPostHog, subdomainToProgram } from '@/lib/posthog';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const funnel = await prisma.funnelDeployment.findUnique({
    where: { id },
    select: { subdomain: true, courseId: true },
  });
  if (!funnel) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const program = subdomainToProgram(funnel.subdomain);

  const enrollments = funnel.courseId
    ? await prisma.enrollment.findMany({
        where: { courseId: funnel.courseId, source: 'stripe' },
        include: {
          course: { select: { price: true } },
          promoCode: { select: { code: true, discountType: true, discountValue: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      })
    : [];

  const totalRevenue = enrollments.reduce((sum, e) => {
    const price = e.originalPrice ?? e.course.price ?? 0;
    if (e.promoCode) {
      if (e.promoCode.discountType === 'PERCENTAGE') {
        return sum + Math.round(price * (1 - e.promoCode.discountValue / 100));
      }
      return sum + Math.max(0, price - e.promoCode.discountValue);
    }
    return sum + price;
  }, 0);

  const avgOrderValue = enrollments.length > 0 ? totalRevenue / enrollments.length : 0;

  const promoData = await queryPostHog(`
    SELECT
      properties.promo_code as code,
      countIf(event = 'promo_code_applied') as applied,
      countIf(event = 'promo_code_failed') as failed
    FROM events
    WHERE event IN ('promo_code_applied', 'promo_code_failed')
      AND properties.program = '${program}'
      AND timestamp >= now() - interval 30 day
    GROUP BY code
    ORDER BY applied DESC
  `);

  const totalPromoApplied = promoData.results.reduce((s, r) => s + Number(r[1]), 0);
  const totalPromoFailed = promoData.results.reduce((s, r) => s + Number(r[2]), 0);

  return NextResponse.json({
    kpis: {
      totalRevenue,
      enrollmentCount: enrollments.length,
      avgOrderValue: Math.round(avgOrderValue),
      promoApplied: totalPromoApplied,
      promoFailed: totalPromoFailed,
      promoFailRate: (totalPromoApplied + totalPromoFailed) > 0
        ? totalPromoFailed / (totalPromoApplied + totalPromoFailed)
        : 0,
    },
    promoCodes: promoData.results.map(([code, applied, failed]) => ({
      code: String(code),
      applied: Number(applied),
      failed: Number(failed),
    })),
  });
}
