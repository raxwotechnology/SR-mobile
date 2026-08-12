/**
 * Export utilities for PDF, Excel, and CSV
 * Uses browser-native approaches to avoid heavy dependencies
 */

// ==================== CSV Export ====================
export const exportToCSV = (data, columns, filename = 'report') => {
  if (!data || data.length === 0) return;

  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      // Escape commas and quotes in CSV
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

// ==================== Excel Export (using simple HTML table) ====================
export const exportToExcel = (data, columns, filename = 'report') => {
  if (!data || data.length === 0) return;

  let table = '<table border="1"><thead><tr>';
  columns.forEach(c => {
    table += `<th style="background:#10b981;color:white;font-weight:bold;padding:8px">${c.label}</th>`;
  });
  table += '</tr></thead><tbody>';

  data.forEach(row => {
    table += '<tr>';
    columns.forEach(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      table += `<td style="padding:6px">${val ?? ''}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table>';

  const blob = new Blob(
    [`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`],
    { type: 'application/vnd.ms-excel' }
  );
  downloadBlob(blob, `${filename}.xls`);
};

// ==================== PDF Export (using print window) ====================
export const exportToPDF = (data, columns, title = 'Report') => {
  if (!data || data.length === 0) return;

  let table = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="color: #1a1a2e; margin-bottom: 5px;">${title}</h1>
      <p style="color: #666; font-size: 12px; margin-bottom: 20px;">Generated: ${new Date().toLocaleString()}</p>
      <table style="width:100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr>`;
  columns.forEach(c => {
    table += `<th style="background:#10b981;color:white;padding:10px 8px;text-align:left;border:1px solid #ddd">${c.label}</th>`;
  });
  table += `</tr></thead><tbody>`;

  data.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f9f9f9';
    table += `<tr style="background:${bg}">`;
    columns.forEach(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      table += `<td style="padding:8px 8px;border:1px solid #eee">${val ?? ''}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table></div>';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>${title}</title></head>
    <body onload="window.print(); window.close();">${table}</body></html>
  `);
  printWindow.document.close();
};

// ==================== Full Balance Report PDF Export ====================
export const exportBalanceReportPDF = (summary, items = [], activeTabLabel = 'NORMAL CUSTOMER DETAILS', dateStr = '', periodStr = 'MONTHLY') => {
  const formatCur = (val) => `Rs. ${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #1e293b; background: #fff;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <div>
          <h1 style="margin:0; color:#0f172a; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">SR MOBILE - BALANCE REPORT</h1>
          <p style="margin:4px 0 0 0; color:#64748b; font-size: 13px;">Period: <strong>${periodStr.toUpperCase()}</strong> | Date: <strong>${dateStr}</strong></p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0; font-size:12px; color:#475569;">Printed: ${new Date().toLocaleString()}</p>
        </div>
      </div>

      <!-- Financial Summary Grid -->
      <h3 style="margin:0 0 10px 0; font-size:15px; color:#0369a1; text-transform:uppercase;">📊 Financial Summary Breakdown</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom: 25px; font-size: 13px;">
        <tbody>
          <tr style="background:#f8fafc;">
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Mobile Income</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#16a34a; font-weight:bold;">${formatCur(summary.mobileIncome)}</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Reload Income</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#16a34a; font-weight:bold;">${formatCur(summary.reloadIncome)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Accessories Income</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#16a34a; font-weight:bold;">${formatCur(summary.accessoriesIncome)}</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Service Cost</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#dc2626; font-weight:bold;">${formatCur(summary.serviceCost)}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Wholesale | Advance Income</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#16a34a; font-weight:bold;">${formatCur((summary.wholesaleIncome || 0) + (summary.advanceIncome || 0))}</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Supplier Cost</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#dc2626; font-weight:bold;">${formatCur(summary.supplierCost)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Repairing Income (Normal|Company)</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#16a34a; font-weight:bold;">${formatCur((summary.repairNormalIncome || 0) + (summary.repairCompanyIncome || 0))}</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#e0f2fe; color:#0369a1;">TOTAL INCOME</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; background:#e0f2fe; color:#0369a1;">${formatCur(summary.totalIncome)}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold;">Phone Card | SIM Card Income</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; color:#16a34a; font-weight:bold;">${formatCur((summary.phoneCardIncome || 0) + (summary.simCardIncome || 0))}</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#fee2e2; color:#991b1b;">TOTAL COST</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; background:#fee2e2; color:#991b1b;">${formatCur(summary.totalCost)}</td>
          </tr>
          <tr style="background:#f0fdf4;">
            <td colspan="2" style="border:1px solid #cbd5e1;"></td>
            <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; font-size:14px; background:#dcfce7; color:#15803d;">BALANCE AMOUNT</td>
            <td style="padding:10px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; font-size:14px; background:#dcfce7; color:#15803d;">${formatCur(summary.balanceAmount)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Itemized Details Table -->
      <h3 style="margin:20px 0 10px 0; font-size:15px; color:#0369a1; text-transform:uppercase;">📑 Itemized Details - ${activeTabLabel}</h3>
      <table style="width:100%; border-collapse:collapse; font-size: 11px;">
        <thead>
          <tr style="background:#0284c7; color:#fff;">
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">RECEIPT</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">DATE</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">TIME</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">ITEM</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">BRAND</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">MODEL</th>
            <th style="padding:8px 4px; border:1px solid #0284c7; text-align:center;">QTY</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:right;">PRICE</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:right;">SUB TOTAL</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:right;">DISCOUNT</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:right;">TOTAL</th>
            <th style="padding:8px 6px; border:1px solid #0284c7; text-align:left;">C_ID</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0 ? `
            <tr><td colspan="12" style="text-align:center; padding:15px; color:#94a3b8;">No transactions found for this category.</td></tr>
          ` : items.map((r, i) => `
            <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding:6px; border:1px solid #e2e8f0; font-weight:bold;">${r.receipt}</td>
              <td style="padding:6px; border:1px solid #e2e8f0;">${r.date}</td>
              <td style="padding:6px; border:1px solid #e2e8f0;">${r.time}</td>
              <td style="padding:6px; border:1px solid #e2e8f0;">${r.item}</td>
              <td style="padding:6px; border:1px solid #e2e8f0;">${r.brand}</td>
              <td style="padding:6px; border:1px solid #e2e8f0;">${r.model}</td>
              <td style="padding:6px 4px; border:1px solid #e2e8f0; text-align:center;">${r.qty}</td>
              <td style="padding:6px; border:1px solid #e2e8f0; text-align:right;">${r.price?.toFixed(2)}</td>
              <td style="padding:6px; border:1px solid #e2e8f0; text-align:right;">${r.subTotal?.toFixed(2)}</td>
              <td style="padding:6px; border:1px solid #e2e8f0; text-align:right;">${r.discount?.toFixed(2)}</td>
              <td style="padding:6px; border:1px solid #e2e8f0; text-align:right; font-weight:bold; color:#0f172a;">${r.total?.toFixed(2)}</td>
              <td style="padding:6px; border:1px solid #e2e8f0;">${r.cId}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div style="display:flex; justify-content:space-between; margin-top: 50px; font-size:12px; color:#475569;">
        <div style="border-top:1px solid #cbd5e1; width:200px; text-align:center; padding-top:5px;">Prepared By</div>
        <div style="border-top:1px solid #cbd5e1; width:200px; text-align:center; padding-top:5px;">Manager Signature</div>
      </div>
    </div>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>SR Mobile - Balance Report (${dateStr})</title>
      </head>
      <body onload="window.print(); window.close();" style="margin:0;">
        ${content}
      </body>
    </html>
  `);
  printWindow.document.close();
};

// ==================== Helper ====================
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

