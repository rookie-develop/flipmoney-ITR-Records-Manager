import { ITRRecord } from './types';

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
