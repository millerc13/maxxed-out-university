import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) return null;
  return session;
}

// PUT — body: { courseIds: string[] }. Replaces the section's course list
// with this exact set, in this exact order. Courses removed from the
// section have their homepageSectionId nulled (which removes them from /
// and /courses until reassigned).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const courseIds: unknown = body.courseIds;
  if (!Array.isArray(courseIds) || !courseIds.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'courseIds must be an array of strings' }, { status: 400 });
  }

  // Verify the section exists before mutating courses.
  const section = await prisma.homepageSection.findUnique({ where: { id } });
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  // Single transaction:
  // 1. Detach courses currently in this section that aren't in the new list.
  // 2. Assign each new course to this section with its position index.
  await prisma.$transaction([
    prisma.course.updateMany({
      where: { homepageSectionId: id, id: { notIn: courseIds as string[] } },
      data: { homepageSectionId: null },
    }),
    ...(courseIds as string[]).map((courseId, idx) =>
      prisma.course.update({
        where: { id: courseId },
        data: { homepageSectionId: id, homepageOrder: idx },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
