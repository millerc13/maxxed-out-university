import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listRecordings, enableRecordingSharing } from '@/lib/posthog';
import { can } from '@/lib/permissions';

// Read-only funnel session recordings — any staff role may view.
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !can(session.user.role, 'admin:access')) return null;
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const funnel = await prisma.funnelDeployment.findUnique({
    where: { id },
    select: { subdomain: true },
  });
  if (!funnel || !funnel.subdomain) {
    return NextResponse.json({ error: 'Not found or no subdomain' }, { status: 404 });
  }

  const data = await listRecordings(funnel.subdomain);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recordingId } = await request.json();
  if (!recordingId) {
    return NextResponse.json({ error: 'recordingId required' }, { status: 400 });
  }

  const accessToken = await enableRecordingSharing(recordingId);
  if (!accessToken) {
    return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 });
  }

  return NextResponse.json({
    embedUrl: `https://us.posthog.com/shared/${accessToken}`,
  });
}
