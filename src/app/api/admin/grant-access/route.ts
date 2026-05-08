import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail, sendCourseAddedEmail } from '@/lib/resend';
import { enrollInBundle, enrollIncludedBundles } from '@/lib/enrollment';
import { notifyMastermindEnrolled } from '@/lib/mastermind-callback';

/**
 * Admin "Grant access to a new person" endpoint.
 *
 * Drives the same post-purchase pipeline a Fanbasis sale would (enroll
 * + bundle expansion + magic-link SMS via GHL + welcome email) but
 * gated by an admin session instead of a webhook secret. Use case:
 * Todd's team comping access to someone who hasn't bought yet (mentor
 * referrals, podcast guests, support comp, etc.) and needs the same
 * "tap to log in" SMS the buyers get.
 */

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().min(7),
  courseId: z.string().min(1),
  note: z.string().optional(),
});

const HIGH_TICKET_COURSE_IDS = new Set(['ht_done_with_you', 'ht_mentorship_12mo']);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      {
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const recordedByEmail = session.user.email ?? null;

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      isBundle: true,
      thumbnail: true,
      checkoutAfterApply: true,
      welcomeSmsBody: true,
      welcomeEmailSubject: true,
      welcomeEmailBody: true,
    },
  });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  console.log('[grant-access] Start', {
    email: data.email,
    courseId: data.courseId,
    recordedByEmail,
  });

  // 1. Find or create user
  let user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, email: true, name: true, passwordHash: true, ghlContactId: true },
  });
  let needsPasswordSetup = false;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        mustChangePassword: true,
      },
      select: { id: true, email: true, name: true, passwordHash: true, ghlContactId: true },
    });
    needsPasswordSetup = true;
    console.log('[grant-access] Created user', { userId: user.id });
  } else {
    needsPasswordSetup = !user.passwordHash;
  }

  const userId = user.id;
  const userEmail = user.email;
  const userName = user.name || data.name;
  const txn = `admin-grant-${Date.now()}`;

  // 2. Primary enrollment (idempotent)
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: {
      userId,
      courseId: course.id,
      source: 'admin-grant',
      transactionId: txn,
      metadata: {
        provider: 'admin-grant-access',
        email: data.email,
        phone: data.phone,
        note: data.note ?? null,
        recordedByEmail,
      },
    },
    update: {},
  });
  console.log('[grant-access] Enrolled', { userId, courseId: course.id });

  // 3. Bundle expansion — same rules as fanbasis/manual-enroll.
  if (course.isBundle) {
    try {
      await enrollInBundle(userId, course.id, 'admin-grant', txn);
    } catch (err) {
      console.error('[grant-access] Bundle expansion failed', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }
  await enrollIncludedBundles(userId, course.id, 'admin-grant', txn);

  // 4. GHL contact resolution. Try cached id, then email lookup, then
  // upsert by phone (which also creates the contact if it doesn't
  // exist — the whole point of this endpoint).
  let ghlContactId: string | null = user.ghlContactId ?? null;
  try {
    if (!ghlContactId) {
      const { linkUserToGhlContactByEmail, upsertGhlContactByPhone, syncCoursePurchase } = await import('@/lib/ghl');
      ghlContactId = await linkUserToGhlContactByEmail(userId, userEmail);
      if (!ghlContactId) {
        const [firstName, ...rest] = data.name.trim().split(/\s+/);
        const lastName = rest.join(' ') || null;
        ghlContactId = await upsertGhlContactByPhone({
          phone: data.phone,
          email: userEmail,
          firstName: firstName || null,
          lastName,
        });
        if (ghlContactId) {
          await prisma.user.update({
            where: { id: userId },
            data: { ghlContactId },
          });
        }
      }
      if (ghlContactId && course.slug) {
        await syncCoursePurchase(ghlContactId, course.slug);
      }
    }
  } catch (err) {
    console.error('[grant-access] GHL contact resolve failed (non-fatal)', err);
  }

  // 5. Mint magic link (token + short code) — token for email, short
  // code for SMS one-tap.
  let activateToken: string | null = null;
  let activateShortCode: string | null = null;
  try {
    const ml = await createMagicLink(userId);
    activateToken = ml.token;
    activateShortCode = ml.shortCode;
  } catch (err) {
    console.error('[grant-access] Magic link create failed', {
      error: err instanceof Error ? err.message : err,
    });
  }

  const baseUrl = (process.env.NEXTAUTH_URL || 'https://university.maxxedout.com').replace(/\/$/, '');
  const activateUrl = activateToken ? `${baseUrl}/auth/activate?token=${activateToken}` : null;
  const activateShortUrl = activateShortCode ? `${baseUrl}/a/${activateShortCode}` : null;

  // 6. Email — same templates the webhook uses.
  const isHighTicket = HIGH_TICKET_COURSE_IDS.has(course.id);
  const bonusBox = isHighTicket
    ? {
        title: 'Real Estate Empire Blueprint — full course library',
        body: "You also have full access to the entire Blueprint curriculum (Wholesaling, Fix &amp; Flip, BRRRR, Property Management, Deal Analysis, and more). Start exploring the moment you set up your account.",
      }
    : null;
  const teamReachOutNote = isHighTicket;

  const firstName = (userName || '').trim().split(/\s+/)[0] || 'there';
  const emailTokens = {
    firstName,
    customerName: userName || firstName,
    courseTitle: course.title,
    shortUrl: activateShortUrl ?? '',
    activateUrl: activateUrl ?? '',
  };
  const { renderTokens } = await import('@/lib/delivery');
  const subjectOverride = course.welcomeEmailSubject
    ? renderTokens(course.welcomeEmailSubject, emailTokens)
    : null;
  const bodyOverride = course.welcomeEmailBody
    ? renderTokens(course.welcomeEmailBody, emailTokens)
    : null;

  try {
    if (needsPasswordSetup && activateToken) {
      await sendMagicLinkEmail({
        to: userEmail,
        name: userName,
        token: activateToken,
        courseName: course.title,
        courseThumbnail: course.thumbnail,
        bonusBox,
        teamReachOutNote,
        subjectOverride,
        bodyOverride,
      });
    } else {
      await sendCourseAddedEmail({
        to: userEmail,
        name: userName,
        courseName: course.title,
        loginUrl: `${baseUrl}/login`,
        courseThumbnail: course.thumbnail,
        bonusBox,
        teamReachOutNote,
        subjectOverride,
        bodyOverride,
      });
    }
  } catch (err) {
    console.error('[grant-access] Email send failed', {
      error: err instanceof Error ? err.message : err,
    });
  }

  // 7. Magic-link SMS via GHL — buildSmsBody picks the right template
  // based on course nature (high-ticket vs blueprint vs self-serve).
  let smsStatus: 'sent' | 'skipped-non-prod' | 'skipped-no-contact' | 'failed' = 'skipped-no-contact';
  if (ghlContactId && activateShortUrl && activateUrl) {
    try {
      const { sendGhlSms } = await import('@/lib/ghl');
      const { buildSmsBody } = await import('@/lib/delivery');
      const smsBody = buildSmsBody(
        {
          title: course.title,
          checkoutAfterApply: course.checkoutAfterApply,
          isBundle: course.isBundle,
          welcomeSmsBody: course.welcomeSmsBody,
        },
        {
          firstName,
          customerName: userName || firstName,
          courseTitle: course.title,
          shortUrl: activateShortUrl,
          activateUrl,
        }
      );
      const result = await sendGhlSms(ghlContactId, smsBody);
      smsStatus = result.skipped ? 'skipped-non-prod' : 'sent';
      console.log('[grant-access] Magic-link SMS', { contactId: ghlContactId, status: smsStatus });
    } catch (err) {
      smsStatus = 'failed';
      console.error('[grant-access] SMS send failed (non-fatal)', {
        error: err instanceof Error ? err.message : err,
      });
    }
  } else {
    console.log('[grant-access] Skipping SMS', {
      hasGhlContact: !!ghlContactId,
      hasShortUrl: !!activateShortUrl,
    });
  }

  // 8. Mastermind callback so SentOffer rows flip to 'enrolled' (no-op
  // when there's no matching offer).
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
    newUser: needsPasswordSetup,
    ghlContactId,
    smsStatus,
    activateShortUrl,
  });
}
