import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyRecipients } from '@/lib/sms';
import { formatNoteBody } from '@/lib/ghl-apply';
import { applicationSchema } from '@/lib/apply-schema';
import { sendCapiEvent } from '@/lib/meta-capi';

export const runtime = 'nodejs';

/**
 * Public lead-notification endpoint, called server-to-server by the
 * university-funnel repo's `/api/apply` route after a successful
 * application submission. Fans out a rich SMS to every active
 * recipient that's subscribed to the submission's `source`.
 *
 * Auth: `x-funnel-api-key` header must match an active funnel deployment's
 * apiKey. Same auth pattern as `/api/funnel/config`.
 *
 * Body (preferred): {
 *   source: 'blueprint' | 'mentorship' | 'donewithyou' | 'university',
 *   applicantName: string,
 *   noteBody?: string,           // pre-formatted note body (optional)
 *   payload?: ApplicationPayload, // raw form data (server formats note)
 *   courseId?: string,
 *   courseTitle?: string
 * }
 *
 * Either `noteBody` (pre-formatted) or `payload` (raw form data, server
 * formats with formatNoteBody) is required so the SMS body matches what
 * was appended to the GHL contact note.
 *
 * Source-level filtering: recipients with empty `sources` receive ALL.
 * Non-empty must include the request's source.
 *
 * Course-level gating: if courseId points to a course with
 * `notifyClosersOnApply = false`, no SMS goes out.
 */
export async function POST(request: NextRequest) {
  // Auth — match the API key against any active funnel deployment.
  const apiKey = request.headers.get('x-funnel-api-key')?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing x-funnel-api-key' }, { status: 401 });
  }
  const funnel = await prisma.funnelDeployment.findFirst({
    where: { apiKey, active: true },
    select: {
      id: true,
      name: true,
      subdomain: true,
      // Pull the funnel's linked Course (for CAPI Lead firing).
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          price: true,
          metaPixelId: true,
          metaCapiAccessToken: true,
          metaTestEventCode: true,
        },
      },
    },
  });
  if (!funnel) {
    return NextResponse.json({ error: 'Invalid api key' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    source,
    applicantName,
    noteBody: providedNoteBody,
    payload,
    courseId,
    courseTitle: providedTitle,
    // Optional Meta CAPI bag — funnel passes these so we can fire a
    // server-side `Lead` event for ad attribution. If absent we still
    // do the SMS fan-out but skip the CAPI call.
    metaUserData,
  } = body || {};

  if (!source) {
    return NextResponse.json({ error: 'source is required' }, { status: 400 });
  }
  if (!applicantName) {
    return NextResponse.json({ error: 'applicantName is required' }, { status: 400 });
  }

  // Optional course-level gate.
  let courseTitle: string | undefined = providedTitle?.toString().trim() || undefined;
  if (courseId) {
    try {
      const c = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, notifyClosersOnApply: true },
      });
      if (c) {
        courseTitle = courseTitle || c.title;
        if (!c.notifyClosersOnApply) {
          console.info(
            `[notify-lead] notifyClosersOnApply=false for course "${c.title}" — skipping SMS (source: ${source})`
          );
          return NextResponse.json({ ok: true, sent: 0, skipped: 'course_toggle_off' });
        }
      }
    } catch {
      /* lookup failure doesn't block the SMS */
    }
  }

  // Build the SMS body. Prefer caller-supplied noteBody so we send
  // exactly what was appended to the contact's GHL note.
  let noteBody: string = providedNoteBody?.toString() || '';
  if (!noteBody && payload) {
    const parsed = applicationSchema.safeParse(payload);
    if (parsed.success) {
      noteBody = formatNoteBody(parsed.data, { courseTitle });
    }
  }
  if (!noteBody) {
    noteBody = '(no note body provided)';
  }

  // Header line matches the format Todd showed:
  //   "New Maxxed Out application — {Name}\n\n{noteBody}"
  const smsBody = `New Maxxed Out application — ${applicantName}\n\n${noteBody}`;

  const results = await notifyRecipients('lead', smsBody, source);
  const sent = results.filter((r) => r.ok).length;

  // Server-side Meta CAPI Lead — fired for the funnel's linked course.
  // No-op when the course has no Pixel configured. Browser-side Lead
  // fires from the funnel's ApplyWizard concurrently; Meta's secondary
  // dedup catches duplicates via shared user_data.
  if (funnel.course?.metaPixelId && payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    const email = typeof p.email === 'string' ? p.email : undefined;
    const phone = typeof p.phone === 'string' ? p.phone : undefined;
    const name = typeof p.name === 'string' ? p.name : '';
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const lastName = rest.join(' ');
    const m = (metaUserData ?? {}) as Record<string, string | undefined>;
    sendCapiEvent({
      pixelId: funnel.course.metaPixelId,
      accessToken: funnel.course.metaCapiAccessToken,
      testEventCode: funnel.course.metaTestEventCode,
      eventName: 'Lead',
      eventId: `lead_${email ?? applicantName}_${Date.now()}`,
      eventSourceUrl: m.sourceUrl,
      userData: {
        email,
        phone,
        firstName,
        lastName,
        clientIp: m.clientIp,
        userAgent: m.userAgent,
        fbp: m.fbp,
        fbc: m.fbc,
      },
      customData: {
        value: funnel.course.price ? funnel.course.price / 100 : undefined,
        currency: funnel.course.price ? 'USD' : undefined,
        content_ids: [funnel.course.slug],
        content_name: funnel.course.title,
        content_category: 'application',
      },
    }).then((r) => {
      if (!r.ok && !('skipped' in r)) {
        console.warn('[notify-lead] Meta CAPI Lead failed:', r.error);
      }
    });
  }

  return NextResponse.json({
    ok: true,
    sent,
    total: results.length,
    source,
    funnel: funnel.name,
  });
}
