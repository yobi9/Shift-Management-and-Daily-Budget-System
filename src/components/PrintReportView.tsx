/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ShiftReport, Transaction } from '../types';
import { 
  Printer, 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Building2,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { exportElementToPdf } from '../utils/pdfExport';
import { formatDate, formatTime, formatDateTime, formatCurrency } from '../utils/dateFormatter';

interface PrintReportViewProps {
  report: ShiftReport;
  transactions: Transaction[];
  onClose: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  report,
  transactions,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    setExportStatus('جاري إعداد وتصدير ملف الـ PDF بمقاس A4 القياسي...');
    try {
      const fileName = `تقرير_الوردية_${report.reportNumber}_${report.date}.pdf`;
      await exportElementToPdf(printAreaRef.current, fileName, (msg) => {
        setExportStatus(msg);
      });
      setExportStatus('تم تنزيل ملف PDF بنجاح!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Failed exporting PDF', err);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Separate incomes and expenses
  const incomeTxs = transactions.filter(t => t.type === 'income');
  const expenseTxs = transactions.filter(t => t.type === 'expense');

  const totalIncomes = incomeTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpenses = expenseTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const baseBalance = report.carriedBalanceFromPrevious != null 
    ? Number(report.carriedBalanceFromPrevious) 
    : Number(report.todayIncome || 0);
  const netBalance = report.netBalance != null 
    ? report.netBalance 
    : (baseBalance + totalIncomes - totalExpenses);

  const paymentMethodLabel: Record<string, string> = {
    cash: 'نقدي (كاش)',
    card: 'شبكة (مدى)',
    transfer: 'تحويل بنكي',
    other: 'أخرى',
  };

  const isConsolidated = report.shiftType === 'general' || report.reportNumber.includes('DAILY-ALL');
  const shiftLabel = isConsolidated
    ? 'تقرير اليوم الشامل'
    : report.shiftType === 'morning'
      ? 'الوردية الصباحية'
      : report.shiftType === 'evening'
        ? 'الوردية المسائية'
        : 'وردية عامة';

  const isApprovedAndLocked = report.status === 'submitted' || report.status === 'archived' || !!report.handover;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Top action toolbar (Hidden during print) */}
      <div className="w-full max-w-[210mm] bg-slate-900 text-white rounded-t-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print shadow-xl border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm block">التقرير المالي المعتمد للوردية</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                مقاس A4 قياسي
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              رقم المستند: {report.reportNumber} | {formatDate(report.date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل PDF (A4)</span>
              </>
            )}
          </button>

          {/* Browser / System print dialog */}
          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>طباعة فورية</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Export progress toast */}
      {exportStatus && (
        <div className="w-full max-w-[210mm] bg-emerald-950/90 border-x border-emerald-500/40 text-emerald-200 text-xs py-2 px-5 flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportStatus}</span>
        </div>
      )}

      {/* Printable Sheet Container (Exact A4 proportion: 210mm width) */}
      <div 
        ref={printAreaRef}
        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl p-7 sm:p-9 rounded-b-2xl border-t border-slate-100 print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 flex flex-col justify-between"
      >
        <div>
          {/* 1. Official Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex items-start justify-between gap-4">
              
              {/* Brand & Document Name */}
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-500 tracking-wider">نظام إدارة الورديات والميزانية اليومية</h2>
                    <h1 className="text-xl font-black text-slate-950 tracking-tight">
                      {isConsolidated ? 'كشف حركة الصندوق والتقرير اليومي الشامل' : 'تقرير تسليم الوردية المعتمد'}
                    </h1>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  سجل محاسبي رسمي وموثق لحركة النقدية، الإيرادات، والمصروفات المعتمدة
                </p>
              </div>

              {/* Document Reference Box */}
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-w-[170px]">
                <div className="text-[10px] text-slate-500">رقم التقرير:</div>
                <div className="font-mono font-bold text-xs text-slate-900">{report.reportNumber}</div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-200 pt-1">
                  <span>التاريخ: {formatDate(report.date)}</span>
                  <span className="font-bold text-slate-900">{shiftLabel}</span>
                </div>
                {isApprovedAndLocked && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>معتمد ومؤرشف</span>
                  </div>
                )}
              </div>

            </div>

            {/* 2. Metadata Bar (4 Compact tiles - No redundancy) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs bg-slate-50/70 p-2.5 rounded-xl border">
              <div>
                <span className="text-slate-400 block text-[10px]">المسؤول / أمين الصندوق:</span>
                <span className="font-bold text-slate-800">{report.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الوردية / الفترة:</span>
                <span className="font-bold text-slate-800">{shiftLabel}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">المستلم / المدقق:</span>
                <span className="font-bold text-slate-800">{report.handover?.handedOverToName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">توقيت الاعتماد / التسليم:</span>
                <span className="font-mono font-medium text-slate-800">
                  {report.handover?.handedOverAt ? formatDateTime(report.handover.handedOverAt) : formatDateTime(report.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Unified Financial Ribbon (Zero Redundancy: Single source of truth) */}
          <div className="mb-5">
            <div className="grid grid-cols-4 gap-2 text-center">
              
              {/* Opening / Base Balance */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  دخل اليوم الأساسي (الحوباني)
                </span>
                <div className="font-mono font-black text-slate-900 text-base">
                  {formatCurrency(baseBalance)}
                  <span className="text-[10px] font-normal text-slate-500 mr-1">ر.س</span>
                </div>
              </div>

              {/* Total Incomes */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-800 mb-0.5">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                  <span>(+) إجمالي المقبوضات</span>
                  <span className="text-[9px] bg-emerald-200/60 px-1 rounded text-emerald-800">
                    {incomeTxs.length}
                  </span>
                </div>
                <div className="font-mono font-black text-emerald-700 text-base">
                  +{formatCurrency(totalIncomes)}
                  <span className="text-[10px] font-normal text-emerald-600 mr-1">ر.س</span>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-rose-800 mb-0.5">
                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                  <span>(-) إجمالي المصروفات</span>
                  <span className="text-[9px] bg-rose-200/60 px-1 rounded text-rose-800">
                    {expenseTxs.length}
                  </span>
                </div>
                <div className="font-mono font-black text-rose-700 text-base">
                  -{formatCurrency(totalExpenses)}
                  <span className="text-[10px] font-normal text-rose-600 mr-1">ر.س</span>
                </div>
              </div>

              {/* Net Shift Balance */}
              <div className="bg-sky-50 border-2 border-sky-400 rounded-xl p-3 shadow-xs">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-sky-950 mb-0.5">
                  <Wallet className="w-3 h-3 text-sky-700" />
                  <span>(=) الصافي (الرصيد الفعلي في الصندوق)</span>
                </div>
                <div className={`font-mono font-black text-base ${netBalance >= 0 ? 'text-sky-950' : 'text-rose-700'}`}>
                  {formatCurrency(netBalance)}
                  <span className="text-[10px] font-normal text-sky-800 mr-1">ر.س</span>
                </div>
              </div>

            </div>
          </div>

          {/* 4. Detailed Ledger Table */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>كشف الحركات المالية للوردية</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({transactions.length} حركة مسجلة)
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                المبالغ بالعملة المحلية (ر.س)
              </span>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-8">#</th>
                    <th className="py-2 px-3">البيان والتفاصيل</th>
                    <th className="py-2 px-3 w-28">التصنيف</th>
                    <th className="py-2 px-2.5 w-24">وسيلة الدفع</th>
                    <th className="py-2 px-2.5 w-18 text-center">الوقت</th>
                    <th className="py-2 px-3 w-28 text-left">المبلغ (ر.س)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50">
                        لا توجد حركات إضافية مسجلة خلال هذه الوردية، والصافي يطابق تماماً الرصيد الافتتاحي.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => {
                      const isInc = tx.type === 'income';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{tx.description}</div>
                            {tx.createdByName && tx.createdByName !== report.employeeName && (
                              <div className="text-[10px] text-slate-400">
                                سُجّلت بواسطة: {tx.createdByName} {tx.isCarriedOver ? '(مرحّلة مع العهدة)' : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">
                            {tx.categoryName}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                            {paymentMethodLabel[tx.paymentMethod] || tx.paymentMethod}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-500 text-[10px]">
                            {formatTime(tx.timestamp)}
                          </td>
                          <td className={`py-2 px-3 text-left font-mono font-bold text-xs ${isInc ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Table Footer Subtotals */}
                {transactions.length > 0 && (
                  <tfoot className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-[11px] text-slate-800">
                    <tr>
                      <td colSpan={2} className="py-2 px-3">
                        إجمالي حركات الوردية: {transactions.length} حركة
                      </td>
                      <td colSpan={2} className="py-2 px-3 text-left text-slate-600">
                        مقبوضات: <span className="font-mono text-emerald-700 font-bold">+{formatCurrency(totalIncomes)}</span> | مصروفات: <span className="font-mono text-rose-700 font-bold">-{formatCurrency(totalExpenses)}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500">
                        الصافي:
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-black text-xs text-sky-950">
                        {formatCurrency(totalIncomes - totalExpenses)} ر.س
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* 5. Handover Certification Box (If handed over) */}
          {report.handover && (
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl page-break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>محضر تسليم الوردية المعتمد رقمياً (Handover Protocol)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {formatDateTime(report.handover.handedOverAt)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 mb-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">الموظف المسلّم:</span>
                  <span className="font-bold text-slate-900">{report.handover.handedOverByName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الموظف المستلم:</span>
                  <span className="font-bold text-slate-900">{report.handover.handedOverToName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الصافي المسلّم للعهدة:</span>
                  <span className="font-mono font-black text-emerald-700">{formatCurrency(report.netBalance)} ر.س</span>
                </div>
              </div>
              {report.handover.handoverNotes && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mt-1">
                  <span className="font-bold text-slate-700 ml-1">ملاحظات التسليم:</span>
                  <span>{report.handover.handoverNotes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Official Signatures (Compact, non-overflowing for A4 page) */}
        <div className="mt-4 pt-4 border-t-2 border-slate-300 page-break-inside-avoid">
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            
            {/* Handed over by */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-bold text-slate-900">أمين الصندوق (المسلّم)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{report.employeeName}</p>
              </div>
              <div className="mt-8 pt-2 border-t border-dashed border-slate-400 text-[10px] text-slate-400 font-mono">
                التوقيع: ............................
              </div>
            </div>

            {/* Handed over to */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-bold text-slate-900">المستلم / المدقق</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{report.handover?.handedOverToName || '....................'}</p>
              </div>
              <div className="mt-8 pt-2 border-t border-dashed border-slate-400 text-[10px] text-slate-400 font-mono">
                التوقيع: ............................
              </div>
            </div>

            {/* Branch Management Stamp */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-bold text-slate-900">اعتماد إدارة الفرع</p>
                <p className="text-[10px] text-slate-500 mt-0.5">المصادقة والختم الرسمي</p>
              </div>
              <div className="mt-8 pt-2 border-t border-dashed border-slate-400 text-[10px] text-slate-400 font-mono">
                الختم: ............................
              </div>
            </div>

          </div>

          {/* 7. Security & Archival Footer */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-400 gap-1">
            <span>وثيقة نظامية رسمية معتمدة ومؤرشفة غير قابلة للتعديل - صادرة عبر نظام إدارة الورديات والميزانية اليومية</span>
            <span className="font-mono">تاريخ الطباعة: {formatDateTime(new Date())}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
