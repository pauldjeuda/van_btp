/**
 * Export Excel professionnel — récapitulatif paie / présences
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface PayrollRecapRow {
  matricule: string;
  name: string;
  role: string;
  projectName: string;
  weeklySalary: number;
  dailyRate: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  halfDays: number;
  unmarkedDays: number;
  baseAmount: number;
  deductions: number;
  netPay: number;
}

export interface PayrollDayDetail {
  date: string;
  employeeName: string;
  matricule: string;
  projectName: string;
  status: string;
  dailyRate: number;
  dayValue: number;
  deduction: number;
}

export interface PayrollRecapData {
  period: {
    from: string;
    to: string;
    label: string;
    periodType: 'week' | 'month';
  };
  workingDays: string[];
  rows: PayrollRecapRow[];
  dayDetails: PayrollDayDetail[];
  totals: {
    employees: number;
    baseAmount: number;
    deductions: number;
    netPay: number;
    workingDaysPerWeek: number;
  };
}

const fmtMoney = (n: number) => Math.round(Number(n) || 0);
const fmtNum = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(fmtMoney(n));

const fmtDateFr = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const setColWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
  ws['!cols'] = widths.map((wch) => ({ wch }));
};

const buildSummarySheet = (data: PayrollRecapData): XLSX.WorkSheet => {
  const generatedAt = new Date().toLocaleString('fr-FR');
  const periodKind = data.period.periodType === 'month' ? 'Mensuel' : 'Hebdomadaire';
  const projectLine = data.rows.length
    ? `Du ${fmtDateFr(data.period.from)} au ${fmtDateFr(data.period.to)}`
    : `Du ${fmtDateFr(data.period.from)} au ${fmtDateFr(data.period.to)}`;

  const headerBlock: (string | number)[][] = [
    ['VAN BTP — ERP CHANTIER'],
    ['RÉCAPITULATIF DE PAIE & PRÉSENCES'],
    [`Période ${periodKind} : ${data.period.label}`],
    [projectLine],
    [`Jours ouvrés (lun–ven) : ${data.workingDays.length}  |  Taux journalier = salaire hebdo ÷ ${data.totals.workingDaysPerWeek}`],
    [`Document généré le ${generatedAt}`],
    [],
    [
      'Matricule',
      'Employé',
      'Poste',
      'Chantier',
      'Salaire hebdo (FCFA)',
      'Taux / jour (FCFA)',
      'Jours ouvrés',
      'Présents',
      'Retards',
      'Absences',
      'Demi-journées',
      'Non pointés',
      'Base (FCFA)',
      'Déductions (FCFA)',
      'Net à payer (FCFA)',
    ],
  ];

  const body = data.rows.map((r) => [
    r.matricule,
    r.name,
    r.role,
    r.projectName,
    fmtMoney(r.weeklySalary),
    fmtMoney(r.dailyRate),
    r.workingDays,
    r.presentDays,
    r.lateDays,
    r.absentDays,
    r.halfDays,
    r.unmarkedDays,
    fmtMoney(r.baseAmount),
    fmtMoney(r.deductions),
    fmtMoney(r.netPay),
  ]);

  const totalsRow = [
    '',
    'TOTAL GÉNÉRAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    fmtMoney(data.totals.baseAmount),
    fmtMoney(data.totals.deductions),
    fmtMoney(data.totals.netPay),
  ];

  const footer = [
    [],
    ['Règles de calcul'],
    ['• Présent / Retard : journée comptabilisée à 100 %'],
    ['• Absence ou jour non pointé : déduction du taux journalier'],
    ['• Demi-journée : déduction de 50 % du taux journalier'],
    [`• Période hebdo : base = salaire hebdomadaire  |  Période mensuelle : base = taux journalier × jours ouvrés`],
  ];

  const aoa = [...headerBlock, ...body, totalsRow, ...footer];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 14 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 14 } },
  ];

  setColWidths(ws, [14, 22, 16, 18, 16, 14, 10, 10, 10, 10, 12, 12, 14, 16, 16]);

  return ws;
};

const buildDetailSheet = (data: PayrollRecapData): XLSX.WorkSheet => {
  const header: (string | number)[][] = [
    ['DÉTAIL JOURNALIER DES PRÉSENCES'],
    [`Période : ${data.period.label}`],
    [],
    ['Date', 'Employé', 'Matricule', 'Chantier', 'Statut', 'Taux jour (FCFA)', 'Crédit jour (FCFA)', 'Déduction (FCFA)'],
  ];

  const body = data.dayDetails.map((d) => [
    fmtDateFr(d.date),
    d.employeeName,
    d.matricule,
    d.projectName,
    d.status,
    fmtMoney(d.dailyRate),
    fmtMoney(d.dayValue),
    fmtMoney(d.deduction),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...header, ...body]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ];
  setColWidths(ws, [22, 22, 14, 18, 14, 16, 16, 16]);
  return ws;
};

const buildLegendSheet = (data: PayrollRecapData): XLSX.WorkSheet => {
  const aoa = [
    ['SYNTHÈSE & MÉTHODE'],
    [],
    ['Indicateur', 'Valeur'],
    ['Type de période', data.period.periodType === 'month' ? 'Mensuelle' : 'Hebdomadaire'],
    ['Libellé période', data.period.label],
    ['Date début', fmtDateFr(data.period.from)],
    ['Date fin', fmtDateFr(data.period.to)],
    ['Nombre d\'employés', data.totals.employees],
    ['Total base (FCFA)', fmtNum(data.totals.baseAmount)],
    ['Total déductions (FCFA)', fmtNum(data.totals.deductions)],
    ['Total net à payer (FCFA)', fmtNum(data.totals.netPay)],
    [],
    ['Exemple'],
    ['Salaire hebdomadaire 10 000 FCFA → taux journalier 2 000 FCFA (÷ 5 jours)'],
    ['1 absence = −2 000 FCFA sur le net de la période'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  setColWidths(ws, [32, 40]);
  return ws;
};

export function exportPayrollRecapToExcel(data: PayrollRecapData, filenamePrefix = 'Recap_Paie_Presences') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(data), 'Récapitulatif');
  XLSX.utils.book_append_sheet(wb, buildDetailSheet(data), 'Détail journalier');
  XLSX.utils.book_append_sheet(wb, buildLegendSheet(data), 'Synthèse');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeLabel = data.period.label.replace(/[^\w\-]+/g, '_').slice(0, 40);
  saveAs(blob, `${filenamePrefix}_${safeLabel}.xlsx`);
}

export default exportPayrollRecapToExcel;
