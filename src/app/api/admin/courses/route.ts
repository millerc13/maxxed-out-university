import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncSingleCourseToGHL } from '@/lib/ghl';

// Helper to check admin
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    return null;
  }
  return session;
}

// GET - List all courses
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    include: {
      modules: {
        include: { lessons: true },
        orderBy: { order: 'asc' },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(courses);
}

// POST - Create a new course
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, description, shortDesc, thumbnail, published, comingSoon, price, externalUrl, applyMode, checkoutAfterApply, notifyClosersOnApply, bookACallEnabled } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'A course with this slug already exists' },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        shortDesc,
        thumbnail,
        published: published ?? false,
        comingSoon: comingSoon ?? false,
        price: price ? parseInt(price) : null,
        externalUrl: externalUrl ?? null,
        applyMode: applyMode ?? false,
        checkoutAfterApply: checkoutAfterApply ?? false,
        notifyClosersOnApply: notifyClosersOnApply ?? true,
        bookACallEnabled: bookACallEnabled ?? true,
      },
    });

    // If course is published, sync to GHL
    if (course.published) {
      console.log(`Auto-syncing new published course to GHL: ${course.title}`);
      syncSingleCourseToGHL(
        {
          id: course.id,
          title: course.title,
          description: course.description,
          shortDesc: course.shortDesc,
          thumbnail: course.thumbnail,
          price: course.price,
          slug: course.slug,
        },
        prisma
      ).catch((err) => {
        // Don't fail the course creation if GHL sync fails
        console.error('GHL sync failed:', err);
      });
    }

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
