import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applicationSchema, type ApplicationPayload } from '@/lib/apply-schema';
import {
  upsertContact,
  createContactNote,
  createOpportunity,
  formatNoteBody,
  GhlApiError,
  GhlDisabledError,
} from '@/lib/ghl-apply';
import { notifyRecipients } from '@/lib/sms';
import { sendCapiEvent, extractMetaIdentifiers } from '@/lib/meta-capi';
import { pickAssignee } from '@/lib/ghl-assignment';
import { notifySlackChannels } from '@/lib/slack';
import { getSettingBool } from '@/lib/settings';

export const runtime = 'nodejs';

/**
 * On-platform `/apply/[slug]` submit handler.
 *
 * Mirrors `university-funnel/src/app/api/apply/route.ts` semantically:
 *  · Validates payload against the shared applicationSchema
 *  · Upserts the GHL contact (idempotent — existing contacts get
 *    updated, never duplicated). Returns isNew so the caller can
 *    branch if needed.
 *  · For full submissions: appends a note to the contact (whether
 *    the contact is new or pre-existing — that's the "append to
 *    notes if lead exists" behavior the user asked for) and creates
 *    an opportunity if the GHL_PIPELINE env vars are set.
 *  · Partial submissions (step-1 abandoned-lead capture) skip notes
 *    and opportunities to avoid noise.
 *
 * Never throws on GHL failures so a transient outage doesn't break
 * the user's submit experience — the response always returns ok=true
 * once validation passes.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const data: ApplicationPayload = {
    ...parsed.data,
    program: parsed.data.program ?? 'university',
  };
  const isPartial = data.partial === true;

  // Look up the linked course (for note context, opportunity gating,
  // and the optional later checkout step). Best-effort — failures here
  // don't block the GHL flow.
  let courseTitle: string | undefined;
  let courseSlug: string | undefined;
  let coursePriceCents: number | null = null;
  let metaPixelId: string | null = null;
  let metaCapiAccessToken: string | null = null;
  let metaTestEventCode: string | null = null;
  // Default true: legacy courses without the column read as true so we
  // don't silently drop opportunity creation when the lookup fails or
  // the course isn't found.
  let notifyClosers = true;
  const courseSelector = data.courseId
    ? { id: data.courseId }
    : data.courseSlug
      ? { slug: data.courseSlug }
      : null;
  if (courseSelector) {
    try {
      const c = await prisma.course.findUnique({
        where: courseSelector,
        select: {
          title: true,
          slug: true,
          price: true,
          notifyClosersOnApply: true,
          metaPixelId: true,
          metaCapiAccessToken: true,
          metaTestEventCode: true,
        },
      });
      if (c) {
        courseTitle = c.title;
        courseSlug = c.slug;
        coursePriceCents = c.price;
        notifyClosers = c.notifyClosersOnApply;
        metaPixelId = c.metaPixelId;
        metaCapiAccessToken = c.metaCapiAccessToken;
        metaTestEventCode = c.metaTestEventCode;
      }
    } catch {
      /* ignore */
    }
  }

  console.log(
    `[apply] ${isPartial ? 'Partial' : 'Full'} submission — email=${data.email} course=${courseTitle ?? 'none'}`
  );

  // Pick the GHL user this submission gets assigned to. Default funnels
  // → Rebecca; dd-healthcare alternates Rebecca/Rafael. Returns null
  // when no env-var IDs are configured (system stays unassigned just
  // like the old Netlify functions did).
  const assignedTo = !isPartial ? await pickAssignee(data.program ?? null) : null;

  let resolvedContactId: string | null = null;
  try {
    const { id: contactId, isNew } = await upsertContact(data, {
      partial: isPartial,
      assignedTo: assignedTo ?? undefined,
    });
    resolvedContactId = contactId;
    console.info(
      `[apply] ${isPartial ? 'Partial' : 'Full'} GHL contact ${
        isNew ? 'created' : 'updated'
      }: ${contactId}${assignedTo ? ` (assignedTo=${assignedTo})` : ''}`
    );

    if (!isPartial) {
      // Always append a note — whether the contact is new or already
      // existed in GHL. This is the "if lead already exists, append to
      // notes" behavior we want.
      createContactNote(contactId, formatNoteBody(data, { courseTitle })).catch((err) =>
        console.error('[apply] GHL note failed', err)
      );

      // Opportunity creation is what triggers the closer-notify webhook
      // in GHL. Skip when the course has notifyClosersOnApply=false
      // (testing/QA mode). The lead + note still land in GHL so the
      // submission is captured — only the closer fan-out is skipped.
      if (
        notifyClosers &&
        process.env.GHL_PIPELINE_ID &&
        process.env.GHL_PIPELINE_STAGE_ID
      ) {
        try {
          const { id: opportunityId } = await createOpportunity(contactId, data, {
            courseTitle,
            assignedTo: assignedTo ?? undefined,
          });
          console.info(`[apply] GHL opportunity created: ${opportunityId}`);
        } catch (oppErr) {
          if (
            oppErr instanceof GhlApiError &&
            oppErr.status === 400 &&
            /duplicate opportunity/i.test(oppErr.bodyExcerpt)
          ) {
            console.info('[apply] GHL: applicant already has an open opportunity — keeping existing');
          } else {
            console.error('[apply] GHL opportunity failed', oppErr);
          }
        }
      } else if (!notifyClosers) {
        console.info(
          `[apply] notifyClosersOnApply=false for course "${courseTitle ?? 'unknown'}" — skipping opportunity (closers will NOT be notified)`
        );
      }
    }
  } catch (err) {
    if (err instanceof GhlDisabledError) {
      console.warn(`[apply] GHL disabled: ${err.message}`);
    } else {
      console.error('[apply] GHL sync failed', err);
    }
  }

  // Persist the Application row on full submissions. Idempotent on
  // (email, courseId) — re-submitting from the same email + course
  // updates the same row. Drives:
  //   · /apply/[slug] redirect-out (already-applied users get sent
  //     to the course page success state instead of seeing the form
  //     again)
  //   · the "Application submitted" success state on /courses/[slug]
  if (!isPartial && data.courseId) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      // Strip the partial flag from payload — only store the answers.
      // Casting to satisfy Prisma's JSON input type.
      const payload = (() => {
        const { partial: _p, courseId: _c, courseSlug: _cs, program: _pr, name: _n, email: _e, phone: _ph, ...rest } = data;
        return rest as unknown as Record<string, unknown>;
      })();
      await prisma.application.upsert({
        where: { email_courseId: { email: data.email, courseId: data.courseId } },
        create: {
          email: data.email,
          name: data.name ?? null,
          phone: data.phone ?? null,
          courseId: data.courseId,
          source: data.program ?? 'university',
          payload: payload as never,
          ghlContactId: resolvedContactId,
          userId: existingUser?.id ?? null,
          assignedToId: assignedTo ?? null,
        },
        update: {
          name: data.name ?? undefined,
          phone: data.phone ?? undefined,
          source: data.program ?? undefined,
          payload: payload as never,
          ghlContactId: resolvedContactId ?? undefined,
          userId: existingUser?.id ?? undefined,
          // Only set assignee if we computed one (i.e., not a partial submit).
          // Don't overwrite an existing assignment with null on re-apply.
          ...(assignedTo ? { assignedToId: assignedTo } : {}),
        },
      });
      console.info(`[apply] Application row upserted for email=${data.email} courseId=${data.courseId}`);
    } catch (err) {
      console.error('[apply] Failed to persist Application row (non-fatal)', err);
    }
  }

  // Lead-notification SMS — fans out to active recipients in the
  // NotificationRecipient table (admin-managed at /admin/notifications).
  // Body matches the GHL note exactly so closers see the same rich
  // breakdown they'd see if they opened the contact in GHL. Gated by the
  // per-course notifyClosersOnApply flag AND the global
  // internalNotificationsEnabled Setting (flippable from /admin/notifications).
  const internalNotificationsEnabled = await getSettingBool('internalNotificationsEnabled', true);
  if (!isPartial && notifyClosers && !internalNotificationsEnabled) {
    console.log('[apply] internalNotificationsEnabled=false — skipping SMS+Slack');
  }
  if (!isPartial && notifyClosers && internalNotificationsEnabled) {
    const richNoteBody = formatNoteBody(data, { courseTitle });
    const smsBody = `New Maxxed Out application — ${data.name}\n\n${richNoteBody}`;
    notifyRecipients('lead', smsBody, 'university').catch((err) =>
      console.error('[apply] lead notification SMS fan-out failed', err)
    );

    // Slack fan-out — same source slug as SMS so per-funnel channels
    // route correctly. Fire-and-forget, fully independent of SMS so a
    // Slack outage doesn't block lead capture. Minimal payload — name,
    // email, phone, assigned closer + a deep link to the GHL contact;
    // closers open GHL for the full qualifying answers.
    notifySlackChannels('lead', data.program ?? 'university', {
      headline: `New ${courseTitle ?? 'Maxxed Out'} application`,
      contactName: data.name,
      email: data.email,
      phone: data.phone,
      assignedTo: assignedTo === process.env.GHL_USER_REBECCA_ID
        ? 'Rebecca'
        : assignedTo === process.env.GHL_USER_RAFAEL_ID
          ? 'Rafael'
          : undefined,
      link: resolvedContactId
        ? {
            url: `https://app.gohighlevel.com/v2/location/${process.env.GHL_LOCATION_ID}/contacts/detail/${resolvedContactId}`,
            label: 'Open in GHL',
          }
        : undefined,
    }).catch((err) => console.error('[apply] Slack lead fan-out failed', err));
  } else if (!isPartial && !notifyClosers) {
    console.info(
      `[apply] notifyClosersOnApply=false for course "${courseTitle ?? 'unknown'}" — skipping SMS notifications`
    );
  }

  // Server-side Meta CAPI mirror of the browser `Lead` event. Only
  // fires when the course has a Pixel ID configured. event_id is
  // generated server-side here — the browser uses its own (we don't
  // share an event_id between them for Lead because the browser fires
  // before the response lands and the two arrive within seconds, which
  // Meta's dedup window typically catches via the user_data hash
  // matching). The event still helps recover iOS / ad-blocker traffic.
  if (!isPartial && metaPixelId) {
    const referer = request.headers.get('referer') ?? undefined;
    const refererUrl = referer ? (() => {
      try { return new URL(referer); } catch { return null; }
    })() : null;
    const meta = extractMetaIdentifiers(
      request.headers as unknown as Headers,
      refererUrl?.searchParams,
    );
    const [firstName, ...rest] = (data.name ?? '').trim().split(/\s+/);
    const lastName = rest.join(' ');
    sendCapiEvent({
      pixelId: metaPixelId,
      accessToken: metaCapiAccessToken,
      testEventCode: metaTestEventCode,
      eventName: 'Lead',
      eventId: `lead_${data.email}_${Date.now()}`,
      eventSourceUrl: referer,
      userData: {
        email: data.email,
        phone: data.phone,
        firstName,
        lastName,
        clientIp: meta.clientIp,
        userAgent: meta.userAgent,
        fbp: meta.fbp,
        fbc: meta.fbc,
      },
      customData: {
        value: coursePriceCents ? coursePriceCents / 100 : undefined,
        currency: coursePriceCents ? 'USD' : undefined,
        content_ids: courseSlug ? [courseSlug] : undefined,
        content_name: courseTitle,
        content_category: 'application',
      },
    }).then((r) => {
      if (!r.ok && !('skipped' in r)) {
        console.warn('[apply] Meta CAPI Lead failed:', r.error);
      }
    });
  }

  return NextResponse.json({ ok: true, kind: isPartial ? 'partial' : 'full' });
}
