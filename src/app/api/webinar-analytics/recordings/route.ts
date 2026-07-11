import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listRecordings, enableRecordingSharing } from '@/lib/posthog';
import { can } from '@/lib/permissions';

// Webinar-funnel session recordings — same PostHog project as the course
// funnels; webinar sessions are isolated by the funnel's host in $current_url
// (the webinar app only initializes PostHog on public funnel pages, never in
// its admin or the bot player). Read-only; any staff role may view.
async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || !can(session.user.role, 'admin:access')) return null;
  return session;
}

const WEBINAR_HOST = 'webinar.maxxedout.com';

export async function GET() {
  if (!await requireStaff()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await listRecordings(WEBINAR_HOST, 20);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireStaff()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recordingId } = await request.json();
  if (!recordingId || typeof recordingId !== 'string') {
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
