import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return null;
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
  const { name, url, courseId, active, headline, subheadline, bulletPoints, testimonials, ctaText, featuredCourseIds } = body;

  const funnel = await prisma.funnelDeployment.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(courseId !== undefined && { courseId: courseId || null }),
      ...(active !== undefined && { active }),
      ...(featuredCourseIds !== undefined && {
        featuredCourses: {
          set: featuredCourseIds.map((cid: string) => ({ id: cid })),
        },
      }),
      config: {
        upsert: {
          create: {
            headline: headline ?? null,
            subheadline: subheadline ?? null,
            bulletPoints: bulletPoints ?? [],
            testimonials: testimonials ?? [],
            ctaText: ctaText ?? null,
          },
          update: {
            ...(headline !== undefined && { headline }),
            ...(subheadline !== undefined && { subheadline }),
            ...(bulletPoints !== undefined && { bulletPoints }),
            ...(testimonials !== undefined && { testimonials }),
            ...(ctaText !== undefined && { ctaText }),
          },
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
