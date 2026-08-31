import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_CAPABILITIES } from '@/lib/permissions';
import { createMagicLink } from '@/lib/magiclink';
import { sendMagicLinkEmail } from '@/lib/resend';
import bcrypt from 'bcryptjs';

const VALID_ROLES = Object.keys(ROLE_CAPABILITIES);

/**
 * POST /api/admin/users — create a user from the admin Users screen.
 *
 * Body: { email, name?, phone?, role, password?, sendInvite? }
 * - `password` (optional): temp password, min 8 chars; the account is
 *   flagged mustChangePassword so they set their own on first login.
 * - `sendInvite` (optional): emails a magic "set up your account" link,
 *   so a password isn't required at all.
 *
 * ADMIN only — same gate as role changes and deletes.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim() || null;
    const phone = String(body.phone ?? '').trim() || null;
    const role = String(body.role ?? 'STUDENT').toUpperCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const sendInvite = body.sendInvite === true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (password && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        role: role as keyof typeof ROLE_CAPABILITIES,
        // Whether they arrive via temp password or invite link, the
        // first thing a created account does is set its own password.
        mustChangePassword: true,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });

    // Optional invite email — non-fatal if the mail provider hiccups;
    // the account exists either way and a magic link can be re-sent
    // from the user detail page.
    let inviteSent = false;
    if (sendInvite) {
      try {
        const ml = await createMagicLink(user.id);
        await sendMagicLinkEmail({
          to: email,
          name: name ?? email,
          token: ml.token,
          courseName: 'Maxxed Out University',
          subjectOverride: 'Your Maxxed Out University account is ready',
          bodyOverride:
            'An account has been created for you on Maxxed Out University. Click below to activate it and set your password.',
        });
        inviteSent = true;
      } catch (err) {
        console.error('[admin/users] invite email failed', {
          userId: user.id,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      inviteSent,
    });
  } catch (error) {
    console.error('[admin/users] create failed', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
