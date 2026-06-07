import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncSingleCourseToGHL } from '@/lib/ghl';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';

// GET - List all courses (any staff role may view)
export async function GET() {
  const session = await sessionWithCapability('admin:access');
  if (!session) return unauthorized();

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

// POST - Create a new course (content managers: ADMIN, INSTRUCTOR, MARKETING)
export async function POST(request: NextRequest) {
  const session = await sessionWithCapability('content:manage');
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const { title, slug, description, shortDesc, thumbnail, published, comingSoon, price, externalUrl, applyMode, checkoutAfterApply, notifyClosersOnApply, bookACallEnabled, welcomeSmsBody, welcomeEmailSubject, welcomeEmailBody, autoSendContract } = body;

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
        welcomeSmsBody: welcomeSmsBody?.trim() ? welcomeSmsBody : null,
        welcomeEmailSubject: welcomeEmailSubject?.trim() ? welcomeEmailSubject : null,
        welcomeEmailBody: welcomeEmailBody?.trim() ? welcomeEmailBody : null,
        autoSendContract: autoSendContract ?? false,
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
