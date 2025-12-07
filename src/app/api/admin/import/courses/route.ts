import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as any).role;
  if (role !== 'ADMIN') return null;
  return session;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { csv } = body;

    if (!csv) {
      return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and at least one data row' }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const data = rows.slice(1);

    // Track created items
    const stats = { courses: 0, modules: 0, lessons: 0 };
    const courseCache: Record<string, string> = {};
    const moduleCache: Record<string, string> = {};

    for (const row of data) {
      const item: Record<string, string> = {};
      headers.forEach((h, i) => {
        item[h] = row[i] || '';
      });

      const courseSlug = item.course_slug;
      const courseTitle = item.course_title;
      const moduleTitle = item.module_title;
      const lessonTitle = item.lesson_title;

      if (!courseSlug || !lessonTitle) continue;

      // Get or create course
      let courseId = courseCache[courseSlug];
      if (!courseId) {
        let course = await prisma.course.findUnique({ where: { slug: courseSlug } });
        if (!course) {
          course = await prisma.course.create({
            data: {
              title: courseTitle || courseSlug,
              slug: courseSlug,
              description: item.course_description || null,
              published: false,
            },
          });
          stats.courses++;
        }
        courseId = course.id;
        courseCache[courseSlug] = courseId;
      }

      // Get or create module
      const moduleKey = `${courseId}:${moduleTitle}`;
      let moduleId = moduleCache[moduleKey];
      if (!moduleId && moduleTitle) {
        let module = await prisma.module.findFirst({
          where: { courseId, title: moduleTitle },
        });
        if (!module) {
          const lastModule = await prisma.module.findFirst({
            where: { courseId },
            orderBy: { order: 'desc' },
          });
          module = await prisma.module.create({
            data: {
              title: moduleTitle,
              courseId,
              order: (lastModule?.order ?? -1) + 1,
            },
          });
          stats.modules++;
        }
        moduleId = module.id;
        moduleCache[moduleKey] = moduleId;
      }

      // Use first module if none specified
      if (!moduleId) {
        const firstModule = await prisma.module.findFirst({
          where: { courseId },
          orderBy: { order: 'asc' },
        });
        if (firstModule) {
          moduleId = firstModule.id;
        } else {
          const newModule = await prisma.module.create({
            data: {
              title: 'Module 1',
              courseId,
              order: 0,
            },
          });
          moduleId = newModule.id;
          stats.modules++;
        }
      }

      // Create lesson
      const lessonSlug = item.lesson_slug || lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = await prisma.lesson.findFirst({
        where: { moduleId, slug: lessonSlug },
      });

      if (!existing) {
        const lastLesson = await prisma.lesson.findFirst({
          where: { moduleId },
          orderBy: { order: 'desc' },
        });

        await prisma.lesson.create({
          data: {
            title: lessonTitle,
            slug: lessonSlug,
            description: item.lesson_description || null,
            videoUrl: item.video_url || null,
            videoDuration: item.duration_minutes ? parseInt(item.duration_minutes) * 60 : null,
            isFree: item.is_free === 'true',
            moduleId,
            order: (lastLesson?.order ?? -1) + 1,
          },
        });
        stats.lessons++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${stats.courses} courses, ${stats.modules} modules, ${stats.lessons} lessons`,
      stats,
    });
  } catch (error) {
    console.error('Import courses error:', error);
    return NextResponse.json(
      { error: 'Failed to import', details: String(error) },
      { status: 500 }
    );
  }
}
