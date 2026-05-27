import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { QuoteLine } from '../services/projectQuote.service';

export interface ProjectQuotePDFData {
  quoteId: number;
  title: string;
  status: string;
  date: string;
  projectName: string;
  projectCode?: string;
  clientName?: string;
  location?: string;
  lines: QuoteLine[];
  totalAmount: number;
  rejectionReason?: string | null;
}

const formatMoney = (n: number) => {
  const value = Math.round(Number(n) || 0);
  const reversed = value.toString().split('').reverse();
  const groups: string[] = [];
  for (let i = 0; i < reversed.length; i += 3) {
    groups.push(reversed.slice(i, i + 3).reverse().join(''));
  }
  return `${groups.reverse().join(' ')} FCFA`;
};

export function generateProjectQuotePDF(data: ProjectQuotePDFData) {
  const doc = new jsPDF();
  const ref = `DEV-${data.projectCode || data.quoteId}-${String(data.quoteId).padStart(4, '0')}`;

  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('VAN BTP', 20, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('BTP — GÉNIE CIVIL — AMÉNAGEMENTS — ÉTUDES', 20, 32);
  doc.text('Yaoundé, Cameroun', 20, 38);

  doc.setFillColor(239, 68, 68);
  doc.rect(0, 45, 210, 2, 'F');

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS CHANTIER', 20, 62);

  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);
  doc.setFont('helvetica', 'bold');
  doc.text('Référence :', 130, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(ref, 160, 58);
  doc.setFont('helvetica', 'bold');
  doc.text('Date :', 130, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 160, 64);
  doc.setFont('helvetica', 'bold');
  doc.text('Statut :', 130, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(data.status, 160, 70);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 78, 170, 32, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CHANTIER', 25, 86);
  doc.setFontSize(12);
  doc.setTextColor(26, 54, 93);
  doc.text(data.projectName, 25, 95);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  let metaY = 101;
  if (data.projectCode) {
    doc.text(`Code : ${data.projectCode}`, 25, metaY);
    metaY += 5;
  }
  if (data.clientName) {
    doc.text(`Client : ${data.clientName}`, 25, metaY);
    metaY += 5;
  }
  if (data.location) {
    doc.text(`Lieu : ${data.location}`, 25, metaY);
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 54, 93);
  doc.text(data.title, 20, 122);

  const tableBody = data.lines.map((line, i) => [
    String(i + 1),
    line.designation,
    String(line.quantity),
    formatMoney(line.unitPrice),
    formatMoney(line.total),
  ]);

  autoTable(doc, {
    startY: 128,
    head: [['N°', 'DÉSIGNATION', 'QTÉ', 'P.U.', 'TOTAL']],
    body: tableBody.length ? tableBody : [['—', 'Aucune ligne', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, font: 'helvetica' },
    headStyles: {
      fillColor: [26, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFillColor(26, 54, 93);
  doc.roundedRect(110, finalY, 85, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL GÉNÉRAL :', 118, finalY + 9);
  doc.setFontSize(12);
  doc.text(formatMoney(data.totalAmount), 188, finalY + 9, { align: 'right' });

  let noteY = finalY + 22;
  if (data.rejectionReason) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(20, noteY, 170, 18, 2, 2, 'F');
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Motif de rejet :', 25, noteY + 7);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(data.rejectionReason, 155);
    doc.text(wrapped, 25, noteY + 13);
    noteY += 22 + wrapped.length * 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const footerY = 285;
  doc.line(20, footerY - 4, 190, footerY - 4);
  doc.text('Document généré par VAN BTP ERP — Devis à titre informatif', 105, footerY, { align: 'center' });
  doc.text('Validité : 30 jours à compter de la date d\'émission', 105, footerY + 5, { align: 'center' });

  const safeName = (data.projectCode || `chantier-${data.quoteId}`).replace(/[^\w-]+/g, '_');
  doc.save(`Devis_${safeName}_${ref}.pdf`);
}
