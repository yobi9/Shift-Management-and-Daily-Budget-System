/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IStorageService } from './IStorageService';
import { User, Category, Transaction, ShiftReport, AuditLog, ReportSnapshot } from '../../types';
import { sha256 } from '../../utils/crypto';

const DB_NAME = 'ShiftManagerDB';
const DB_VERSION = 4;

export class IndexedDBAdapter implements IStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Drop and recreate stores on DB upgrade to ensure clean state
        for (const storeName of ['users', 'categories', 'reports', 'transactions', 'auditLogs']) {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
          }
        }

        // Users store
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });

        // Categories store
        db.createObjectStore('categories', { keyPath: 'id' });

        // Shift Reports store
        const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
        reportStore.createIndex('userId', 'userId', { unique: false });
        reportStore.createIndex('status', 'status', { unique: false });
        reportStore.createIndex('date', 'date', { unique: false });
        reportStore.createIndex('continuousReportId', 'continuousReportId', { unique: false });

        // Transactions store
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('reportId', 'reportId', { unique: false });
        txStore.createIndex('continuousReportId', 'continuousReportId', { unique: false });
        txStore.createIndex('timestamp', 'timestamp', { unique: false });

        // Audit logs store
        const logStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        try {
          await this.checkAndSeedData();
          resolve();
        } catch (err) {
          console.error('Failed checking/seeding initial data', err);
          resolve(); // Resolve anyway so UI doesn't freeze
        }
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.initPromise;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Could not open IndexedDB database.');
    }
    return this.db;
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getUserById(id: string): Promise<User | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const index = store.index('username');
      const req = index.get(username);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveUser(user: User): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.put(user);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateUserPin(userId: string, pinHash: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('المستخدم غير موجود');
    user.pinHash = pinHash;
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await this.saveUser(user);
  }

  async updateUserLockStatus(userId: string, failedAttempts: number, lockedUntil: number | null): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    user.failedAttempts = failedAttempts;
    user.lockedUntil = lockedUntil;
    await this.saveUser(user);
  }

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveCategory(category: Category): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.put(category);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Shift Reports ---
  async getReports(): Promise<ShiftReport[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reports', 'readonly');
      const store = tx.objectStore('reports');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as ShiftReport[];
        // Sort descending by date/createdAt
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getReportById(id: string): Promise<ShiftReport | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reports', 'readonly');
      const store = tx.objectStore('reports');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getActiveReportForUser(userId: string): Promise<ShiftReport | null> {
    const reports = await this.getReports();
    return reports.find(r => r.userId === userId && r.status === 'active') || null;
  }

  async saveReport(report: ShiftReport, requestingUserId: string): Promise<void> {
    if (!requestingUserId) {
      throw new Error('حظر أمني (Backend Security): يجب تقديم هوية المستخدم المصرح له لتحديث التقرير.');
    }

    const existing = await this.getReportById(report.id);
    if (existing) {
      // Admin override only for final archiving
      if (requestingUserId !== 'usr_admin') {
        // Enforce: currentUser == currentShiftEmployee && status == active && !hasHandover
        if (existing.userId !== requestingUserId) {
          throw new Error('حظر أمني (Backend Security): غير مصرح لك بتعديل تقرير وردية موظف آخر.');
        }
        if (existing.status !== 'active' || existing.handover != null || existing.deliveredSnapshot != null) {
          throw new Error('حظر أمني (Backend Security): لا يمكن تعديل بيانات وردية تم تسليمها أو إغلاقها تاريخياً (Read-Only).');
        }
        if (report.userId !== existing.userId) {
          throw new Error('حظر أمني (Backend Security): لا يمكن تغيير هوية الموظف المسؤول عن الوردية.');
        }
      }
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const req = store.put(report);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteReport(id: string, requestingUserId: string): Promise<void> {
    if (!requestingUserId) {
      throw new Error('حظر أمني (Backend Security): يجب تقديم هوية المستخدم المصرح له لحذف التقرير.');
    }

    const existing = await this.getReportById(id);
    if (!existing) return;

    if (requestingUserId !== 'usr_admin') {
      if (existing.userId !== requestingUserId) {
        throw new Error('حظر أمني (Backend Security): غير مصرح لك بحذف وردية موظف آخر.');
      }
      if (existing.status !== 'active' || existing.handover != null || existing.deliveredSnapshot != null) {
        throw new Error('حظر أمني (Backend Security): لا يمكن حذف وردية تم تسليمها أو إغلاقها تاريخياً.');
      }
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['reports', 'transactions'], 'readwrite');
      const reportStore = tx.objectStore('reports');
      const txStore = tx.objectStore('transactions');

      reportStore.delete(id);

      // Clean up transactions associated with this report
      const index = txStore.index('reportId');
      const req = index.openCursor(IDBKeyRange.only(id));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Transactions with Backend Security Verification ---
  async getTransactionById(id: string): Promise<Transaction | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as Transaction) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getTransactionsByReportId(reportId: string): Promise<Transaction[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const index = store.index('reportId');
      const req = index.getAll(IDBKeyRange.only(reportId));
      req.onsuccess = () => {
        const list = (req.result || []) as Transaction[];
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getTransactionsByContinuousReportId(continuousReportId: string): Promise<Transaction[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      
      if (store.indexNames.contains('continuousReportId')) {
        const index = store.index('continuousReportId');
        const req = index.getAll(IDBKeyRange.only(continuousReportId));
        req.onsuccess = () => {
          const list = (req.result || []) as Transaction[];
          list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      } else {
        // Fallback scan
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as Transaction[];
          const filtered = all.filter(t => t.continuousReportId === continuousReportId);
          filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          resolve(filtered);
        };
        req.onerror = () => reject(req.error);
      }
    });
  }

  async saveTransaction(transaction: Transaction, requestingUserId: string): Promise<void> {
    if (!requestingUserId) {
      throw new Error('حظر أمني (Backend Security): يجب تقديم هوية المستخدم المصرح له لتسجيل أو تعديل المعاملة.');
    }

    const report = await this.getReportById(transaction.reportId);
    if (!report) {
      throw new Error('التقرير المطلوب غير موجود.');
    }

    // Backend Security Verification
    if (requestingUserId !== 'usr_admin') {
      // Strict rule: currentUser == currentShiftEmployee && status == active && !hasHandover
      if (report.userId !== requestingUserId) {
        throw new Error('حظر أمني (Backend Security): غير مصرح لك بتسجيل أو تعديل معاملات في وردية موظف آخر.');
      }
      if (report.status !== 'active' || report.handover != null || report.deliveredSnapshot != null) {
        throw new Error('حظر أمني (Backend Security): هذه الوردية مغلقة وتم تسليمها، ولا يمكن إضافة أو تعديل معاملات بها (Read-Only).');
      }

      // If modifying an existing transaction
      const existingTx = await this.getTransactionById(transaction.id);
      if (existingTx) {
        if (existingTx.createdBy !== requestingUserId) {
          throw new Error('حظر أمني (Backend Security): غير مصرح لك بتعديل معاملة أنشأها موظف آخر.');
        }
      }
    }

    // Ensure metadata consistency
    transaction.stageId = transaction.reportId;
    if (!transaction.continuousReportId && report.continuousReportId) {
      transaction.continuousReportId = report.continuousReportId;
    }

    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const req = store.put(transaction);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Automatically synchronize the parent report totals
    const reportTransactions = await this.getTransactionsByReportId(report.id);
    let totalIncomes = 0;
    let totalExpenses = 0;
    for (const t of reportTransactions) {
      if (t.type === 'income') totalIncomes += Number(t.amount || 0);
      if (t.type === 'expense') totalExpenses += Number(t.amount || 0);
    }
    const base = report.carriedBalanceFromPrevious != null 
      ? Number(report.carriedBalanceFromPrevious) 
      : Number(report.todayIncome || 0);
    
    report.totalIncomes = totalIncomes;
    report.totalExpenses = totalExpenses;
    report.netBalance = base + totalIncomes - totalExpenses;
    report.updatedAt = new Date().toISOString();

    const txReport = db.transaction('reports', 'readwrite');
    const storeReport = txReport.objectStore('reports');
    storeReport.put(report);
  }

  async deleteTransaction(id: string, requestingUserId: string): Promise<void> {
    if (!requestingUserId) {
      throw new Error('حظر أمني (Backend Security): يجب تقديم هوية المستخدم المصرح له لحذف المعاملة.');
    }

    const existingTx = await this.getTransactionById(id);
    if (!existingTx) return;

    const report = await this.getReportById(existingTx.reportId);
    if (!report) {
      throw new Error('التقرير المرتبط بهذه المعاملة غير موجود.');
    }

    if (requestingUserId !== 'usr_admin') {
      if (existingTx.createdBy !== requestingUserId) {
        throw new Error('حظر أمني (Backend Security): غير مصرح لك بحذف معاملة أنشأها موظف آخر.');
      }

      // Strict rule: currentUser == currentShiftEmployee && status == active && !hasHandover
      if (report.userId !== requestingUserId) {
        throw new Error('حظر أمني (Backend Security): غير مصرح لك بحذف معاملات في وردية موظف آخر.');
      }
      if (report.status !== 'active' || report.handover != null || report.deliveredSnapshot != null) {
        throw new Error('حظر أمني (Backend Security): هذه الوردية مغلقة وتم تسليمها (Read-Only).');
      }
    }

    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Automatically synchronize the parent report totals
    const reportTransactions = await this.getTransactionsByReportId(report.id);
    let totalIncomes = 0;
    let totalExpenses = 0;
    for (const t of reportTransactions) {
      if (t.type === 'income') totalIncomes += Number(t.amount || 0);
      if (t.type === 'expense') totalExpenses += Number(t.amount || 0);
    }
    const base = report.carriedBalanceFromPrevious != null 
      ? Number(report.carriedBalanceFromPrevious) 
      : Number(report.todayIncome || 0);
    
    report.totalIncomes = totalIncomes;
    report.totalExpenses = totalExpenses;
    report.netBalance = base + totalIncomes - totalExpenses;
    report.updatedAt = new Date().toISOString();

    const txReport = db.transaction('reports', 'readwrite');
    const storeReport = txReport.objectStore('reports');
    storeReport.put(report);
  }

  // --- Shift Handover (Atomic operation with Delivered Snapshot and immutable lock) ---
  async handoverShift(
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
  ): Promise<ShiftReport> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new Error('التقرير المطلوب غير موجود');
    }
    if (report.status !== 'active') {
      throw new Error('التقرير تم تسليمه مسبقاً ولا يمكن تسليمه مرة أخرى');
    }

    // Retrieve all transactions to calculate definitive totals and freeze snapshot
    const transactions = await this.getTransactionsByReportId(reportId);
    let totalIncomes = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
      if (tx.type === 'income') totalIncomes += Number(tx.amount || 0);
      if (tx.type === 'expense') totalExpenses += Number(tx.amount || 0);
    }

    const base = report.carriedBalanceFromPrevious != null 
      ? Number(report.carriedBalanceFromPrevious) 
      : Number(report.todayIncome || 0);
    const netBalance = base + totalIncomes - totalExpenses;
    const nowIso = new Date().toISOString();

    report.totalIncomes = totalIncomes;
    report.totalExpenses = totalExpenses;
    report.netBalance = netBalance;
    report.status = 'submitted';
    report.updatedAt = nowIso;

    report.handover = {
      handedOverAt: nowIso,
      handedOverByUserId: handoverData.handedOverByUserId,
      handedOverByName: handoverData.handedOverByName,
      handedOverToUserId: handoverData.handedOverToUserId,
      handedOverToName: handoverData.handedOverToName,
      expectedDrawerBalance: netBalance,
      actualDrawerBalance: netBalance,
      discrepancy: 0,
      handoverNotes: handoverData.handoverNotes,
      confirmedWithPin: true
    };

    // 1. Create Delivered Snapshot (ماذا سلّم الموظف بالضبط لحظة التسليم؟)
    const deliveredSnapshot: ReportSnapshot = {
      snapshotType: 'delivered',
      generatedAt: nowIso,
      userId: report.userId,
      employeeName: report.employeeName,
      reportNumber: report.reportNumber,
      continuousReportId: report.continuousReportId || report.reportNumber,
      stageNumber: report.stageNumber || 1,
      shiftType: report.shiftType,
      date: report.date,
      openingCash: report.carriedBalanceFromPrevious ?? report.todayIncome,
      totalIncomes,
      totalExpenses,
      netBalance,
      actualDrawerBalance: netBalance,
      discrepancy: 0,
      counterpartUserId: handoverData.handedOverToUserId,
      counterpartName: handoverData.handedOverToName,
      notes: handoverData.handoverNotes,
      transactions: JSON.parse(JSON.stringify(transactions))
    };
    report.deliveredSnapshot = deliveredSnapshot;

    // 2. Create immutable frozen snapshot for backward compatibility
    report.frozenSnapshot = {
      report: {
        id: report.id,
        continuousReportId: report.continuousReportId,
        stageNumber: report.stageNumber,
        reportNumber: report.reportNumber,
        date: report.date,
        shiftType: report.shiftType,
        userId: report.userId,
        employeeName: report.employeeName,
        status: report.status,
        todayIncome: report.todayIncome,
        carriedBalanceFromPrevious: report.carriedBalanceFromPrevious,
        previousReportId: report.previousReportId,
        totalIncomes: report.totalIncomes,
        totalExpenses: report.totalExpenses,
        netBalance: report.netBalance,
        handover: report.handover,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      },
      transactions: JSON.parse(JSON.stringify(transactions)),
      generatedAt: nowIso
    };

    // Persist final handover state and delivered snapshot with administrative authority
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const req = store.put(report);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Audit log
    await this.logAction(
      handoverData.handedOverByUserId,
      handoverData.handedOverByName,
      'تسليم وردية',
      `تم تسليم التقرير ${report.reportNumber} للموظف ${handoverData.handedOverToName} بصافي رصيد مسلّم ${netBalance} ر.س وحفظ لقطة التسليم`
    );

    return report;
  }

  // --- Specific User Queries for the 3 Tabs ---
  async getDeliveredShiftsForUser(userId: string): Promise<ShiftReport[]> {
    const all = await this.getReports();
    return all.filter((r: ShiftReport) => r.userId === userId && (r.handover != null || r.deliveredSnapshot != null));
  }

  async getReceivedShiftsForUser(userId: string): Promise<ShiftReport[]> {
    const all = await this.getReports();
    return all.filter((r: ShiftReport) => r.userId === userId && (r.receivedSnapshot != null || r.previousReportId != null || r.carriedBalanceFromPrevious != null));
  }

  async getUserShiftHistory(userId: string): Promise<ShiftReport[]> {
    const all = await this.getReports();
    return all.filter((r: ShiftReport) => r.userId === userId || r.handover?.handedOverToUserId === userId || r.handover?.handedOverByUserId === userId);
  }

  async getContinuousChainReports(continuousReportId: string): Promise<ShiftReport[]> {
    const all = await this.getReports();
    return all.filter((r: ShiftReport) => r.continuousReportId === continuousReportId || r.reportNumber === continuousReportId);
  }

  // --- Audit Logs ---
  async logAction(userId: string, userName: string, action: string, details: string): Promise<void> {
    try {
      const db = await this.getDB();
      const log: AuditLog = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        userId,
        userName,
        action,
        details
      };
      const tx = db.transaction('auditLogs', 'readwrite');
      tx.objectStore('auditLogs').put(log);
    } catch (e) {
      console.error('Failed to write audit log', e);
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('auditLogs', 'readonly');
      const store = tx.objectStore('auditLogs');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as AuditLog[];
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list.slice(0, 100));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Seeding & Reset ---
  private async checkAndSeedData(): Promise<void> {
    const users = await this.getUsers();
    if (users.length === 0) {
      await this.seedInitialData();
    } else {
      // Ensure the operational employee team is fully seeded
      const hasSara = users.some(u => u.username === 'sara');
      if (!hasSara) {
        const saraPin = await sha256('3333');
        await this.saveUser({
          id: 'usr_sara',
          username: 'sara',
          displayName: 'سارة القحطاني',
          role: 'employee',
          pinHash: saraPin,
          shiftType: 'evening',
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: '2026-09-01T08:00:00.000Z'
        });
      }
      const hasFaisal = users.some(u => u.username === 'faisal');
      if (!hasFaisal) {
        const faisalPin = await sha256('4444');
        await this.saveUser({
          id: 'usr_faisal',
          username: 'faisal',
          displayName: 'فيصل المطيري',
          role: 'employee',
          pinHash: faisalPin,
          shiftType: 'night',
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: '2026-09-01T08:00:00.000Z'
        });
      }
    }
  }

  async seedInitialData(): Promise<void> {
    // 1. Initial Users (with precomputed SHA-256 hashes)
    // admin PIN: '1234'
    const adminPin = await sha256('1234');
    // ahmed PIN: '1111'
    const ahmedPin = await sha256('1111');
    // khalid PIN: '2222'
    const khalidPin = await sha256('2222');
    // sara PIN: '3333'
    const saraPin = await sha256('3333');
    // faisal PIN: '4444'
    const faisalPin = await sha256('4444');

    const defaultUsers: User[] = [
      {
        id: 'usr_admin',
        username: 'admin',
        displayName: 'المدير العام (مشرف النظام)',
        role: 'manager',
        pinHash: adminPin,
        shiftType: 'general',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'usr_ahmed',
        username: 'ahmed',
        displayName: 'أحمد المنصور',
        role: 'employee',
        pinHash: ahmedPin,
        shiftType: 'morning',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'usr_khalid',
        username: 'khalid',
        displayName: 'خالد السعيد',
        role: 'employee',
        pinHash: khalidPin,
        shiftType: 'evening',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'usr_sara',
        username: 'sara',
        displayName: 'سارة القحطاني',
        role: 'employee',
        pinHash: saraPin,
        shiftType: 'evening',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'usr_faisal',
        username: 'faisal',
        displayName: 'فيصل المطيري',
        role: 'employee',
        pinHash: faisalPin,
        shiftType: 'night',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-09-01T08:00:00.000Z'
      }
    ];

    for (const u of defaultUsers) {
      await this.saveUser(u);
    }

    // 2. Default Categories
    const defaultCategories: Category[] = [
      { id: 'cat_inc_cash', name: 'مبيعات نقدية (كاش)', type: 'income', isSystem: true },
      { id: 'cat_inc_card', name: 'مبيعات شبكة (مدى / فيزا)', type: 'income', isSystem: true },
      { id: 'cat_inc_receivables', name: 'تحصيل ذمم ومستحقات سابقة', type: 'income', isSystem: false },
      { id: 'cat_inc_other', name: 'إيرادات وخدمات إضافية', type: 'income', isSystem: false },
      { id: 'cat_exp_stock', name: 'مشتريات بضاعة ومستلزمات', type: 'expense', isSystem: true },
      { id: 'cat_exp_maintenance', name: 'صيانة وتشغيل', type: 'expense', isSystem: false },
      { id: 'cat_exp_petty', name: 'ضيافة ونثريات يومية', type: 'expense', isSystem: true },
      { id: 'cat_exp_fuel', name: 'محروقات ونقل وتوصيل', type: 'expense', isSystem: false },
      { id: 'cat_exp_draw', name: 'مسحوبات نقدية وسلف عمال', type: 'expense', isSystem: false }
    ];

    for (const c of defaultCategories) {
      await this.saveCategory(c);
    }

    // 3. Realistic Demo Data:
    // Continuous Report for Today: REP-20260925-01
    // Stage 1: Ahmed Al-Mansoor (Morning Shift) - COMPLETED & HANDED OVER TO KHALID
    const todayStr = '2026-09-25';
    const continuousId = `REP-${todayStr.replace(/-/g, '')}-01`;
    const stage1Id = `rep_${todayStr.replace(/-/g, '')}_stage1`;
    const stage2Id = `rep_${todayStr.replace(/-/g, '')}_stage2`;

    // Ahmed's Transactions (Stage 1)
    const stage1Transactions: Transaction[] = [
      {
        id: 'tx_s1_1',
        reportId: stage1Id,
        stageId: stage1Id,
        continuousReportId: continuousId,
        type: 'income',
        categoryId: 'cat_inc_cash',
        categoryName: 'مبيعات نقدية (كاش)',
        amount: 350.00,
        description: 'مبيعات طلبات نقدية بالفرع',
        paymentMethod: 'cash',
        timestamp: '2026-09-25T08:45:00.000Z',
        createdBy: 'usr_ahmed',
        createdByName: 'أحمد المنصور'
      },
      {
        id: 'tx_s1_2',
        reportId: stage1Id,
        stageId: stage1Id,
        continuousReportId: continuousId,
        type: 'income',
        categoryId: 'cat_inc_card',
        categoryName: 'مبيعات شبكة (مدى / فيزا)',
        amount: 420.00,
        description: 'عمليات شبكة أجهزة الدفع POS',
        paymentMethod: 'card',
        timestamp: '2026-09-25T10:15:00.000Z',
        createdBy: 'usr_ahmed',
        createdByName: 'أحمد المنصور'
      },
      {
        id: 'tx_s1_3',
        reportId: stage1Id,
        stageId: stage1Id,
        continuousReportId: continuousId,
        type: 'expense',
        categoryId: 'cat_exp_petty',
        categoryName: 'ضيافة ونثريات يومية',
        amount: 50.00,
        description: 'ضيافة شاي وقهوة ومستلزمات نظافة',
        paymentMethod: 'cash',
        timestamp: '2026-09-25T11:30:00.000Z',
        createdBy: 'usr_ahmed',
        createdByName: 'أحمد المنصور'
      },
      {
        id: 'tx_s1_4',
        reportId: stage1Id,
        stageId: stage1Id,
        continuousReportId: continuousId,
        type: 'expense',
        categoryId: 'cat_exp_fuel',
        categoryName: 'محروقات ونقل وتوصيل',
        amount: 70.00,
        description: 'وقود سيارة توصيل الطلبات',
        paymentMethod: 'cash',
        timestamp: '2026-09-25T13:10:00.000Z',
        createdBy: 'usr_ahmed',
        createdByName: 'أحمد المنصور'
      }
    ];

    // Ahmed's Received Snapshot at 08:00 AM
    const ahmedReceivedSnapshot: ReportSnapshot = {
      snapshotType: 'received',
      generatedAt: '2026-09-25T08:00:00.000Z',
      userId: 'usr_ahmed',
      employeeName: 'أحمد المنصور',
      reportNumber: 'REP-20260925-01',
      continuousReportId: continuousId,
      stageNumber: 1,
      shiftType: 'morning',
      date: todayStr,
      openingCash: 1500.00,
      totalIncomes: 0,
      totalExpenses: 0,
      netBalance: 1500.00,
      actualDrawerBalance: 1500.00,
      discrepancy: 0,
      notes: 'افتتاح يوم العمل والوردية الصباحية بعهدة أساسية 1500 ر.س',
      transactions: []
    };

    // Ahmed's Delivered Snapshot at 16:00 PM (Net: 1500 + 770 - 120 = 2150)
    const ahmedDeliveredSnapshot: ReportSnapshot = {
      snapshotType: 'delivered',
      generatedAt: '2026-09-25T16:00:00.000Z',
      userId: 'usr_ahmed',
      employeeName: 'أحمد المنصور',
      reportNumber: 'REP-20260925-01',
      continuousReportId: continuousId,
      stageNumber: 1,
      shiftType: 'morning',
      date: todayStr,
      openingCash: 1500.00,
      totalIncomes: 770.00,
      totalExpenses: 120.00,
      netBalance: 2150.00,
      actualDrawerBalance: 2150.00,
      discrepancy: 0,
      counterpartUserId: 'usr_khalid',
      counterpartName: 'خالد السعيد',
      notes: 'تم تسليم الوردية والعهدة للزميل خالد السعيد بصافي رصيد 2150 ر.س',
      transactions: stage1Transactions
    };

    const repStage1: ShiftReport = {
      id: stage1Id,
      continuousReportId: continuousId,
      stageNumber: 1,
      reportNumber: 'REP-20260925-01',
      date: todayStr,
      shiftType: 'morning',
      userId: 'usr_ahmed',
      employeeName: 'أحمد المنصور',
      status: 'submitted',
      todayIncome: 1500.00,
      totalIncomes: 770.00,
      totalExpenses: 120.00,
      netBalance: 2150.00,
      receivedSnapshot: ahmedReceivedSnapshot,
      deliveredSnapshot: ahmedDeliveredSnapshot,
      handover: {
        handedOverAt: '2026-09-25T16:00:00.000Z',
        handedOverByUserId: 'usr_ahmed',
        handedOverByName: 'أحمد المنصور',
        handedOverToUserId: 'usr_khalid',
        handedOverToName: 'خالد السعيد',
        expectedDrawerBalance: 2150.00,
        actualDrawerBalance: 2150.00,
        discrepancy: 0,
        handoverNotes: 'تم تسليم الوردية والعهدة للزميل خالد السعيد بصافي رصيد 2150 ر.س',
        confirmedWithPin: true
      },
      frozenSnapshot: {
        report: {
          id: stage1Id,
          continuousReportId: continuousId,
          stageNumber: 1,
          reportNumber: 'REP-20260925-01',
          date: todayStr,
          shiftType: 'morning',
          userId: 'usr_ahmed',
          employeeName: 'أحمد المنصور',
          status: 'submitted',
          todayIncome: 1500.00,
          totalIncomes: 770.00,
          totalExpenses: 120.00,
          netBalance: 2150.00,
          createdAt: '2026-09-25T08:00:00.000Z',
          updatedAt: '2026-09-25T16:00:00.000Z'
        },
        transactions: stage1Transactions,
        generatedAt: '2026-09-25T16:00:00.000Z'
      },
      createdAt: '2026-09-25T08:00:00.000Z',
      updatedAt: '2026-09-25T16:00:00.000Z'
    };

    await this.saveReport(repStage1, 'usr_admin');
    for (const tx of stage1Transactions) {
      await this.saveTransaction(tx, 'usr_admin');
    }

    // 4. Audit Log for traceability
    await this.logAction(
      'usr_ahmed',
      'أحمد المنصور',
      'تسليم وردية بمحضر رسمي',
      `تم تسليم المرحلة الأولى من الوردية المستمرة ${continuousId} للزميل خالد السعيد بالرصيد 2150.00 ر.س وبانتظار استلامه الرسمي`
    );
  }

  async resetAllData(): Promise<void> {
    const db = await this.getDB();
    const stores = ['users', 'categories', 'reports', 'transactions', 'auditLogs'];
    for (const s of stores) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(s, 'readwrite');
        tx.objectStore(s).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    await this.seedInitialData();
  }
}
