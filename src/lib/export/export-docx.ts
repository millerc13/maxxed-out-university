import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  ImageRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  ShadingType,
} from 'docx';
import type { ExportPayload } from '@/components/tools/ExportableToolShell';
import { downloadBlob } from './download';

const BRAND_HEX = '0000CC';
const LOGO_URL = 'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png';

async function loadLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(LOGO_URL);
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function exportDocx(payload: ExportPayload) {
  const children: (Paragraph | Table)[] = [];

  // Logo
  const logoBuffer = await loadLogoBuffer();
  if (logoBuffer) {
    try {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 180, height: 71 },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 100 },
        }),
      );
    } catch { /* skip if image fails */ }
  }

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: payload.title, bold: true, size: 32, color: BRAND_HEX })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
    }),
  );

  // Date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          size: 16,
          color: '888888',
        }),
      ],
      spacing: { after: 300 },
    }),
  );

  for (const section of payload.sections) {
    // Section heading
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.heading, bold: true, size: 24, color: BRAND_HEX })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
    );

    // Key-value rows as a 2-column table
    if (section.rows && section.rows.length > 0) {
      const tableRows = section.rows.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: r.label, bold: true, size: 20 })] })],
                width: { size: 45, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: r.value, size: 20 })], alignment: AlignmentType.RIGHT })],
                width: { size: 55, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
              }),
            ],
          }),
      );
      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    }

    // Table data
    if (section.table) {
      const headerRow = new TableRow({
        children: section.table.headers.map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })],
              shading: { type: ShadingType.SOLID, color: BRAND_HEX },
              borders: thinBorders(),
            }),
        ),
      });

      const dataRows = section.table.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (val) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: val, size: 18 })] })],
                  borders: thinBorders(),
                }),
            ),
          }),
      );

      children.push(
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    }

    // Checklist items
    if (section.checkItems && section.checkItems.length > 0) {
      for (const item of section.checkItems) {
        const mark = item.checked ? '\u2611' : '\u2610';
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${mark}  ${item.label}`, size: 20 })],
            spacing: { before: 40, after: 40 },
          }),
        );
      }
    }

    // Paragraphs
    if (section.paragraphs && section.paragraphs.length > 0) {
      for (const p of section.paragraphs) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: p, size: 20 })],
            spacing: { before: 60, after: 60 },
          }),
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  downloadBlob(buffer, `${slug}.docx`);
}

function thinBorders() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
  return { top: border, bottom: border, left: border, right: border };
}
