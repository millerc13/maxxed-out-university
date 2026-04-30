// Generates an Excel workbook of 6-Month Mentorship students for the scheduler.
// Two clearly-distinguished groups: PAID (need scheduling now) and INTERESTED (no payment yet).
//
// Usage: npx tsx scripts/generate-mentorship-scheduling-xlsx.ts
// Output: mentorship-students-scheduling.xlsx (in repo root)

import ExcelJS from 'exceljs';
import path from 'path';

interface Row {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  amountPaid: number; // dollars
  notes?: string;
}

const PAID: Row[] = [
  { firstName: 'Michelle', lastName: 'Beal',     phone: '+1 937-520-3198', email: 'info@purposedrivenhomes.org',          amountPaid: 10000 },
  { firstName: 'Amy',      lastName: 'Buchanan', phone: '+1 513-465-1379', email: 'amybplumtree@gmail.com',               amountPaid: 10000 },
  { firstName: 'Brian',    lastName: 'Johnson',  phone: '+1 443-597-9308', email: 'brianjohnson@flowsoftwashplus.com',    amountPaid: 10000, notes: 'Paid in 2 installments ($4k + $6k)' },
  { firstName: 'Rex',      lastName: 'Bonham',   phone: '+1 937-307-6321', email: 'bonhamrex@gmail.com',                  amountPaid: 10000 },
];

const INTERESTED: Row[] = [
  { firstName: 'Lucas',     lastName: 'Glandon', phone: '', email: 'lucasqueenglandon@gmail.com', amountPaid: 0 },
  { firstName: 'Alejandro', lastName: 'Valdez',  phone: '', email: 'hondovaldez363@gmail.com',    amountPaid: 0 },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Maxxed Out University';
  wb.created = new Date();

  const ws = wb.addWorksheet('Mentorship Students');

  ws.columns = [
    { header: 'Status',     key: 'status',     width: 14 },
    { header: 'First Name', key: 'firstName',  width: 14 },
    { header: 'Last Name',  key: 'lastName',   width: 14 },
    { header: 'Phone',      key: 'phone',      width: 18 },
    { header: 'Email',      key: 'email',      width: 38 },
    { header: 'Amount Paid', key: 'amountPaid', width: 14 },
    { header: 'Notes',      key: 'notes',      width: 36 },
  ];

  // header style
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  header.alignment = { vertical: 'middle', horizontal: 'left' };
  header.height = 22;

  const PAID_FILL  = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD1FAE5' } }; // green-100
  const INTEREST_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFEF3C7' } }; // amber-100

  function pushRows(rows: Row[], status: 'PAID' | 'INTERESTED') {
    for (const r of rows) {
      const row = ws.addRow({
        status,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone || '—',
        email: r.email,
        amountPaid: r.amountPaid,
        notes: r.notes || (status === 'INTERESTED' ? 'Has not paid yet — interested only' : ''),
      });

      const fill = status === 'PAID' ? PAID_FILL : INTEREST_FILL;
      row.eachCell((cell) => {
        cell.fill = fill;
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });

      // Status column bold
      row.getCell('status').font = {
        bold: true,
        color: { argb: status === 'PAID' ? 'FF065F46' : 'FF92400E' },
      };
      // Currency format
      row.getCell('amountPaid').numFmt = '"$"#,##0.00';
    }
  }

  pushRows(PAID, 'PAID');
  pushRows(INTERESTED, 'INTERESTED');

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: 'G1' };

  const outPath = path.resolve('mentorship-students-scheduling.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Wrote ' + outPath);
  console.log('  PAID:       ' + PAID.length);
  console.log('  INTERESTED: ' + INTERESTED.length);
}

main().catch((err) => { console.error(err); process.exit(1); });
