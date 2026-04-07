import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
