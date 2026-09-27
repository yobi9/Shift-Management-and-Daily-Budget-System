/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Category, Transaction, ShiftReport, AuditLog } from '../../types';

/**
 * StorageAdapter Interface
 * 
 * Provides an abstract storage layer decoupler.
 * By using this interface throughout the application, the underlying
 * persistence engine (IndexedDB, Realm DB, SQLite, or Remote REST)
 * can be swapped seamlessly without altering UI or business logic.
 */
export interface IStorageService {
  /** Initialize database tables, stores, or Realm schemas */
  init(): Promise<void>;

  // Users management
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  updateUserPin(userId: string, pinHash: string): Promise<void>;
  updateUserLockStatus(userId: string, failedAttempts: number, lockedUntil: number | null): Promise<void>;

  // Categories management
  getCategories(): Promise<Category[]>;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  // Shift Reports management
  getReports(): Promise<ShiftReport[]>;
  getReportById(id: string): Promise<ShiftReport | null>;
  getActiveReportForUser(userId: string): Promise<ShiftReport | null>;
  saveReport(report: ShiftReport, requestingUserId: string): Promise<void>;
  deleteReport(id: string, requestingUserId: string): Promise<void>;
  getDeliveredShiftsForUser?(userId: string): Promise<ShiftReport[]>;
  getReceivedShiftsForUser?(userId: string): Promise<ShiftReport[]>;
  getUserShiftHistory?(userId: string): Promise<ShiftReport[]>;

  // Transactions management
  getTransactionsByReportId(reportId: string): Promise<Transaction[]>;
  getTransactionsByContinuousReportId?(continuousReportId: string): Promise<Transaction[]>;
  getTransactionById?(id: string): Promise<Transaction | null>;
  saveTransaction(transaction: Transaction, requestingUserId: string): Promise<void>;
  deleteTransaction(id: string, requestingUserId: string): Promise<void>;

  // Atomic Handover Operation
  handoverShift(
    reportId: string,
    handoverData: {
      handedOverByUserId: string;
      handedOverByName: string;
      handedOverToUserId: string;
      handedOverToName: string;
      expectedDrawerBalance?: number;
      actualDrawerBalance?: number;
      discrepancy?: number;
      handoverNotes: string;
    }
  ): Promise<ShiftReport>;

  // Audit Logs
  logAction(userId: string, userName: string, action: string, details: string): Promise<void>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Seed / Reset
  seedInitialData(): Promise<void>;
  resetAllData(): Promise<void>;
}
