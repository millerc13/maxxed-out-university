import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail, sendCourseAddedEmail } from '@/lib/resend';
import { enrollInBundle, enrollIncludedBundles } from '@/lib/enrollment';
import { notifyMastermindEnrolled } from '@/lib/mastermind-callback';

/**
 * Internal endpoint for mastermind's "Record offline sale" flow.
 *
 * On-site closers take payment directly through a Fanbasis payment link
 * (not via our /checkout flow, so no api_metadata → no auto-enrollment
 * from the Fanbasis webhook). This endpoint fires the same post-purchase
 * work the Fanbasis webhook does — minus the payment.
 *
 * Auth: shared MAXXED_INTERNAL_WEBHOOK_SECRET (same gate as mastermind's
 * other internal endpoints).
 */

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  courseId: z.string().min(1),
  transactionId: z.string().optional(),
  /** Freeform note for the Enrollment.metadata audit trail (e.g. "closed at Mastermind Live on 2026-05-03"). */
  note: z.string().optional(),
  /** Who recorded the sale — stamped into metadata for audit. */
  recordedByEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MAXXED_INTERNAL_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[manual-enroll] MAXXED_INTERNAL_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  if (request.headers.get('x-maxxed-internal') !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { id: true, slug: true, title: true, isBundle: true, thumbnail: true, published: true, price: true },
  });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  console.log('[manual-enroll] Start', { email: data.email, courseId: data.courseId, note: data.note });

  // 1. Find or create user
  let user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  let needsPasswordSetup = false;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name || null,
        mustChangePassword: true,
      },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    needsPasswordSetup = true;
    console.log('[manual-enroll] Created user', { userId: user.id });
  } else {
    needsPasswordSetup = !user.passwordHash;
  }

  const userId = user.id;
  const userEmail = user.email;
  const userName = user.name || data.name || 'Student';
  const txn = data.transactionId || `manual-${Date.now()}`;

  // 2. Primary enrollment (idempotent)
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: {
      userId,
      courseId: course.id,
      source: 'manual-offline',
      transactionId: txn,
      originalPrice: course.price,
      metadata: {
        provider: 'offline-fanbasis-link',
        email: data.email,
        phone: data.phone ?? null,
        note: data.note ?? null,
        recordedByEmail: data.recordedByEmail ?? null,
      },
    },
    update: {},
  });
  console.log('[manual-enroll] Enrolled in primary course', { userId, courseId: course.id });

  // 3. Bundle expansion — self (if the course IS a bundle) + included bundles (DWY/Mentorship → Blueprint)
  if (course.isBundle) {
    try {
      await enrollInBundle(userId, course.id, 'manual-offline', txn);
    } catch (err) {
      console.error('[manual-enroll] Bundle expansion failed', { error: err instanceof Error ? err.message : err });
    }
  }
  await enrollIncludedBundles(userId, course.id, 'manual-offline', txn);

  // 4. Always mint a magic link. Even for existing users with passwords —
  // offline-sale closers want to text a one-click access link to the buyer,
  // and a magic link works for both new (set password) and returning
  // (passwordless one-click sign-in) users.
  const magicToken = await createMagicLink(userId);
  const baseUrl = process.env.NEXTAUTH_URL || 'https://university.maxxedout.com';
  const activateUrl = `${baseUrl}/auth/activate?token=${magicToken}`;

  // 5. Email — magic link template for new users, course-added for existing.
  // Same bonus-box + team-reach-out notes the webhook sends for high-ticket programs.
  const HIGH_TICKET_COURSE_IDS = new Set(['ht_done_with_you', 'ht_mentorship_12mo']);
  const isHighTicket = HIGH_TICKET_COURSE_IDS.has(course.id);
  const bonusBox = isHighTicket
    ? {
        title: 'Real Estate Empire Blueprint — full course library',
        body: "You also have full access to the entire Blueprint curriculum (Wholesaling, Fix &amp; Flip, BRRRR, Property Management, Deal Analysis, and more). Start exploring the moment you set up your account.",
      }
    : null;
  const teamReachOutNote = isHighTicket;

  try {
    if (needsPasswordSetup) {
      await sendMagicLinkEmail({
        to: userEmail,
        name: userName,
        token: magicToken,
        courseName: course.title,
        courseThumbnail: course.thumbnail,
        bonusBox,
        teamReachOutNote,
      });
      console.log('[manual-enroll] Magic link email queued');
    } else {
      const loginUrl = `${baseUrl}/login`;
      await sendCourseAddedEmail({
        to: userEmail,
        name: userName,
        courseName: course.title,
        loginUrl,
        courseThumbnail: course.thumbnail,
        bonusBox,
        teamReachOutNote,
      });
      console.log('[manual-enroll] Course-added email queued');
    }
  } catch (err) {
    console.error('[manual-enroll] Email send failed', { error: err instanceof Error ? err.message : err });
  }

  // 5. Notify mastermind so SentOffer rows flip to 'enrolled' (if one exists)
  await notifyMastermindEnrolled({
    email: userEmail,
    courseId: course.id,
    transactionId: txn,
  });

  return NextResponse.json({
    success: true,
    userId,
    courseId: course.id,
    courseTitle: course.title,
    transactionId: txn,
    newUser: needsPasswordSetup,
    emailSentVia: needsPasswordSetup ? 'magic-link' : 'course-added',
    activateUrl, // caller (mastermind) uses this to SMS a one-click link
  });
}
