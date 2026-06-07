import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';

/**
 * Safe read of a course's Meta tracking status — pixel + whether CAPI is
 * live (per-course token OR system env token). NEVER returns the raw CAPI
 * token (only a masked tail), so a view-only pixel:manage role can see the
 * status without the secret leaking to the browser.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await sessionWithCapability('pixel:manage')) return unauthorized();

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, metaPixelId: true, metaCapiAccessToken: true, metaTestEventCode: true },
  });
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sysToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const systemCapiMasked = sysToken && sysToken.length >= 8 ? `${sysToken.slice(0, 4)}…${sysToken.slice(-4)}` : null;
  const capiOnCourse = !!course.metaCapiAccessToken;
  const capiActive = capiOnCourse || !!systemCapiMasked;
  const capiFromSystem = !capiOnCourse && !!systemCapiMasked;

  return NextResponse.json({
    metaPixelId: course.metaPixelId ?? null,
    courseTitle: course.title,
    capiActive,
    capiOnCourse,
    capiFromSystem,
    systemCapiMasked,
    testMode: !!course.metaTestEventCode,
  });
}

/**
 * Narrow endpoint that updates ONLY a course's Meta Pixel ID. Gated by
 * `pixel:manage` so a view-only role (MARKETING) can manage tracking
 * without `content:manage` — it cannot touch any other course field here.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await sessionWithCapability('pixel:manage')) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const raw = body?.metaPixelId;
  const metaPixelId =
    raw === null || raw === undefined ? null : (String(raw).replace(/[^\d]/g, '') || null);

  try {
    const course = await prisma.course.update({
      where: { id },
      data: { metaPixelId },
      select: { id: true, metaPixelId: true },
    });
    return NextResponse.json(course);
  } catch {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
}
