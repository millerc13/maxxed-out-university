import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both JSON and form data
    let lessonId: string | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      lessonId = body.lessonId;
    } else {
      const formData = await request.formData();
      lessonId = formData.get('lessonId') as string;
    }

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
    }

    // Get the lesson and verify it exists
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

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if user is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.module.courseId,
        },
      },
    });

    // Allow if enrolled or if lesson is free
    if (!enrollment && !lesson.isFree) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    // Update or create progress
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: lessonId,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
        watchedSeconds: lesson.videoDuration || 0,
        lastPosition: lesson.videoDuration || 0,
      },
      create: {
        userId: session.user.id,
        lessonId: lessonId,
        completed: true,
        completedAt: new Date(),
        watchedSeconds: lesson.videoDuration || 0,
        lastPosition: lesson.videoDuration || 0,
      },
    });

    // Check if this completes the course
    const allLessons = await prisma.lesson.findMany({
      where: { module: { courseId: lesson.module.courseId } },
      select: { id: true },
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId: session.user.id,
        lessonId: { in: allLessons.map((l) => l.id) },
        completed: true,
      },
    });

    const courseComplete = completedLessons === allLessons.length;

    // If form submission, redirect back
    if (!contentType.includes('application/json')) {
      const referer = request.headers.get('referer') || `/courses/${lesson.module.course.slug}`;
      return NextResponse.redirect(referer);
    }

    return NextResponse.json({
      success: true,
      progress,
      courseComplete,
      completedLessons,
      totalLessons: allLessons.length,
    });
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
