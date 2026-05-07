import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Whitelist of fields the client can patch. Anything else gets dropped.
type PatchableField =
  | 'tag'
  | 'name'
  | 'email'
  | 'phone'
  | 'contactDate'
  | 'contactTime'
  | 'didShow'
  | 'didClose'
  | 'dealAmountCents'
  | 'commissionRate'
  | 'commissionAmountCents'
  | 'commissionDue'
  | 'commissionPaid'
  | 'notes';

const STRING_FIELDS: PatchableField[] = [
  'tag',
  'name',
  'email',
  'phone',
  'contactTime',
  'notes',
];
const TRI_STATE_FIELDS: PatchableField[] = ['didShow', 'didClose'];
const DATE_FIELDS: PatchableField[] = ['contactDate', 'commissionDue'];
const INT_FIELDS: PatchableField[] = [
  'dealAmountCents',
  'commissionAmountCents',
];
const DECIMAL_FIELDS: PatchableField[] = ['commissionRate'];
const BOOL_FIELDS: PatchableField[] = ['commissionPaid'];

function coerce(field: PatchableField, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;

  if (STRING_FIELDS.includes(field)) {
    return typeof value === 'string' ? value : null;
  }
  if (TRI_STATE_FIELDS.includes(field)) {
    if (value === 'YES' || value === 'NO' || value === 'PENDING') return value;
    return null;
  }
  if (DATE_FIELDS.includes(field)) {
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (INT_FIELDS.includes(field)) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  if (DECIMAL_FIELDS.includes(field)) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (BOOL_FIELDS.includes(field)) {
    return Boolean(value);
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const allowed: PatchableField[] = [
    ...STRING_FIELDS,
    ...TRI_STATE_FIELDS,
    ...DATE_FIELDS,
    ...INT_FIELDS,
    ...DECIMAL_FIELDS,
    ...BOOL_FIELDS,
  ];
  for (const key of allowed) {
    if (key in body) data[key] = coerce(key, (body as Record<string, unknown>)[key]);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.salesTrackerEntry.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      entry: {
        ...updated,
        commissionRate: updated.commissionRate
          ? Number(updated.commissionRate)
          : null,
      },
    });
  } catch {
    return notFound();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  try {
    await prisma.salesTrackerEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return notFound();
  }
}
