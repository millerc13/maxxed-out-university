import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncCoursesToGHL, updateGHLProductPrices, deleteAndRecreateProducts, type CourseToSync } from '@/lib/ghl';

/**
 * POST /api/admin/sync-ghl-products
 *
 * Syncs all published courses to GoHighLevel as products.
 * Only accessible by admins.
 *
 * Optional body:
 * - courseIds: string[] - Specific course IDs to sync (optional, syncs all if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    let courseIds: string[] | undefined;
    try {
      const body = await request.json();
      courseIds = body.courseIds;
    } catch {
      // No body or invalid JSON is fine - we'll sync all courses
    }

    // Fetch courses to sync
    const courses = await prisma.course.findMany({
      where: {
        published: true,
        ...(courseIds ? { id: { in: courseIds } } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        shortDesc: true,
        thumbnail: true,
        price: true,
        slug: true,
      },
    });

    if (courses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No courses to sync',
        results: [],
      });
    }

    // Map to CourseToSync format
    const coursesToSync: CourseToSync[] = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      shortDesc: c.shortDesc,
      thumbnail: c.thumbnail,
      price: c.price,
      slug: c.slug,
    }));

    // Sync to GHL
    const results = await syncCoursesToGHL(coursesToSync);

    // Count successes and failures
    const successCount = results.filter((r) => r.success && !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failedCount === 0,
      message: `Synced ${successCount} courses, skipped ${skippedCount}, failed ${failedCount}`,
      summary: {
        total: courses.length,
        created: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error syncing courses to GHL:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync-ghl-products
 *
 * Lists existing GHL products for comparison.
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const locationId = process.env.GHL_LOCATION_ID;
    if (!locationId) {
      return NextResponse.json({ error: 'GHL_LOCATION_ID not configured' }, { status: 500 });
    }

    // Import dynamically to avoid issues
    const { listProducts } = await import('@/lib/ghl');
    const products = await listProducts(locationId);

    // Also get courses for comparison
    const courses = await prisma.course.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        price: true,
        slug: true,
      },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json({
      ghlProducts: products,
      courses: courses,
      locationId,
    });
  } catch (error) {
    console.error('Error listing GHL products:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/sync-ghl-products
 *
 * Updates prices for existing GHL products to match course prices.
 * Matches products to courses by name.
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all published courses
    const courses = await prisma.course.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        description: true,
        shortDesc: true,
        thumbnail: true,
        price: true,
        slug: true,
      },
    });

    if (courses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No courses to update',
        results: [],
      });
    }

    // Map to CourseToSync format
    const coursesToUpdate: CourseToSync[] = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      shortDesc: c.shortDesc,
      thumbnail: c.thumbnail,
      price: c.price,
      slug: c.slug,
    }));

    // Update prices in GHL
    const results = await updateGHLProductPrices(coursesToUpdate);

    // Count successes and failures
    const successCount = results.filter((r) => r.success && !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failedCount = results.filter((r) => !r.success && !r.skipped).length;

    return NextResponse.json({
      success: failedCount === 0,
      message: `Updated ${successCount} prices, skipped ${skippedCount}, failed ${failedCount}`,
      summary: {
        total: courses.length,
        updated: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error updating GHL product prices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sync-ghl-products
 *
 * Deletes all course-related products from GHL and recreates them with correct prices.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all published courses
    const courses = await prisma.course.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        description: true,
        shortDesc: true,
        thumbnail: true,
        price: true,
        slug: true,
      },
    });

    if (courses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No courses to recreate',
        results: [],
      });
    }

    // Map to CourseToSync format
    const coursesToRecreate: CourseToSync[] = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      shortDesc: c.shortDesc,
      thumbnail: c.thumbnail,
      price: c.price,
      slug: c.slug,
    }));

    // Delete and recreate products
    const results = await deleteAndRecreateProducts(coursesToRecreate);

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failedCount === 0,
      message: `Recreated ${successCount} products, failed ${failedCount}`,
      summary: {
        total: courses.length,
        recreated: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error recreating GHL products:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
