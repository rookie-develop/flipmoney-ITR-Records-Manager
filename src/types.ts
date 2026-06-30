export interface ITRRecord {
  id?: string;
  clientName: string;
  pan?: string; // Optional - 10 alphanumeric, uppercase
  mobile: string; // 10 digits
  state: string; // Indian state
  city: string; // Indian city
  assessmentYear: string; // e.g., "2026-27"
  itrType: string; // e.g., "ITR-1", "ITR-2"
  filingStatus: FilingStatus;
  paymentStatus: PaymentStatus;
  paymentAmount: number; // Actual amount paid or expected
  paymentDate: string | null; // YYYY-MM-DD in IST
  notes: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdDateIST: string; // YYYY-MM-DD in IST for daily reporting
  updatedDateIST: string; // YYYY-MM-DD in IST
}

export type FilingStatus = 
  | 'Pending Documents'
  | 'In Progress'
  | 'Prepared'
  | 'Filed'
  | 'E-Verified'
  | 'Processed';

export type PaymentStatus = 'Pending' | 'Paid';

export interface DailyReport {
  date: string; // YYYY-MM-DD (IST)
  totalRecordsAdded: number;
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
  records: ITRRecord[];
}

export interface MonthlyReport {
  month: string; // YYYY-MM (IST)
  totalRecordsAdded: number;
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
  records: ITRRecord[];
}
