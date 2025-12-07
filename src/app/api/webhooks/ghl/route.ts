import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

// Verify webhook signature from GHL (if they provide one)
function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;

  // If no secret configured, skip verification (not recommended for production)
  if (!secret) {
    console.warn('GHL_WEBHOOK_SECRET not configured - skipping signature verification');
    return true;
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-ghl-signature');

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Log webhook for debugging
    await prisma.webhookLog.create({
      data: {
        source: 'ghl',
        event: payload.event || 'purchase',
        payload: payload,
        status: 'processing',
      },
    });

    // Extract contact info
    const contact = payload.contact || payload.customer || {};
    const email = contact.email?.toLowerCase().trim();

    if (!email) {
      await logWebhookError('ghl', payload, 'Missing email in payload');
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Extract product info
    const product = payload.product || payload.offer || {};
    const ghlProductId = product.id || product.productId;
    const productName = product.name || product.title;

    if (!ghlProductId) {
      await logWebhookError('ghl', payload, 'Missing product ID');
      return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
    }

    // Find product mapping to get course ID
    const productMapping = await prisma.productMapping.findUnique({
      where: { ghlProductId },
      include: { course: true },
    });

    if (!productMapping || !productMapping.active) {
      // Log but don't fail - might be a product we don't track
      console.warn(`No active product mapping for GHL product: ${ghlProductId}`);
      await logWebhookError('ghl', payload, `No product mapping for: ${ghlProductId}`);
      return NextResponse.json({
        success: true,
        message: 'Product not mapped to course'
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null,
          ghlContactId: contact.id,
          mustChangePassword: true, // Force password setup on first login
        },
      });
    } else if (!user.ghlContactId && contact.id) {
      // Update GHL contact ID if we didn't have it
      await prisma.user.update({
        where: { id: user.id },
        data: { ghlContactId: contact.id },
      });
    }

    // Get courses to enroll in
    let coursesToEnroll: string[] = [];

    if (productMapping.grantAll) {
      // Grant access to ALL published courses
      const allCourses = await prisma.course.findMany({
        where: { published: true },
        select: { id: true },
      });
      coursesToEnroll = allCourses.map(c => c.id);
    } else {
      coursesToEnroll = [productMapping.courseId];
    }

    // Create enrollments
    const transaction = payload.transaction || {};

    for (const courseId of coursesToEnroll) {
      // Check if already enrolled
      const existing = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId,
          },
        },
      });

      if (!existing) {
        await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId,
            source: 'ghl',
            transactionId: transaction.id,
            metadata: {
              ghlProductId,
              productName,
              amount: transaction.amount,
              purchaseDate: new Date().toISOString(),
            },
          },
        });
      }
    }

    // Generate magic link for the user
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://university.maxxedout.com';
    const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;

    // Update webhook log to success
    await prisma.webhookLog.updateMany({
      where: {
        source: 'ghl',
        payload: { equals: payload },
        status: 'processing',
      },
      data: {
        status: 'success',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Enrollment created successfully',
      userId: user.id,
      coursesEnrolled: coursesToEnroll.length,
      isNewUser,
      email: user.email,
      firstName: user.name?.split(' ')[0] || '',
      // Magic link for GHL to include in welcome email
      magicLink: magicLink,
      loginUrl: `${baseUrl}/login`,
    });

  } catch (error) {
    console.error('GHL webhook error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function logWebhookError(source: string, payload: any, errorMessage: string) {
  try {
    await prisma.webhookLog.create({
      data: {
        source,
        event: payload.event || 'unknown',
        payload,
        status: 'failed',
        errorMessage,
      },
    });
  } catch (e) {
    console.error('Failed to log webhook error:', e);
  }
}

// GHL might send a GET to verify the endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'GHL webhook endpoint is active',
  });
}
