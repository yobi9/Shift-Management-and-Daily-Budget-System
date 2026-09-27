/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReportSnapshot } from '../types';
import { formatDate, formatTime, formatDateTime, formatCurrency } from '../utils/dateFormatter';
import { 
  X, 
  FileCheck, 
  ArrowLeftRight, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  Banknote, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle,
  FileText
} from 'lucide-react';

interface SnapshotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: ReportSnapshot | null;
}

export const SnapshotDetailsModal: React.FC<SnapshotDetailsModalProps> = ({
  isOpen,
  onClose,
  snapshot
}) => {
  if (!isOpen || !snapshot) return null;

  const isReceived = snapshot.snapshotType === 'received';
  const shiftTypeLabel = snapshot.shiftType === 'morning' ? 'الوردية الصباحية' : 'الوردية المسائية';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isReceived ? 'bg-amber-50/70 border-amber-200' : 'bg-blue-50/70 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isReceived ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isReceived ? <FileCheck className="w-5 h-5" /> : <ArrowLeftRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono bg-slate-900 text-white px-2 py-0.5 rounded">
                  {snapshot.reportNumber}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  isReceived 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}>
                  {isReceived ? 'لقطة الاستلام (Received Snapshot)' : 'لقطة التسليم (Delivered Snapshot)'}
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-sm mt-1">
                {isReceived ? 'سجل حالة العهدة والتقرير لحظة الاستلام' : 'سجل حالة العهدة والتقرير لحظة التسليم وإخلاء الذمة'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Info Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">
              {isReceived 
                ? '📌 هذه اللقطة توثق بدقة ما استلمه الموظف عند بدء ورديته، وهي ثابتة لا يمكن تعديلها لأغراض النزاهة والمطابقة.'
                : '📌 هذه اللقطة توثق بدقة ما سلّمه الموظف لزميله التالي عند إنهاء ورديته، وتعتبر محضر إخلاء ذمة مالي معتمد.'}
            </p>
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">صاحب الوردية:</span>
              <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-emerald-600" />
                {snapshot.employeeName}
              </strong>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">
                {isReceived ? 'استلمت من الموظف:' : 'سُلّمت إلى الموظف:'}
              </span>
              <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                {snapshot.counterpartName || 'افتتاح جديد لليوم'}
              </strong>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">توقيت التوثيق (بالثانية):</span>
              <span className="font-mono text-slate-700 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDateTime(snapshot.generatedAt)}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">تاريخ ونوع الوردية:</span>
              <span className="font-mono text-slate-700 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(snapshot.date)} ({shiftTypeLabel})
              </span>
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-right">
              <span className="text-[10px] text-emerald-900 font-bold block mb-1">
                دخل اليوم الأساسي
              </span>
              <span className="text-base font-black font-mono text-emerald-950">
                {formatCurrency(snapshot.openingCash)}
              </span>
              <span className="text-[10px] text-slate-400 mr-1">ر.س</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <span className="text-[10px] text-slate-700 font-bold block mb-1">إجمالي الإيرادات (+)</span>
              <span className="text-base font-black font-mono text-emerald-700">
                +{formatCurrency(snapshot.totalIncomes)}
              </span>
              <span className="text-[10px] text-slate-400 mr-1">ر.س</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <span className="text-[10px] text-slate-700 font-bold block mb-1">إجمالي المصروفات (-)</span>
              <span className="text-base font-black font-mono text-rose-700">
                -{formatCurrency(snapshot.totalExpenses)}
              </span>
              <span className="text-[10px] text-slate-400 mr-1">ر.س</span>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 border-2 border-sky-400 text-right">
              <span className="text-[10px] text-sky-950 font-black block mb-1">الصافي المسلّم</span>
              <span className="text-base font-black font-mono text-sky-950">
                {formatCurrency(snapshot.netBalance)}
              </span>
              <span className="text-[10px] text-sky-800 font-bold mr-1">ر.س</span>
            </div>
          </div>

          {/* Notes (If present) */}
          {snapshot.notes && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">ملاحظات التوثيق:</span>
                <span>{snapshot.notes}</span>
              </div>
            </div>
          )}

          {/* Transactions list in this snapshot */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>المعاملات الموثقة في هذه اللقطة ({snapshot.transactions.length})</span>
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto">
              {snapshot.transactions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  لا توجد حركات مسجلة ضمن هذه اللقطة.
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-10 text-center">النوع</th>
                      <th className="py-2 px-3 font-semibold">البيان</th>
                      <th className="py-2 px-3 font-semibold">المسؤول</th>
                      <th className="py-2 px-3 font-semibold">الوقت</th>
                      <th className="py-2 px-3 font-semibold text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot.transactions.map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold ${
                            t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {t.type === 'income' ? '+' : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {t.description}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {t.createdByName || t.createdBy}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {formatTime(t.timestamp)}
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-bold">
                          <span className={t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            المعرف: {snapshot.continuousReportId || snapshot.reportNumber}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            إغلاق المعاينة
          </button>
        </div>

      </div>
    </div>
  );
};
