/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IStorageService } from './IStorageService';
import { User, Category, Transaction, ShiftReport, AuditLog } from '../../types';

/**
 * ============================================================================
 * Realm Storage Adapter (التكامل مع قاعدة بيانات Realm)
 * ============================================================================
 * 
 * هذا الملف يوفر الطبقة الوسيطة الجاهزة للربط مع قاعدة بيانات Realm (Realm Web أو Realm Node أو MongoDB Atlas Device Sync).
 * 
 * ## كيفية استبدال IndexedDB بـ Realm بأقل تعديلات:
 * 
 * 1. تثبيت مكتبة Realm المناسبة للبيئة:
 *    - للويب (Browser): `npm install realm-web`
 *    - لتطبيقات React Native أو Electron: `npm install realm`
 * 
 * 2. في ملف `src/services/storage/index.ts`:
 *    - قم باستيراد `RealmStorageAdapter`
 *    - غيّر السطر: `export const storageService = new IndexedDBAdapter();`
 *      إلى: `export const storageService = new RealmStorageAdapter({ appId: 'YOUR_REALM_APP_ID' });`
 * 
 * 3. لا يتطلب كود واجهة المستخدم أو React Hooks أي تعديل إطلاقاً لأن كلاهما ينفذ `IStorageService`.
 * 
 * ## مخططات الجداول في Realm (Realm Object Schemas):
 * 
 * ```typescript
 * export const UserSchema: Realm.ObjectSchema = {
 *   name: 'User',
 *   primaryKey: 'id',
 *   properties: {
 *     id: 'string',
 *     username: { type: 'string', indexed: true },
 *     displayName: 'string',
 *     role: 'string',
 *     pinHash: 'string',
 *     shiftType: 'string',
 *     failedAttempts: { type: 'int', default: 0 },
 *     lockedUntil: 'int?',
 *     createdAt: 'string'
 *   }
 * };
 * 
 * export const CategorySchema: Realm.ObjectSchema = {
 *   name: 'Category',
 *   primaryKey: 'id',
 *   properties: {
 *     id: 'string',
 *     name: 'string',
 *     type: 'string',
 *     icon: 'string?',
 *     isSystem: { type: 'bool', default: false }
 *   }
 * };
 * 
 * export const TransactionSchema: Realm.ObjectSchema = {
 *   name: 'Transaction',
 *   primaryKey: 'id',
 *   properties: {
 *     id: 'string',
 *     reportId: { type: 'string', indexed: true },
 *     type: 'string',
 *     categoryId: 'string',
 *     categoryName: 'string',
 *     amount: 'double',
 *     description: 'string',
 *     paymentMethod: 'string',
 *     timestamp: { type: 'string', indexed: true },
 *     createdBy: 'string',
 *     createdByName: 'string?'
 *   }
 * };
 * 
 * export const ShiftReportSchema: Realm.ObjectSchema = {
 *   name: 'ShiftReport',
 *   primaryKey: 'id',
 *   properties: {
 *     id: 'string',
 *     reportNumber: 'string',
 *     date: { type: 'string', indexed: true },
 *     shiftType: 'string',
 *     userId: { type: 'string', indexed: true },
 *     employeeName: 'string',
 *     status: { type: 'string', indexed: true },
 *     todayIncome: 'double',
 *     totalIncomes: 'double',
 *     totalExpenses: 'double',
 *     netBalance: 'double',
 *     handover: 'string?', // JSON stringified HandoverRecord
 *     frozenSnapshot: 'string?', // JSON stringified immutable snapshot
 *     createdAt: 'string',
 *     updatedAt: 'string'
 *   }
 * };
 * ```
 */

export interface RealmConfig {
  appId?: string;
  partitionKey?: string;
  localPath?: string;
}

export class RealmStorageAdapter implements IStorageService {
  private config: RealmConfig;
  private isInitialized = false;

  constructor(config: RealmConfig = {}) {
    this.config = config;
  }

  async init(): Promise<void> {
    console.info('[RealmStorageAdapter] تهيئة محول Realm بالتكوين:', this.config);
    // عند استبداله بـ Realm الحقيقي:
    // const realm = await Realm.open({
    //   schema: [UserSchema, CategorySchema, TransactionSchema, ShiftReportSchema, AuditLogSchema]
    // });
    this.isInitialized = true;
  }

  async getUsers(): Promise<User[]> {
    this.ensureInitialized();
    // realm.objects<User>('User').map(u => ({ ...u }))
    return [];
  }

  async getUserById(id: string): Promise<User | null> {
    this.ensureInitialized();
    // realm.objectForPrimaryKey<User>('User', id)
    return null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    this.ensureInitialized();
    // realm.objects<User>('User').filtered('username == $0', username)[0] || null
    return null;
  }

  async saveUser(user: User): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => realm.create('User', user, Realm.UpdateMode.Modified));
  }

  async updateUserPin(userId: string, pinHash: string): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => {
    //   const user = realm.objectForPrimaryKey<User>('User', userId);
    //   if (user) { user.pinHash = pinHash; user.failedAttempts = 0; user.lockedUntil = null; }
    // });
  }

  async updateUserLockStatus(userId: string, failedAttempts: number, lockedUntil: number | null): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => {
    //   const user = realm.objectForPrimaryKey<User>('User', userId);
    //   if (user) { user.failedAttempts = failedAttempts; user.lockedUntil = lockedUntil; }
    // });
  }

  async getCategories(): Promise<Category[]> {
    this.ensureInitialized();
    // realm.objects<Category>('Category')
    return [];
  }

  async saveCategory(category: Category): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => realm.create('Category', category, Realm.UpdateMode.Modified));
  }

  async deleteCategory(id: string): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => {
    //   const cat = realm.objectForPrimaryKey('Category', id);
    //   if (cat) realm.delete(cat);
    // });
  }

  async getReports(): Promise<ShiftReport[]> {
    this.ensureInitialized();
    // realm.objects<ShiftReport>('ShiftReport').sorted('createdAt', true)
    return [];
  }

  async getReportById(id: string): Promise<ShiftReport | null> {
    this.ensureInitialized();
    // realm.objectForPrimaryKey<ShiftReport>('ShiftReport', id)
    return null;
  }

  async getActiveReportForUser(userId: string): Promise<ShiftReport | null> {
    this.ensureInitialized();
    // realm.objects<ShiftReport>('ShiftReport').filtered('userId == $0 AND status == "active"', userId)[0] || null
    return null;
  }

  async saveReport(report: ShiftReport, requestingUserId: string): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => realm.create('ShiftReport', serializedReport, Realm.UpdateMode.Modified));
  }

  async deleteReport(id: string, requestingUserId: string): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => {
    //   const rep = realm.objectForPrimaryKey('ShiftReport', id);
    //   if (rep) {
    //     const txs = realm.objects('Transaction').filtered('reportId == $0', id);
    //     realm.delete(txs);
    //     realm.delete(rep);
    //   }
    // });
  }

  async getTransactionsByReportId(reportId: string): Promise<Transaction[]> {
    this.ensureInitialized();
    // realm.objects<Transaction>('Transaction').filtered('reportId == $0', reportId).sorted('timestamp')
    return [];
  }

  async saveTransaction(transaction: Transaction, requestingUserId: string): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => realm.create('Transaction', transaction, Realm.UpdateMode.Modified));
  }

  async deleteTransaction(id: string, requestingUserId: string): Promise<void> {
    this.ensureInitialized();
    // realm.write(() => {
    //   const tx = realm.objectForPrimaryKey('Transaction', id);
    //   if (tx) realm.delete(tx);
    // });
  }

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
    this.ensureInitialized();
    throw new Error('Please configure Realm connection or switch to IndexedDBAdapter.');
  }

  async logAction(userId: string, userName: string, action: string, details: string): Promise<void> {
    this.ensureInitialized();
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    this.ensureInitialized();
    return [];
  }

  async seedInitialData(): Promise<void> {
    this.ensureInitialized();
  }

  async resetAllData(): Promise<void> {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      console.warn('[RealmStorageAdapter] Warning: Adapter not initialized, run init() first.');
    }
  }
}
