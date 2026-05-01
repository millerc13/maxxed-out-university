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
        select: { title: true, notifyClosersOnApply: true },
      });
      if (c) {
        courseTitle = c.title;
        notifyClosers = c.notifyClosersOnApply;
      }
    } catch {
      /* ignore */
    }
  }

  console.log(
    `[apply] ${isPartial ? 'Partial' : 'Full'} submission — email=${data.email} course=${courseTitle ?? 'none'}`
  );

  try {
    const { id: contactId, isNew } = await upsertContact(data, { partial: isPartial });
    console.info(
      `[apply] ${isPartial ? 'Partial' : 'Full'} GHL contact ${
        isNew ? 'created' : 'updated'
      }: ${contactId}`
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
          const { id: opportunityId } = await createOpportunity(contactId, data, { courseTitle });
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

  // Lead-notification SMS — fans out to active recipients in the
  // NotificationRecipient table (admin-managed at /admin/notifications).
  // Body matches the GHL note exactly so closers see the same rich
  // breakdown they'd see if they opened the contact in GHL. Gated by the
  // per-course notifyClosersOnApply flag.
  if (!isPartial && notifyClosers) {
    const richNoteBody = formatNoteBody(data, { courseTitle });
    const smsBody = `New Maxxed Out application — ${data.name}\n\n${richNoteBody}`;
    notifyRecipients('lead', smsBody, 'university').catch((err) =>
      console.error('[apply] lead notification SMS fan-out failed', err)
    );
  } else if (!isPartial && !notifyClosers) {
    console.info(
      `[apply] notifyClosersOnApply=false for course "${courseTitle ?? 'unknown'}" — skipping SMS notifications`
    );
  }

  return NextResponse.json({ ok: true, kind: isPartial ? 'partial' : 'full' });
}
