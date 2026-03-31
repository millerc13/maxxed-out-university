import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedStreamUrl, parseStreamId, isStreamVideo } from '@/lib/stream';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        select: { courseId: true },
      },
    },
  });

  if (!lesson || !lesson.videoUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isAdmin = (session.user as any).role === 'ADMIN';

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

  if (isStreamVideo(lesson.videoUrl)) {
    const videoId = parseStreamId(lesson.videoUrl)!;
    const url = getSignedStreamUrl(videoId);
    return NextResponse.json({ url, type: 'iframe' });
  }

  // Legacy direct URL
  return NextResponse.json({ url: lesson.videoUrl, type: 'mp4' });
}
