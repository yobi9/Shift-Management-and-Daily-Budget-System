/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShiftReport, User } from '../types';
import { storageService } from '../services/storage';
import { sha256 } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/dateFormatter';
import { soundManager } from '../utils/audioFeedback';
import { 
  X, 
  ArrowLeftRight, 
  UserCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  Scale, 
  LogIn, 
  LogOut 
} from 'lucide-react';

interface ShiftHandoverModalProps {
  report: ShiftReport;
  currentUser: User;
  onClose: () => void;
  onHandoverSuccess: (updatedReport: ShiftReport) => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  report,
  currentUser,
  onClose,
  onHandoverSuccess
}) => {
  const { login, logout } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('تم تسليم الوردية والتقرير بنجاح.');
  const [targetPin, setTargetPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<ShiftReport | null>(null);
  const [confirmedNextUser, setConfirmedNextUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const allUsers = await storageService.getUsers();
        // Operational employees ONLY (managers do not deliver or receive shifts)
        // and exclude the current employee who is handing over
        const employeeList = allUsers.filter(u => u.role === 'employee' && u.id !== currentUser.id);
        setEmployees(employeeList);
        if (employeeList.length > 0) {
          setTargetUserId(employeeList[0].id);
        }
      } catch (err) {
        console.error('Error fetching employees for handover', err);
      }
    })();
  }, [currentUser]);

  const netToHandover = Number(report.netBalance || 0);

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetUserId) {
      setError('يرجى اختيار الموظف المستلم للتقرير');
      return;
    }

    if (!targetPin) {
      setError('يرجى إدخال رمز PIN الخاص بالموظف المستلم لتأكيد الاستلام');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify target employee PIN
      const targetUser = await storageService.getUserById(targetUserId);
      if (!targetUser) {
        throw new Error('الموظف المستلم غير موجود');
      }

      const hashedInputPin = await sha256(targetPin);
      if (hashedInputPin !== targetUser.pinHash) {
        throw new Error(`رمز PIN للموظف المستلم (${targetUser.displayName}) غير صحيح.`);
      }

      // 2. Perform atomic handover with frozen snapshot directly with net balance
      const updated = await storageService.handoverShift(report.id, {
        handedOverByUserId: currentUser.id,
        handedOverByName: currentUser.displayName,
        handedOverToUserId: targetUser.id,
        handedOverToName: targetUser.displayName,
        expectedDrawerBalance: netToHandover,
        actualDrawerBalance: netToHandover,
        discrepancy: 0,
        handoverNotes: handoverNotes.trim()
      });

      setSuccessReport(updated);
      setConfirmedNextUser(targetUser);
      soundManager.playHandoverComplete();
      onHandoverSuccess(updated);
    } catch (err: any) {
      setError(err?.message || 'فشل إتمام تسليم الوردية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchToReceiver = async () => {
    if (!confirmedNextUser || !targetPin) {
      onClose();
      return;
    }
    await login(confirmedNextUser.username, targetPin);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">تسليم الوردية والتسليم المؤكد</h2>
              <p className="text-xs text-slate-400">تسليم التقرير وإغلاق وردية برقم {report.reportNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {successReport ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">تم تسليم الوردية بنجاح وتجميد التقرير!</h3>
              <p className="text-sm text-slate-600 mt-1">
                تم توثيق التسليم من <span className="font-semibold text-slate-900">{currentUser.displayName}</span> إلى <span className="font-semibold text-slate-900">{successReport.handover?.handedOverToName}</span>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-right space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم التقرير:</span>
                <span className="font-mono font-bold text-slate-800">{successReport.reportNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الصافي المسلّم:</span>
                <span className="font-mono font-bold text-emerald-700">{formatCurrency(successReport.netBalance)} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">حالة التقرير:</span>
                <span className="text-emerald-700 font-bold">مُسلّم ومؤرشف (غير قابل للتعديل)</span>
              </div>
            </div>

            <div className="pt-3 space-y-2">
              {confirmedNextUser && (
                <button
                  type="button"
                  onClick={handleSwitchToReceiver}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>التبديل فوراً لحساب المستلم ({confirmedNextUser.displayName}) واستلام التقرير</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-emerald-400" />
                <span>تسجيل الخروج الآن لتسليم محطة الكاشير للزميل</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                إغلاق والعودة
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmHandover} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Financial Reconciliation Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>المطابقة المالية للوردية</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">دخل اليوم الأساسي (الحوباني):</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(report.carriedBalanceFromPrevious || report.todayIncome)} ر.س</span>
                </div>
                <div>
                  <span className="text-slate-500 block">إجمالي الإيرادات (+):</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatCurrency(report.totalIncomes)} ر.س</span>
                </div>
                <div>
                  <span className="text-slate-500 block">إجمالي المصروفات (-):</span>
                  <span className="font-mono font-bold text-rose-600">-{formatCurrency(report.totalExpenses)} ر.س</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الصافي المسلّم للوردية:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">{formatCurrency(netToHandover)} ر.س</span>
                </div>
              </div>
            </div>

            {/* Handover Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات التسليم والتسلّم (اختياري)
              </label>
              <textarea
                rows={2}
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات حول الوردية والتقرير..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Next Employee Authentication / Handover Confirmation */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>تأكيد استلام الموظف التالي للتقرير</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    الموظف المستلم للتقرير *
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {employees.length === 0 ? (
                      <option value="" disabled>لا يوجد موظف آخر مسجل بالنظام</option>
                    ) : (
                      employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.displayName} ({emp.shiftType === 'morning' ? 'وردية صباحية' : emp.shiftType === 'evening' ? 'وردية مسائية' : emp.shiftType === 'night' ? 'وردية ليلية' : 'عام'})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    رمز PIN السري للموظف المستلم *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={targetPin}
                      onChange={(e) => setTargetPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-center font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    (تأكيد الهوية الرقمي غير القابل للتراجع)
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting || employees.length === 0}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>تأكيد التسليم وتجميد التقرير</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
