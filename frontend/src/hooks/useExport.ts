/**
 * @file useExport.ts
 * Hook centralisé pour toutes les fonctions d'export (Excel, CSV, Word).
 * La logique d'export était dupliquée dans Dashboard, Projects, Finances, etc.
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type ExportFormat = 'excel' | 'csv' | 'word';

interface UseExportReturn {
  isExporting: boolean;
  exportToExcel: (data: any[], filename: string, sheetName?: string) => Promise<void>;
  exportToCSV: (data: any[], filename: string) => void;
}

export const useExport = (): UseExportReturn => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = useCallback(async (data: any[], filename: string, sheetName = 'Données') => {
    setIsExporting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportToCSV = useCallback((data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(';'),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          return typeof val === 'string' && val.includes(';') ? `"${val}"` : val;
        }).join(';')
      ),
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  }, []);

  return { isExporting, exportToExcel, exportToCSV };
};
