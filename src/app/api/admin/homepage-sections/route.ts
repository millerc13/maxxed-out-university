import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) return null;
  return session;
}

// GET — list all sections with their assigned courses
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sections = await prisma.homepageSection.findMany({
    orderBy: { order: 'asc' },
    include: {
      courses: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          price: true,
          published: true,
          comingSoon: true,
          externalUrl: true,
          homepageOrder: true,
        },
        orderBy: { homepageOrder: 'asc' },
      },
    },
  });
  return NextResponse.json({ sections });
}

// POST — create a section, appended to the bottom of the list
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title ?? '').toString().trim();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const max = await prisma.homepageSection.aggregate({ _max: { order: true } });
  const section = await prisma.homepageSection.create({
    data: {
      title,
      description: body.description ?? null,
      iconName: body.iconName ?? 'BookOpen',
      iconColor: body.iconColor ?? null,
      order: (max._max.order ?? 0) + 1,
      published: body.published ?? true,
    },
  });
  return NextResponse.json({ section });
}
