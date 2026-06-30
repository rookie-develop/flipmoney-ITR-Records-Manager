import { ITRRecord } from './types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

/**
 * Returns current date string in IST timezone (YYYY-MM-DD)
 */
export function getISTDateString(date: Date = new Date()): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns current month string in IST timezone (YYYY-MM)
 */
export function getISTMonthString(date: Date = new Date()): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

/**
 * Formats a YYYY-MM-DD string into a clean Indian readable date (e.g. 29 Jun 2026)
 */
export function formatISTDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return `${day} ${months[monthIdx]} ${year}`;
}

/**
 * Validates Permanent Account Number (PAN) Format
 * e.g., ABCDE1234F (5 alphabets, 4 digits, 1 alphabet)
 */
export function validatePAN(pan: string): boolean {
  const cleanPan = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(cleanPan);
}

/**
 * Validates standard 10 digit Indian Mobile Number
 */
export function validateMobile(mobile: string): boolean {
  const cleanMobile = mobile.trim();
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(cleanMobile);
}

/**
 * Exports client records array to a downloadable CSV file
 */
export function exportToCSV(records: ITRRecord[]): void {
  const headers = [
    'Client Name',
    'PAN Number',
    'Mobile Number',
    'Assessment Year',
    'ITR Type',
    'Filing Status',
    'Payment Status',
    'Payment Amount (₹)',
    'Payment Date (IST)',
    'Notes',
    'Created Date (IST)'
  ];

  const rows = records.map(r => [
    `"${r.clientName.replace(/"/g, '""')}"`,
    `"${r.pan}"`,
    `"${r.mobile}"`,
    `"${r.assessmentYear}"`,
    `"${r.itrType}"`,
    `"${r.filingStatus}"`,
    `"${r.paymentStatus}"`,
    r.paymentAmount,
    `"${r.paymentDate || 'N/A'}"`,
    `"${(r.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${r.createdDateIST}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const nowStr = getISTDateString();
  link.setAttribute('download', `FlipMoney_ITR_Records_${nowStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports client records to Excel (.xlsx) using SheetJS
 */
export function exportToExcel(records: ITRRecord[]): void {
  const data = records.map(r => ({
    'Client Name': r.clientName,
    'Mobile Number': r.mobile,
    'State': r.state || 'N/A',
    'City': r.city || 'N/A',
    'Assessment Year': r.assessmentYear,
    'ITR Type': r.itrType,
    'Filing Status': r.filingStatus,
    'Payment Status': r.paymentStatus,
    'Payment Amount (INR)': r.paymentAmount,
    'Payment Date (IST)': r.paymentDate || 'N/A',
    'Notes': r.notes || '',
    'Created Date (IST)': r.createdDateIST
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ITR Filings');
  
  const nowStr = getISTDateString();
  XLSX.writeFile(workbook, `FlipMoney_ITR_Records_${nowStr}.xlsx`);
}

/**
 * Exports client records to PDF (.pdf) using jsPDF
 */
export function exportToPDF(records: ITRRecord[]): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('FlipMoney ITR Records Ledger', 14, 15);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  const nowStr = getISTDateString();
  doc.text(`Generated: ${nowStr} (Indian Standard Time)  |  Total filings listed: ${records.length}`, 14, 21);

  // Table Headers background
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 26, 269, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700
  
  // Headers layout
  const columns = [
    { name: 'Client Name', x: 16 },
    { name: 'Mobile', x: 72 },
    { name: 'State / City', x: 98 },
    { name: 'AY', x: 144 },
    { name: 'Type', x: 163 },
    { name: 'Filing Status', x: 182 },
    { name: 'Payment', x: 218 },
    { name: 'Amount', x: 242 },
    { name: 'Created Date', x: 262 }
  ];

  columns.forEach(col => {
    doc.text(col.name, col.x, 31.5);
  });

  // Rows data
  let y = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  records.forEach((r, idx) => {
    // Page overflow auto-handling
    if (y > 185) {
      doc.addPage();
      // Draw new headers
      doc.setFillColor(241, 245, 249);
      doc.rect(14, 14, 269, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      columns.forEach(col => {
        doc.text(col.name, col.x, 19.5);
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      y = 26;
    }

    // Row alternating backgrounds
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, y - 4, 269, 6.5, 'F');
    }

    // Data drawing
    doc.text(r.clientName.substring(0, 28), 16, y);
    doc.text(r.mobile, 72, y);
    doc.text(`${(r.state || '-').substring(0, 11)} / ${(r.city || '-').substring(0, 11)}`, 98, y);
    doc.text(r.assessmentYear, 144, y);
    doc.text(r.itrType, 163, y);
    doc.text(r.filingStatus, 182, y);
    doc.text(r.paymentStatus, 218, y);
    doc.text(`Rs. ${r.paymentAmount.toLocaleString('en-IN')}`, 242, y);
    doc.text(r.createdDateIST, 262, y);

    // Row lines
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 2.5, 283, y + 2.5);

    y += 6.5;
  });

  doc.save(`FlipMoney_ITR_Ledger_${nowStr}.pdf`);
}
