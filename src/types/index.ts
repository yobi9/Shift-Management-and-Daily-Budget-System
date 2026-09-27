/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'manager' | 'employee';
export type ShiftType = 'morning' | 'evening' | 'night' | 'general';
export type ReportStatus = 'active' | 'submitted' | 'archived';
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  pinHash: string; // SHA-256 hash of numeric PIN
  shiftType: ShiftType;
  failedAttempts: number;
  lockedUntil: number | null; // Timestamp if temporarily locked
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  isSystem?: boolean;
}

export interface Transaction {
  id: string;
  reportId: string;
  stageId?: string; // Phase / stage ID of the shift
  continuousReportId?: string; // Shared continuous daily report context
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  timestamp: string; // ISO string
  createdBy: string; // User ID
  createdByName?: string;
  isCarriedOver?: boolean; // Whether carried over from previous shift
}

export interface HandoverRecord {
  handedOverAt: string;
  handedOverByUserId: string;
  handedOverByName: string;
  handedOverToUserId: string;
  handedOverToName: string;
  expectedDrawerBalance?: number;
  actualDrawerBalance?: number;
  discrepancy?: number;
  handoverNotes: string;
  confirmedWithPin: boolean;
}

export interface ReportSnapshot {
  snapshotType: 'received' | 'delivered';
  generatedAt: string;
  userId: string;
  employeeName: string;
  reportNumber: string;
  continuousReportId?: string;
  stageNumber?: number;
  shiftType: ShiftType;
  date: string;
  openingCash: number;
  totalIncomes: number;
  totalExpenses: number;
  netBalance: number;
  actualDrawerBalance?: number;
  discrepancy?: number;
  counterpartUserId?: string;
  counterpartName?: string;
  notes?: string;
  transactions: Transaction[];
}

export interface ShiftReport {
  id: string;
  continuousReportId?: string; // Common thread ID linking stages of the continuous report
  stageNumber?: number; // 1 (Ahmed), 2 (Khalid), 3 (Mohammed)...
  reportNumber: string; // e.g. REP-20260924-001
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  userId: string;
  employeeName: string;
  status: ReportStatus;
  
  // Financial breakdown
  // Note: Net = todayIncome + totalIncomes - totalExpenses
  todayIncome: number; // دخل اليوم الأساسي المنفصل في رأس التقرير فقط
  carriedBalanceFromPrevious?: number; // الرصيد والعهدة النقدية المستلمة المنقولة من الوردية السابقة
  previousReportId?: string; // معرف تقرير الوردية السابقة المسلّمة
  totalIncomes: number; // مجموع المعاملات من نوع إيراد
  totalExpenses: number; // مجموع المعاملات من نوع مصروف
  netBalance: number; // الصافي النهائي للوردية

  // Handover data (populated when status becomes 'submitted' or 'archived')
  handover?: HandoverRecord;

  // Snapshots for accountability and audit
  receivedSnapshot?: ReportSnapshot; // Snapshot at the exact moment of reception (ماذا استلمت؟)
  deliveredSnapshot?: ReportSnapshot; // Snapshot at the exact moment of delivery (ماذا سلّمت؟)

  // Immutable historical snapshot saved upon handover (kept for backward compatibility)
  frozenSnapshot?: {
    report: Omit<ShiftReport, 'frozenSnapshot' | 'receivedSnapshot' | 'deliveredSnapshot'>;
    transactions: Transaction[];
    generatedAt: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ip?: string;
}
