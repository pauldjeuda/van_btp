import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFInvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  clientName: string;
  projectName: string;
  category: string;
  description?: string;
  amount: number;
  status: string;
}

export const generateInvoicePDF = (data: PDFInvoiceData) => {
  const doc = new jsPDF();

  // ✅ Fonction de formatage monétaire TRÈS ROBUSTE
  const formatMoney = (n: number) => {
    // Arrondir et convertir en entier
    const value = Math.round(n);
    // Convertir en string et inverser pour faciliter le groupage
    const reversed = value.toString().split('').reverse();
    // Grouper par 3 chiffres
    const groups = [];
    for (let i = 0; i < reversed.length; i += 3) {
      groups.push(reversed.slice(i, i + 3).reverse().join(''));
    }
    // Re-inverser et joindre avec des espaces
    const formatted = groups.reverse().join(' ');
    return formatted + ' FCFA';
  };

  // Calculs TVA et TTC
  const tva = data.amount * 0.1925;
  const ttc = data.amount + tva;

  // --- Header Section ---
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('VAN BTP ', 20, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('BTP - GÉNIE CIVIL - AMÉNAGEMENTS - ÉTUDES', 20, 33);
  doc.text('Siège social : Yaoundé, Cameroun', 20, 38);

  // --- Top Decorative Bar ---
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 45, 210, 2, 'F');

  // --- Document Title & Info Section ---
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 70);

  // Right Info Column
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Réf. Facture :', 130, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 160, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('Date :', 130, 76);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 160, 76);

  if (data.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Échéance :', 130, 82);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(239, 68, 68);
    doc.text(data.dueDate, 160, 82);
    doc.setTextColor(33, 33, 33);
  }

  // --- Client & Project Recipient Section ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 85, 100, 35, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DESTINATAIRE', 25, 93);

  doc.setFontSize(12);
  doc.setTextColor(26, 54, 93);
  doc.setFont('helvetica', 'bold');
  const wrappedClient = doc.splitTextToSize(data.clientName, 90);
  doc.text(wrappedClient, 25, 102);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const wrappedProject = doc.splitTextToSize(`Projet : ${data.projectName}`, 90);
  doc.text(wrappedProject, 25, 108 + (wrappedClient.length > 1 ? 5 : 0));

  // ✅ Formatage des montants pour le tableau
  const formattedAmount = formatMoney(data.amount);
  const formattedTVA = formatMoney(tva);
  const formattedTTC = formatMoney(ttc);

  // --- Tableau principal ---
  const tableData = [
    [
      data.category,
      data.description || 'Prestation de services et travaux de génie civil réalisés conformément au marché.',
      '1',
      formattedAmount,
      formattedAmount
    ]
  ];

  autoTable(doc, {
    startY: 130,
    head: [['DÉSIGNATION', 'DESCRIPTION DÉTAILLÉE', 'QTÉ', 'P.U (HT)', 'TOTAL HT']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [26, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      font: 'helvetica',
    },
    bodyStyles: {
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // --- Résumé des totaux ---
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Total HT
  doc.text('Total Hors Taxes (HT) :', 120, finalY);
  doc.setTextColor(33, 33, 33);
  doc.text(formattedAmount, 190, finalY, { align: 'right' });

  // TVA
  doc.setTextColor(71, 85, 105);
  doc.text('TVA (19.25%) :', 120, finalY + 8);
  doc.setTextColor(33, 33, 33);
  doc.text(formattedTVA, 190, finalY + 8, { align: 'right' });

  // ✅ TOTAL TTC avec espacement optimal (corrigé: utilisation de finalY au lieu de summaryStartY)
  doc.setFillColor(26, 54, 93);
  // Rectangle ajusté pour plus d'espace
  doc.roundedRect(110, finalY + 14, 85, 18, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  // Ajouter 5 points d'espace après le texte
  doc.text('TOTAL TTC :', 118, finalY + 26);

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  // Aligner le montant avec un espace de 10 points du bord droit
  doc.text(formattedTTC, 188, finalY + 26, { align: 'right' });

  // --- Modalités de paiement ---
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Modalités de paiement', 20, finalY + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text([
    'Veuillez libeller votre chèque à l\'ordre de VAN BTP ',
    'Virement Bancaire : BICEC Yaoundé',
    'RIB: 12345 67890 12345678901 23'
  ], 20, finalY + 46);

  // --- Pied de page ---
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const footerY = 280;
  doc.line(20, footerY - 5, 190, footerY - 5);
  doc.text('VAN BTP SA  |   RC / YAO / 2024 / B / 456   |   NIU : M012345678912', 105, footerY, { align: 'center' });
  doc.text('Yaoundé, Cameroun   |   Email : contact@vanbtp.cm   |   Tél : +237 600 000 000', 105, footerY + 5, { align: 'center' });

  // Sauvegarde du PDF
  doc.save(`Facture_${data.invoiceNumber}.pdf`);
};