import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesTrackerSession } from '@/lib/sales-tracker-auth';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Trivial RFC-4180 CSV splitter: handles quoted fields and embedded
// commas. Sufficient for the export format we generate; commercial
// CSVs (Excel/Sheets) also fit this profile.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseTri(s: string): 'YES' | 'NO' | 'PENDING' | null {
  const t = s.trim().toLowerCase();
  if (t === 'yes' || t === 'y' || t === 'true') return 'YES';
  if (t === 'no' || t === 'n' || t === 'false') return 'NO';
  if (t === 'pending') return 'PENDING';
  return null;
}

function parseDollarsToCents(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function parsePercentToRate(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  // If value > 1, treat as percentage (e.g. "10.00" → 0.10).
  return n > 1 ? n / 100 : n;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const HEADER_ALIASES: Record<string, string> = {
  section: 'tag',
  tag: 'tag',
  category: 'tag',
  name: 'name',
  email: 'email',
  phone: 'phone',
  'phone number': 'phone',
  date: 'contactDate',
  'contact date': 'contactDate',
  time: 'contactTime',
  'contact time': 'contactTime',
  showed: 'didShow',
  'showed?': 'didShow',
  'did the prospect show?': 'didShow',
  closed: 'didClose',
  'closed?': 'didClose',
  'close?': 'didClose',
  amount: 'dealAmountCents',
  'deal amount': 'dealAmountCents',
  'commission %': 'commissionRate',
  commission: 'commissionAmountCents',
  'my commission': 'commissionAmountCents',
  'comm. due': 'commissionDue',
  'pay date': 'commissionDue',
  'paid?': 'commissionPaid',
  'got paid?': 'commissionPaid',
  notes: 'notes',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSalesTrackerSession();
  if (!session) return notFound();

  const { id } = await params;
  const sessionRow = await prisma.salesTrackerSession.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!sessionRow) return notFound();

  const formData = await request.formData();
  const file = formData.get('file');
  const fallbackTag = formData.get('fallbackTag');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '`file` is required' }, { status: 400 });
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: 'CSV needs a header row plus at least one data row' },
      { status: 400 }
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colMap: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) {
    const key = HEADER_ALIASES[header[i]];
    if (key) colMap[key] = i;
  }
  if (!('name' in colMap)) {
    return NextResponse.json(
      { error: 'CSV must have at least a "Name" column' },
      { status: 400 }
    );
  }

  const startPosition = await prisma.salesTrackerEntry.count({
    where: { sessionId: id },
  });

  const get = (row: string[], key: string): string => {
    const idx = colMap[key];
    return idx == null ? '' : row[idx]?.trim() ?? '';
  };

  let added = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = get(row, 'name');
    if (!name && !get(row, 'email') && !get(row, 'phone')) continue;

    await prisma.salesTrackerEntry.create({
      data: {
        sessionId: id,
        position: startPosition + added,
        tag: get(row, 'tag') || (typeof fallbackTag === 'string' ? fallbackTag : null) || null,
        name: name || null,
        email: get(row, 'email') || null,
        phone: get(row, 'phone') || null,
        contactDate: parseDate(get(row, 'contactDate')),
        contactTime: get(row, 'contactTime') || null,
        didShow: parseTri(get(row, 'didShow')),
        didClose: parseTri(get(row, 'didClose')),
        dealAmountCents: parseDollarsToCents(get(row, 'dealAmountCents')),
        commissionRate: parsePercentToRate(get(row, 'commissionRate')),
        commissionAmountCents: parseDollarsToCents(get(row, 'commissionAmountCents')),
        commissionDue: parseDate(get(row, 'commissionDue')),
        commissionPaid:
          parseTri(get(row, 'commissionPaid')) === 'YES' ? true : false,
        notes: get(row, 'notes') || null,
      },
    });
    added++;
  }

  return NextResponse.json({ added });
}
