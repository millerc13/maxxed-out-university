import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportPayload } from '@/components/tools/ExportableToolShell';
import { downloadBlob } from './download';

const BRAND_COLOR: [number, number, number] = [0, 0, 204]; // #0000CC
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const BODY_TEXT: [number, number, number] = [34, 34, 34];
const MUTED_TEXT: [number, number, number] = [136, 136, 136];
const CHECK_MARK = '\u2611';
const UNCHECK_MARK = '\u2610';

const LOGO_URL = 'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png';

async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportPdf(payload: ExportPayload) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Load and place logo in top-right
  const logoBase64 = await loadLogoAsBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', pageWidth - margin - 45, margin - 2, 45, 18);
    } catch { /* skip if image fails */ }
  }

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(payload.title, margin, y + 6);
  y += 12;

  // Date
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y);
  y += 8;

  // Divider
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  for (const section of payload.sections) {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    // Section heading
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(section.heading, margin, y + 4);
    y += 8;

    // Key-value rows
    if (section.rows && section.rows.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: BODY_TEXT, cellWidth: contentWidth * 0.45 },
          1: { textColor: BODY_TEXT, halign: 'right' },
        },
        body: section.rows.map((r) => [r.label, r.value]),
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Table data
    if (section.table) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [section.table.headers],
        body: section.table.rows,
        headStyles: {
          fillColor: BRAND_COLOR,
          textColor: HEADER_TEXT,
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: { fontSize: 9, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 245, 247] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Checklist items
    if (section.checkItems && section.checkItems.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...BODY_TEXT);
      doc.setFont('helvetica', 'normal');
      for (const item of section.checkItems) {
        if (y > 275) {
          doc.addPage();
          y = margin;
        }
        const mark = item.checked ? CHECK_MARK : UNCHECK_MARK;
        doc.text(`${mark}  ${item.label}`, margin + 2, y + 3);
        y += 5;
      }
      y += 4;
    }

    // Paragraphs
    if (section.paragraphs && section.paragraphs.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...BODY_TEXT);
      doc.setFont('helvetica', 'normal');
      for (const p of section.paragraphs) {
        if (y > 260) {
          doc.addPage();
          y = margin;
        }
        const lines = doc.splitTextToSize(p, contentWidth);
        doc.text(lines, margin, y + 3);
        y += lines.length * 4 + 3;
      }
      y += 2;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_TEXT);
    doc.text('Maxxed Out University', margin, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  downloadBlob(doc.output('blob'), `${slug}.pdf`);
}
