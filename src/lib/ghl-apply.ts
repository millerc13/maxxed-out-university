/**
 * GHL helpers used by the on-platform /apply flow. Mirrors the
 * funnel repo's `src/lib/ghl.ts` so both repos behave identically:
 *  · upsertContact: idempotent — returns isNew for note routing
 *  · createContactNote: appends a note (whether contact is new or
 *    existing) so re-submissions are audit-trailed without duplicates
 *  · createOpportunity: optional, only fires when env is set
 *
 * Lives separately from this repo's existing `lib/ghl.ts` (which has
 * different concerns — tags, products, contact lookups for course
 * sync). Keep these in sync with `university-funnel/src/lib/ghl.ts`.
 */

import type { ApplicationPayload } from './apply-schema';

const BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

export class GhlDisabledError extends Error {
  constructor(
    message = 'GHL integration disabled — GHL_API_KEY or GHL_LOCATION_ID missing'
  ) {
    super(message);
    this.name = 'GhlDisabledError';
  }
}

export class GhlApiError extends Error {
  status: number;
  bodyExcerpt: string;
  constructor(status: number, bodyExcerpt: string, endpoint: string) {
    super(`GHL ${endpoint} failed (${status}): ${bodyExcerpt}`);
    this.name = 'GhlApiError';
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new GhlDisabledError(`${name} not set`);
  return v;
}

async function ghlFetch(
  path: string,
  init: RequestInit & { endpointLabel?: string } = {}
): Promise<Response> {
  const token = requireEnv('GHL_API_KEY');
  const { endpointLabel, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: API_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(rest.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GhlApiError(res.status, text.slice(0, 500), endpointLabel ?? path);
  }
  return res;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.slice(0, spaceIdx),
    lastName: trimmed.slice(spaceIdx + 1).trim(),
  };
}

function sourceSlug(heardAbout: string): string {
  return (
    'heard:' +
    heardAbout
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

function normalizePhone(input: string | undefined | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed === '') return '';
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return trimmed;
}

export type UpsertOpts = { partial?: boolean };

/**
 * Map a program slug → display label used in SMS bodies, GHL contact
 * source field, and note headers. Single source of truth so adding a
 * new funnel only needs one update here.
 */
const PROGRAM_LABELS: Record<string, string> = {
  'business-mentorship': 'Business Accelerator & Mentorship',
  donewithyou: 'Done With You',
  mentorship: '6-Month Mentorship',
  blueprint: 'Real Estate Empire Blueprint',
  accelerator: 'Business Accelerator',
};

function programLabel(program: string | null | undefined): string {
  if (!program) return 'University';
  return PROGRAM_LABELS[program] ?? 'University';
}

export async function upsertContact(
  payload: ApplicationPayload,
  opts: UpsertOpts & { assignedTo?: string } = {}
): Promise<{ id: string; isNew: boolean }> {
  const locationId = requireEnv('GHL_LOCATION_ID');
  const { firstName, lastName } = splitName(payload.name);

  const tags = [
    'applied',
    'source:apply',
    opts.partial ? 'incomplete-application' : 'completed-application',
  ];
  if (payload.program) tags.push(`program:${payload.program}`);
  if (payload.heardAbout) tags.push(sourceSlug(payload.heardAbout));

  const sourceLabel = payload.program
    ? `Maxxed Out University — ${programLabel(payload.program)}`
    : 'Maxxed Out University — Apply';

  const body: Record<string, unknown> = {
    locationId,
    firstName,
    lastName,
    email: payload.email,
    phone: normalizePhone(payload.phone),
    source: sourceLabel,
    tags,
  };
  if (payload.businessName && payload.businessName.trim() !== '') {
    body.companyName = payload.businessName;
  }
  if (payload.website && payload.website.trim() !== '') {
    body.website = payload.website;
  }
  if (opts.assignedTo) {
    body.assignedTo = opts.assignedTo;
  }

  const res = await ghlFetch('/contacts/upsert', {
    method: 'POST',
    body: JSON.stringify(body),
    endpointLabel: 'contacts.upsert',
  });

  const json = (await res.json()) as { contact?: { id: string }; new?: boolean };
  const id = json.contact?.id;
  if (!id) {
    throw new GhlApiError(
      200,
      `unexpected shape: ${JSON.stringify(json).slice(0, 300)}`,
      'contacts.upsert'
    );
  }
  return { id, isNew: json.new ?? false };
}

export function formatNoteBody(
  payload: ApplicationPayload,
  context?: { courseTitle?: string }
): string {
  const show = (v: string | undefined | null) =>
    v && String(v).trim() !== '' ? String(v) : '—';
  const bestTimes =
    payload.bestTimes && payload.bestTimes.length > 0
      ? payload.bestTimes.join(', ')
      : '—';
  const headerLabel = context?.courseTitle
    ? `University — ${context.courseTitle}`
    : payload.program
      ? programLabel(payload.program)
      : 'Apply (no program)';
  const now = new Date().toISOString();

  return [
    `New application — ${headerLabel}`,
    '',
    'Contact',
    `  Name: ${show(payload.name)}`,
    `  Email: ${show(payload.email)}`,
    `  Phone: ${show(payload.phone)}`,
    `  Business: ${show(payload.businessName)}`,
    payload.website ? `  Website: ${payload.website}` : null,
    '',
    'Real Estate Snapshot',
    `  Income: ${show(payload.revenue)}`,
    `  Team size: ${show(payload.teamSize)}`,
    `  Focus: ${show(payload.industry)}`,
    '',
    'Goals',
    `  Biggest bottleneck: ${show(payload.bottleneck)}`,
    `  12-month vision: ${show(payload.vision)}`,
    '',
    'Fit',
    `  Timeline: ${show(payload.commitment)}`,
    `  Preferred call times: ${bestTimes}`,
    `  Heard about us: ${show(payload.heardAbout)}`,
    '',
    `Submitted at: ${now}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export async function createContactNote(contactId: string, body: string): Promise<void> {
  await ghlFetch(`/contacts/${contactId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
    endpointLabel: 'contacts.notes.create',
  });
}

export async function createOpportunity(
  contactId: string,
  payload: ApplicationPayload,
  context?: { courseTitle?: string; assignedTo?: string }
): Promise<{ id: string }> {
  const locationId = requireEnv('GHL_LOCATION_ID');
  const pipelineId = requireEnv('GHL_PIPELINE_ID');
  const pipelineStageId = requireEnv('GHL_PIPELINE_STAGE_ID');

  const name =
    payload.businessName && payload.businessName.trim() !== ''
      ? `${payload.businessName} — ${payload.name}`
      : payload.name;

  const body: Record<string, unknown> = {
    locationId,
    pipelineId,
    pipelineStageId,
    contactId,
    name,
    status: 'open',
    source: context?.courseTitle
      ? `Maxxed Out University — ${context.courseTitle}`
      : payload.program
        ? `Maxxed Out University — ${payload.program}`
        : 'Maxxed Out University — Apply',
    monetaryValue: 0,
  };
  if (context?.assignedTo) {
    body.assignedTo = context.assignedTo;
  }

  const res = await ghlFetch('/opportunities/', {
    method: 'POST',
    body: JSON.stringify(body),
    endpointLabel: 'opportunities.create',
  });

  const json = (await res.json()) as { opportunity?: { id: string }; id?: string };
  const id = json.opportunity?.id ?? json.id;
  if (!id) {
    throw new GhlApiError(
      200,
      `unexpected shape: ${JSON.stringify(json).slice(0, 300)}`,
      'opportunities.create'
    );
  }
  return { id };
}
