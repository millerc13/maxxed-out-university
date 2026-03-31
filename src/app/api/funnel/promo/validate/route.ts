import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — called by the funnel checkout when a user applies a promo code.
// Body: { code: string, courseId: string }
export async function POST(request: NextRequest) {
  try {
    const { code, courseId } = await request.json();

    if (!code || !courseId) {
      return NextResponse.json({ valid: false, error: 'Missing code or courseId' }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { courses: { select: { id: true } } },
    });

    if (!promo || !promo.active) {
      return NextResponse.json({ valid: false, error: 'Invalid promo code' });
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'This promo code has expired' });
    }

    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' });
    }

    const appliesToCourse =
      promo.applyToAll || promo.courses.some((c) => c.id === courseId);

    if (!appliesToCourse) {
      return NextResponse.json({ valid: false, error: 'This promo code does not apply to this course' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true },
    });

    if (!course?.price) {
      return NextResponse.json({ valid: false, error: 'Course not found' });
    }

    let discountAmount: number;
    if (promo.discountType === 'PERCENTAGE') {
      discountAmount = Math.floor((course.price * promo.discountValue) / 100);
    } else {
      discountAmount = promo.discountValue;
    }

    const finalPrice = Math.max(0, course.price - discountAmount);

    return NextResponse.json({
      valid: true,
      promoCodeId: promo.id,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      originalPrice: course.price,
      discountAmount,
      finalPrice,
    });
  } catch (err) {
    console.error('[promo/validate]', err);
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
