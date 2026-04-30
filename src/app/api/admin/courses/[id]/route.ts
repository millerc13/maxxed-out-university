import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncSingleCourseToGHL, deleteGHLProductForCourse } from '@/lib/ghl';

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

// GET - Get a single course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        include: { lessons: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
      products: true,
    },
  });

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  return NextResponse.json(course);
}

// PUT - Update a course
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, slug, description, shortDesc, thumbnail, published, comingSoon, price, externalUrl, applyMode, checkoutAfterApply, notifyClosersOnApply, heroStats, checkoutBullets } = body;

    // Validate checkoutBullets — string array, drop blanks.
    let checkoutBulletsValidated: string[] | undefined;
    if (checkoutBullets !== undefined) {
      if (!Array.isArray(checkoutBullets)) {
        return NextResponse.json({ error: 'checkoutBullets must be an array' }, { status: 400 });
      }
      checkoutBulletsValidated = checkoutBullets
        .filter((s: unknown) => typeof s === 'string')
        .map((s: string) => s.trim())
        .filter((s) => s !== '');
    }

    // Validate heroStats payload — admin-only endpoint, but still defend
    // against bad shape so the JSON column doesn't get corrupted.
    let heroStatsValidated: { iconName: string; iconColor: string | null; label: string }[] | undefined;
    if (heroStats !== undefined) {
      if (!Array.isArray(heroStats)) {
        return NextResponse.json({ error: 'heroStats must be an array' }, { status: 400 });
      }
      heroStatsValidated = heroStats.map((s: any) => ({
        iconName: typeof s?.iconName === 'string' && s.iconName ? s.iconName : 'BookOpen',
        iconColor: typeof s?.iconColor === 'string' ? s.iconColor : null,
        label: typeof s?.label === 'string' ? s.label : '',
      })).filter((s) => s.label.trim() !== '');
    }

    // Check if course exists
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.course.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json(
          { error: 'A course with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(shortDesc !== undefined && { shortDesc }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(published !== undefined && { published }),
        ...(comingSoon !== undefined && { comingSoon }),
        ...(price !== undefined && { price: price ? parseInt(price) : null }),
        ...(externalUrl !== undefined && { externalUrl: externalUrl || null }),
        ...(applyMode !== undefined && { applyMode: !!applyMode }),
        ...(checkoutAfterApply !== undefined && { checkoutAfterApply: !!checkoutAfterApply }),
        ...(notifyClosersOnApply !== undefined && { notifyClosersOnApply: !!notifyClosersOnApply }),
        ...(heroStatsValidated !== undefined && { heroStats: heroStatsValidated }),
        ...(checkoutBulletsValidated !== undefined && { checkoutBullets: checkoutBulletsValidated }),
      },
    });

    // Check if we need to sync to GHL
    const wasPublished = existing.published;
    const isNowPublished = course.published;
    const titleChanged = title && title !== existing.title;
    const priceChanged = price !== undefined && parseInt(price) !== existing.price;
    const thumbnailChanged = thumbnail !== undefined && thumbnail !== existing.thumbnail;

    if (isNowPublished) {
      // Sync if: just published, or key fields changed while published
      const shouldSync = !wasPublished || titleChanged || priceChanged || thumbnailChanged;

      if (shouldSync) {
        console.log(`Auto-syncing updated course to GHL: ${course.title}`);
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
          console.error('GHL sync failed:', err);
        });
      }
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only ADMIN can delete (not INSTRUCTOR)
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can delete courses' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Delete from GHL first (before deleting the course and its mappings)
    if (course.published) {
      console.log(`Deleting GHL product for course: ${course.title}`);
      try {
        await deleteGHLProductForCourse(id, prisma, course.title);
      } catch (err) {
        console.error('Failed to delete GHL product:', err);
      }
    }

    await prisma.course.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
