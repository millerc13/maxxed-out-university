import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    include: {
      course: { select: { id: true, title: true, slug: true, price: true } },
      featuredCourses: { select: { id: true, title: true, slug: true, price: true, thumbnail: true } },
      config: true,
    },
  });

  if (!funnel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(funnel);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    name, url, courseId, active, headline, subheadline, bulletPoints, testimonials, ctaText,
    featuredCourseIds, featureCards, forYouIf,
    coursesLabel, coursesHeadline, coursesSubheadline,
    featureCardsLabel, featureCardsHeadline, featureCardsSub,
    bulletsLabel, bulletsHeadline, bulletsSub,
    vslVideoUrl, instructorImageUrl,
    template, subdomain,
  } = body;

  // Build config create/update objects dynamically
  const configCreate: Record<string, unknown> = {
    headline: headline ?? null,
    subheadline: subheadline ?? null,
    bulletPoints: bulletPoints ?? [],
    testimonials: testimonials ?? [],
    ctaText: ctaText ?? null,
    featureCards: featureCards ?? [],
    forYouIf: forYouIf ?? [],
    coursesLabel: coursesLabel ?? null,
    coursesHeadline: coursesHeadline ?? null,
    coursesSubheadline: coursesSubheadline ?? null,
    featureCardsLabel: featureCardsLabel ?? null,
    featureCardsHeadline: featureCardsHeadline ?? null,
    featureCardsSub: featureCardsSub ?? null,
    bulletsLabel: bulletsLabel ?? null,
    bulletsHeadline: bulletsHeadline ?? null,
    bulletsSub: bulletsSub ?? null,
    vslVideoUrl: vslVideoUrl ?? null,
    instructorImageUrl: instructorImageUrl ?? null,
    template: template ?? 'classic',
    // Course is the single source of truth for checkoutAfterApply.
    // Always create with null so the legacy override column is unused.
    checkoutAfterApplyOverride: null,
  };

  const configUpdate: Record<string, unknown> = {};
  for (const [key, val] of Object.entries({
    headline, subheadline, bulletPoints, testimonials, ctaText,
    featureCards, forYouIf,
    coursesLabel, coursesHeadline, coursesSubheadline,
    featureCardsLabel, featureCardsHeadline, featureCardsSub,
    bulletsLabel, bulletsHeadline, bulletsSub,
    vslVideoUrl, instructorImageUrl, template,
  })) {
    if (val !== undefined) configUpdate[key] = val;
  }

  const funnel = await prisma.funnelDeployment.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(courseId !== undefined && { courseId: courseId || null }),
      ...(subdomain !== undefined && { subdomain: subdomain || null }),
      ...(active !== undefined && { active }),
      ...(featuredCourseIds !== undefined && {
        featuredCourses: {
          set: featuredCourseIds.map((cid: string) => ({ id: cid })),
        },
      }),
      config: {
        upsert: {
          create: configCreate,
          update: configUpdate,
        },
      },
    },
    include: {
      course: { select: { id: true, title: true, slug: true, price: true } },
      featuredCourses: { select: { id: true, title: true, slug: true, price: true, thumbnail: true } },
      config: true,
    },
  });

  return NextResponse.json(funnel);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await prisma.funnelDeployment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
