import { formatRupees } from './currency';
import { formatDateTime, formatDate } from './date';

/**
 * Export array of data to CSV file and trigger browser download
 */
export const exportToCSV = (filename, columns, data) => {
  if (!data || !data.length) return;

  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let val = '';
        if (typeof col.accessor === 'function') {
          val = col.accessor(row);
        } else if (col.accessorKey) {
          const keys = col.accessorKey.split('.');
          val = keys.reduce((acc, k) => (acc ? acc[k] : ''), row);
        }
        if (val === null || val === undefined) val = '';
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',');
  });

  const csvContent = [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate formatted HTML report for Print & PDF Export
 */
export const printReport = (title, metadata = {}, columns = [], data = []) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const metadataHtml = Object.entries(metadata)
    .map(
      ([key, val]) =>
        `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span style="color:#64748b;">${key}:</span> <strong style="color:#0f172a;">${val}</strong></div>`
    )
    .join('');

  const headersHtml = columns.map((col) => `<th style="border-bottom:2px solid #e2e8f0; padding:8px; text-align:${col.align || 'left'}; font-size:11px; font-weight:700; color:#334155;">${col.header}</th>`).join('');

  const rowsHtml = data
    .map(
      (row, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #f1f5f9;">
      ${columns
        .map((col) => {
          let val = '';
          if (typeof col.render === 'function') {
            val = col.render(row);
            if (typeof val === 'object') {
              // Fallback text if JSX element was passed
              val = row[col.accessorKey] || '';
            }
          } else if (col.accessorKey) {
            const keys = col.accessorKey.split('.');
            val = keys.reduce((acc, k) => (acc ? acc[k] : ''), row);
          }
          if (val === null || val === undefined) val = '-';
          return `<td style="padding:8px; font-size:11px; color:#1e293b; text-align:${col.align || 'left'};">${val}</td>`;
        })
        .join('')}
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Shrishail Multi Services</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #0f172a; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Shrishail Multi Services</h1>
          <div class="subtitle">${title} • Generated on ${formatDateTime(new Date())}</div>
        </div>
        <div class="meta-box">
          ${metadataHtml}
        </div>
        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const exportToPDF = printReport;
