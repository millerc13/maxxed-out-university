import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/users/search?q=<query>
// Lightweight typeahead for the Compose modal — searches name + email
// (case-insensitive, contains). Returns up to 8 matches so the dropdown
// stays scannable. Admin-only.
export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, email: true, name: true, role: true, phone: true },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ users });
}
