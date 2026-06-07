import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';

export async function GET() {
  // Read — any staff role.
  if (!await sessionWithCapability('admin:access')) return unauthorized();

  const funnels = await prisma.funnelDeployment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, slug: true, price: true } },
      config: true,
    },
  });

  return NextResponse.json(funnels);
}

export async function POST(request: NextRequest) {
  // Create — content managers (ADMIN, INSTRUCTOR, MARKETING).
  if (!await sessionWithCapability('content:manage')) return unauthorized();

  const { name, url, courseId } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const funnel = await prisma.funnelDeployment.create({
    data: {
      name,
      url: url ?? '',
      courseId: courseId ?? null,
      config: {
        create: {
          bulletPoints: [],
          testimonials: [],
        },
      },
    },
    include: {
      course: { select: { id: true, title: true, slug: true, price: true } },
      config: true,
    },
  });

  return NextResponse.json(funnel, { status: 201 });
}
