import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Internal endpoint — called by mastermind /stage-offers when an admin
 * clicks "Send checkout link". Mints a short token + stores the prefill
 * data, returns a `https://university.maxxedout.com/c/<token>` URL.
 *
 * Auth: shared MAXXED_INTERNAL_WEBHOOK_SECRET header — same secret that
 * gates the mastermind enrollment callback.
 */

const bodySchema = z.object({
  courseId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  promoCode: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  sentOfferId: z.string().optional(),
  createdByEmail: z.string().email().optional(),
});

/**
 * 6-char URL-safe alphanumeric token. ~57B combinations — collisions on a single
 * lookup are negligible, and we retry on collision below anyway.
 */
function generateToken(): string {
  // Generate slightly more bytes than we need, strip - and _ from base64url, slice to 6.
  const raw = randomBytes(8).toString('base64url').replace(/[-_]/g, '');
  if (raw.length >= 6) return raw.slice(0, 6);
  // Vanishingly rare fallback: pure hex if base64url stripped too many chars.
  return randomBytes(4).toString('hex').slice(0, 6);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MAXXED_INTERNAL_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[checkout-links] MAXXED_INTERNAL_WEBHOOK_SECRET not configured');
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
      {
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 }
    );
  }

  // Verify the course exists + has a price
  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, slug: true, title: true, price: true, published: true },
  });
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
  if (!course.price || course.price <= 0) {
    return NextResponse.json({ error: 'Course has no price' }, { status: 400 });
  }

  // Generate a unique token (retry up to 5 times on the off chance of collision)
  let token: string | null = null;
  for (let i = 0; i < 5; i++) {
    const candidate = generateToken();
    const existing = await prisma.checkoutLink.findUnique({ where: { token: candidate } });
    if (!existing) {
      token = candidate;
      break;
    }
  }
  if (!token) {
    console.error('[checkout-links] Failed to generate unique token after 5 tries');
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }

  const link = await prisma.checkoutLink.create({
    data: {
      token,
      courseId: parsed.data.courseId,
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      phone: parsed.data.phone ?? null,
      promoCode: parsed.data.promoCode ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      sentOfferId: parsed.data.sentOfferId ?? null,
      createdByEmail: parsed.data.createdByEmail ?? null,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://university.maxxedout.com';
  const shortUrl = `${baseUrl}/c/${link.token}`;

  console.log('[checkout-links] Minted', { token: link.token, courseId: link.courseId, email: link.email });

  return NextResponse.json({
    id: link.id,
    token: link.token,
    shortUrl,
  });
}
