import ExcelJS from 'exceljs';
import type { ExportPayload } from '@/components/tools/ExportableToolShell';
import { downloadBlob } from './download';

const BRAND_COLOR = '0000CC';
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_COLOR}` } };
const SECTION_FONT = { bold: true, color: { argb: `FF${BRAND_COLOR}` }, size: 11 };

const LOGO_URL = 'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png';

async function loadLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(LOGO_URL);
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function exportExcel(payload: ExportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Maxxed Out University';
  workbook.created = new Date();

  const ws = workbook.addWorksheet(payload.title.slice(0, 31));

  // Add logo
  const logoBuffer = await loadLogoBuffer();
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
      ws.addImage(imageId, {
        tl: { col: 3.5, row: 0 },
        ext: { width: 160, height: 63 },
      });
    } catch { /* skip if image fails */ }
  }

  // Title row
  ws.mergeCells('A1:D1');
  const titleCell = ws.getCell('A1');
  titleCell.value = payload.title;
  titleCell.font = { bold: true, size: 14, color: { argb: `FF${BRAND_COLOR}` } };
  titleCell.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Date
  ws.mergeCells('A2:D2');
  const dateCell = ws.getCell('A2');
  dateCell.value = `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  dateCell.font = { size: 8, color: { argb: 'FF888888' } };

  let row = 4;

  for (const section of payload.sections) {
    // Section heading
    ws.mergeCells(`A${row}:D${row}`);
    const headCell = ws.getCell(`A${row}`);
    headCell.value = section.heading;
    headCell.font = SECTION_FONT;
    row += 1;

    // Key-value rows
    if (section.rows && section.rows.length > 0) {
      for (const kv of section.rows) {
        ws.getCell(`A${row}`).value = kv.label;
        ws.getCell(`A${row}`).font = { bold: true, size: 10 };
        ws.getCell(`B${row}`).value = kv.value;
        ws.getCell(`B${row}`).font = { size: 10 };
        ws.getCell(`B${row}`).alignment = { horizontal: 'right' };
        row++;
      }
      row++; // spacer
    }

    // Table data
    if (section.table) {
      const headers = section.table.headers;
      headers.forEach((h, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = h;
        cell.font = HEADER_FONT;
        cell.fill = HEADER_FILL;
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: `FF${BRAND_COLOR}` } },
        };
      });
      row++;

      for (const dataRow of section.table.rows) {
        dataRow.forEach((val, i) => {
          const cell = ws.getCell(row, i + 1);
          cell.value = val;
          cell.font = { size: 10 };
        });
        row++;
      }
      row++; // spacer
    }

    // Checklist items
    if (section.checkItems && section.checkItems.length > 0) {
      for (const item of section.checkItems) {
        ws.getCell(`A${row}`).value = item.checked ? '\u2611' : '\u2610';
        ws.getCell(`B${row}`).value = item.label;
        ws.getCell(`B${row}`).font = { size: 10 };
        row++;
      }
      row++;
    }

    // Paragraphs
    if (section.paragraphs && section.paragraphs.length > 0) {
      for (const p of section.paragraphs) {
        ws.mergeCells(`A${row}:D${row}`);
        ws.getCell(`A${row}`).value = p;
        ws.getCell(`A${row}`).font = { size: 10 };
        ws.getCell(`A${row}`).alignment = { wrapText: true };
        row++;
      }
      row++;
    }
  }

  // Auto-width columns
  ws.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value || '').length;
      if (len > maxLen) maxLen = Math.min(len, 40);
    });
    col.width = maxLen + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${slug}.xlsx`);
}
