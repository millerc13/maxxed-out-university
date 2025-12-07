import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as any).role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') return null;
  return session;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// POST - Create a new lesson
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { moduleId } = await params;

  try {
    const body = await request.json();
    const { title, description, videoUrl, videoDuration, content, isFree } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get the highest order number
    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });

    // Generate unique slug
    let slug = generateSlug(title);
    let slugSuffix = 0;
    while (true) {
      const existing = await prisma.lesson.findFirst({
        where: { moduleId, slug: slugSuffix ? `${slug}-${slugSuffix}` : slug },
      });
      if (!existing) break;
      slugSuffix++;
    }
    if (slugSuffix) slug = `${slug}-${slugSuffix}`;

    const lesson = await prisma.lesson.create({
      data: {
        title,
        slug,
        description,
        videoUrl,
        videoDuration,
        content,
        isFree: isFree ?? false,
        moduleId,
        order: (lastLesson?.order ?? -1) + 1,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}
