import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedVideoUrl, parseVideoKey, isR2Video } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch lesson with its course (for enrollment check)
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!lesson || !lesson.videoUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isAdmin = (session.user as any).role === 'ADMIN';

  // Free preview lessons don't need enrollment check
  if (!lesson.isFree && !isAdmin) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
    }
  }

  // If it's an R2 video, generate a signed URL
  if (isR2Video(lesson.videoUrl)) {
    const objectKey = parseVideoKey(lesson.videoUrl)!;
    const signedUrl = await getSignedVideoUrl(objectKey);
    return NextResponse.json({ url: signedUrl });
  }

  // Legacy direct URL (filesafe.space etc) — return as-is for now
  return NextResponse.json({ url: lesson.videoUrl });
}
