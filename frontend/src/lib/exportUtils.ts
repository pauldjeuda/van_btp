/**
 * Utility to export data to CSV and trigger a download in the browser.
 * Optimized for professional use with Excel compatibility.
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [
    headers.join(';'), // Use semicolon for better French Excel compatibility
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName];
        if (value === null || value === undefined) return '';
        
        // Convert to string and handle formatting
        let stringValue = String(value);
        
        // If it's a number and we want it to be "professional" but still a number in Excel, 
        // we should keep it as is, but if it has special characters, we quote it.
        // For professional display of FCFA, we might have formatted it in the caller.
        
        // Escape quotes and wrap in quotes if it contains a semicolon, newline or quote
        const escaped = stringValue.replace(/"/g, '""');
        if (escaped.includes(';') || escaped.includes('\n') || escaped.includes('"')) {
          return `"${escaped}"`;
        }
        return escaped;
      }).join(';')
    )
  ];

  // Add BOM (\uFEFF) for Excel to recognize UTF-8 encoding
  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

