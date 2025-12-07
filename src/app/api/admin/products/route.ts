import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as any).role;
  if (role !== 'ADMIN') return null;
  return session;
}

// POST - Create product mapping
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ghlProductId, ghlProductName, courseId, grantAll } = body;

    if (!ghlProductId) {
      return NextResponse.json(
        { error: 'GHL Product ID is required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const existing = await prisma.productMapping.findUnique({
      where: { ghlProductId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A mapping for this product ID already exists' },
        { status: 400 }
      );
    }

    const mapping = await prisma.productMapping.create({
      data: {
        ghlProductId,
        ghlProductName,
        courseId,
        grantAll: grantAll ?? false,
        active: true,
      },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error('Create product mapping error:', error);
    return NextResponse.json(
      { error: 'Failed to create product mapping' },
      { status: 500 }
    );
  }
}
