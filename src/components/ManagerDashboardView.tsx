/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User, ShiftReport, Transaction } from '../types';
import { storageService } from '../services/storage';
import { exportReportDataToPdf } from '../utils/pdfExport';
import { PrintReportView } from './PrintReportView';
import { formatTime, formatCurrency } from '../utils/dateFormatter';
import { 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  Tags, 
  History, 
  FileText, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  ArrowLeftRight,
  Printer,
  BarChart3,
  PieChart
} from 'lucide-react';

interface ManagerDashboardViewProps {
  currentUser: User;
  onNavigateTab: (tab: 'history' | 'categories' | 'users' | 'audit') => void;
}

export const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({
  currentUser,
  onNavigateTab
}) => {
  const [activeShift, setActiveShift] = useState<ShiftReport | null>(null);
  const [activeShiftTransactions, setActiveShiftTransactions] = useState<Transaction[]>([]);
  const [allReports, setAllReports] = useState<ShiftReport[]>([]);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [consolidatedData, setConsolidatedData] = useState<{ report: ShiftReport; transactions: Transaction[] } | null>(null);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<{ report: ShiftReport; transactions: Transaction[] } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await storageService.init();
      const reports = await storageService.getReports();
      setAllReports(reports);

      const users = await storageService.getUsers();
      setEmployeesCount(users.filter(u => u.role === 'employee').length);

      const cats = await storageService.getCategories();
      setCategoriesCount(cats.length);

      // Check if there is an active shift currently opened on the machine by any employee
      const currentActive = reports.find(r => r.status === 'active') || null;
      setActiveShift(currentActive);

      if (currentActive) {
        const txs = await storageService.getTransactionsByReportId(currentActive.id);
        setActiveShiftTransactions(txs);
      } else {
        setActiveShiftTransactions([]);
      }

      // Build today's consolidated report across all shifts
      const todayStr = new Date().toISOString().split('T')[0];
      const todayReports = reports.filter(r => r.date === todayStr);
      if (todayReports.length > 0) {
        let allDayTxs: Transaction[] = [];
        let baseIncome = todayReports[0].todayIncome;
        let totInc = 0;
        let totExp = 0;

        for (const rep of todayReports) {
          const txs = rep.frozenSnapshot?.transactions || (await storageService.getTransactionsByReportId(rep.id));
          allDayTxs = allDayTxs.concat(txs);
        }

        allDayTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        for (const t of allDayTxs) {
          if (t.type === 'income') totInc += Number(t.amount || 0);
          if (t.type === 'expense') totExp += Number(t.amount || 0);
        }

        setConsolidatedData({
          report: {
            id: `consolidated_${todayStr}`,
            reportNumber: `REP-${todayStr.replace(/-/g, '')}-DAILY-ALL`,
            date: todayStr,
            shiftType: 'general',
            userId: currentUser.id,
            employeeName: 'تقرير اليوم الشامل (كافة الورديات)',
            status: 'submitted',
            todayIncome: baseIncome,
            totalIncomes: totInc,
            totalExpenses: totExp,
            netBalance: baseIncome + totInc - totExp,
            createdAt: todayReports[todayReports.length - 1].createdAt,
            updatedAt: new Date().toISOString(),
          },
          transactions: allDayTxs
        });
      }
    } catch (e) {
      console.error('Failed loading manager dashboard', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleExportConsolidatedPdf = async () => {
    if (!consolidatedData) return;
    setIsExportingPdf(true);
    try {
      await exportReportDataToPdf(consolidatedData.report, consolidatedData.transactions);
    } catch (e) {
      alert('فشل تصدير التقرير اليومي الموحد');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Lifetime aggregates from submitted/archived reports
  const submittedReports = allReports.filter(r => r.status === 'submitted' || r.status === 'archived');
  const lifetimeIncome = submittedReports.reduce((sum, r) => sum + (r.totalIncomes || 0), 0);
  const lifetimeExpenses = submittedReports.reduce((sum, r) => sum + (r.totalExpenses || 0), 0);
  const lifetimeNet = submittedReports.reduce((sum, r) => sum + (r.netBalance || 0), 0);

  // Category breakdown for today's transactions (Visual analytics for management)
  const categoryBreakdown = useMemo(() => {
    if (!consolidatedData || consolidatedData.transactions.length === 0) return null;
    const txs = consolidatedData.transactions;

    const incomeMap: Record<string, { name: string; amount: number; count: number }> = {};
    const expenseMap: Record<string, { name: string; amount: number; count: number }> = {};

    let totalInc = 0;
    let totalExp = 0;

    for (const t of txs) {
      const amt = Number(t.amount || 0);
      const cat = t.categoryName || 'عام';
      if (t.type === 'income') {
        totalInc += amt;
        if (!incomeMap[cat]) incomeMap[cat] = { name: cat, amount: 0, count: 0 };
        incomeMap[cat].amount += amt;
        incomeMap[cat].count += 1;
      } else {
        totalExp += amt;
        if (!expenseMap[cat]) expenseMap[cat] = { name: cat, amount: 0, count: 0 };
        expenseMap[cat].amount += amt;
        expenseMap[cat].count += 1;
      }
    }

    const incomeCategories = Object.values(incomeMap).sort((a, b) => b.amount - a.amount);
    const expenseCategories = Object.values(expenseMap).sort((a, b) => b.amount - a.amount);

    return {
      totalInc,
      totalExp,
      incomeCategories,
      expenseCategories,
      totalTransactions: txs.length
    };
  }, [consolidatedData]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-sm">جاري تحميل لوحة الإشراف والمراقبة الإدارية...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Admin Role Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl mt-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black">لوحة الإشراف والرقابة الإدارية</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  صلاحيات مدير النظام
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                مرحباً <strong>{currentUser.displayName}</strong>. دورك إداري رقابي فقط؛ النظام مخصص للموظفين لتسجيل المعاملات وتسليم الورديات، بينما يختص دورك بالإشراف المالي، مراجعة الأرشيف، اعتماد التقارير، وإدارة الفئات والموظفين.
              </p>
            </div>
          </div>

          {/* Quick Consolidated Export */}
          {consolidatedData && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedReportForPreview(consolidatedData)}
                className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>معاينة التقرير الموحد</span>
              </button>

              <button
                type="button"
                onClick={handleExportConsolidatedPdf}
                disabled={isExportingPdf}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingPdf ? 'جاري التصدير...' : 'تصدير يوم كامل PDF'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Shared Cashier Machine Monitor */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">مراقبة جهاز الكاشير ونقاط البيع المشترك (Live Terminal Monitor)</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            {formatTime(new Date())}
          </span>
        </div>

        {activeShift ? (
          <div className="bg-slate-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-900">
                  توجد وردية نشطة حالياً على الجهاز برقم: {activeShift.reportNumber}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {activeShift.shiftType === 'morning' ? 'الوردية الصباحية' : 'الوردية المسائية'}
                </span>
              </div>

              <div className="text-xs text-slate-600">
                الموظف المسؤول الحالي: <strong className="text-slate-900">{activeShift.employeeName}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 text-center text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">دخل اليوم الأساسي (الحوباني)</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(activeShift.todayIncome)} ر.س</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-emerald-700 block mb-0.5">إجمالي الإيرادات اللحظية (+)</span>
                <span className="font-mono font-bold text-emerald-600">+{formatCurrency(activeShift.totalIncomes)} ر.س</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-rose-700 block mb-0.5">إجمالي المصروفات اللحظية (-)</span>
                <span className="font-mono font-bold text-rose-600">-{formatCurrency(activeShift.totalExpenses)} ر.س</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-700 block mb-0.5">صافي الصندوق اللحظي (=)</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(activeShift.netBalance)} ر.س</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>تسجيل المعاملات والمدفوعات محصور بموظف الوردية فقط. يملك الإداري صلاحية الرقابة والمعاينة.</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedReportForPreview({ report: activeShift, transactions: activeShiftTransactions })}
                className="py-1 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>معاينة حركات الوردية ({activeShiftTransactions.length})</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">لا توجد وردية مفتوحة على الجهاز حالياً</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              الجهاز في وضع الجاهزية والاستعداد بانتظار تسجيل دخول موظف الوردية وبدء تقريره المالي.
            </p>
          </div>
        )}
      </div>

      {/* Visual Analytics: Income & Expense Category Breakdown for Management */}
      {categoryBreakdown && (categoryBreakdown.incomeCategories.length > 0 || categoryBreakdown.expenseCategories.length > 0) && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">التحليل المالي وتوزيع الحركات حسب الفئات (اليوم)</h3>
                <p className="text-[11px] text-slate-500">
                  تحليل نسبي لمصادر المقبوضات وبنود المصروفات لكافة ورديات اليوم ({categoryBreakdown.totalTransactions} حركة)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                مقبوضات: +{formatCurrency(categoryBreakdown.totalInc)} ر.س
              </span>
              <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                مصروفات: -{formatCurrency(categoryBreakdown.totalExp)} ر.س
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Income Categories Breakdown */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>توزيع المقبوضات حسب الفئة</span>
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {categoryBreakdown.incomeCategories.length} فئة نشطة
                </span>
              </div>

              {categoryBreakdown.incomeCategories.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">لا توجد إيرادات مسجلة اليوم حتى الآن.</p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.incomeCategories.map(cat => {
                    const pct = categoryBreakdown.totalInc > 0 
                      ? Math.round((cat.amount / categoryBreakdown.totalInc) * 100) 
                      : 0;
                    return (
                      <div key={cat.name} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({cat.count} حركة)</span>
                          </span>
                          <span className="font-mono font-bold text-emerald-700">
                            +{formatCurrency(cat.amount)} ر.س <span className="text-[10px] text-slate-500 font-normal font-sans">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expense Categories Breakdown */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>توزيع المصروفات حسب الفئة</span>
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {categoryBreakdown.expenseCategories.length} فئة نشطة
                </span>
              </div>

              {categoryBreakdown.expenseCategories.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">لا توجد مصروفات مسجلة اليوم حتى الآن.</p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.expenseCategories.map(cat => {
                    const pct = categoryBreakdown.totalExp > 0 
                      ? Math.round((cat.amount / categoryBreakdown.totalExp) * 100) 
                      : 0;
                    return (
                      <div key={cat.name} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({cat.count} حركة)</span>
                          </span>
                          <span className="font-mono font-bold text-rose-700">
                            -{formatCurrency(cat.amount)} ر.س <span className="text-[10px] text-slate-500 font-normal font-sans">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Administrative System Hub Navigation Cards */}
      <div>
        <h3 className="font-bold text-slate-900 text-sm mb-3">الوظائف والمهام الإدارية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div 
            onClick={() => onNavigateTab('history')}
            className="bg-white border border-slate-200 hover:border-emerald-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-md text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">أرشيف الورديات والتسليم</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              مراجعة كافة تقارير الورديات السابقة، محاضر التسليم، وتصدير نسخ PDF المعتمدة للأرشفة.
            </p>
            <div className="mt-3 text-xs font-bold text-blue-600 flex items-center gap-1">
              <span>عرض الأرشيف ({allReports.length} تقرير) ←</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('categories')}
            className="bg-white border border-slate-200 hover:border-emerald-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-md text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Tags className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">إدارة فئات الإيرادات والمصروفات</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              تحديد وتعديل وتصنيف فئات المقبوضات والمدفوعات المتاحة للموظفين أثناء الورديات.
            </p>
            <div className="mt-3 text-xs font-bold text-amber-600 flex items-center gap-1">
              <span>إدارة الفئات ({categoriesCount} فئة) ←</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('users')}
            className="bg-white border border-slate-200 hover:border-emerald-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-md text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">الموظفين وأمان رموز الـ PIN</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              إضافة الموظفين، تحديد الورديات، إعادة تعيين رموز الـ PIN المشفرة، وفك أقفال الحسابات.
            </p>
            <div className="mt-3 text-xs font-bold text-indigo-600 flex items-center gap-1">
              <span>إدارة الموظفين ({employeesCount} موظف) ←</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('audit')}
            className="bg-white border border-slate-200 hover:border-emerald-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-md text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">سجل الأنشطة والتدقيق الأمني</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              تتبع جميع عمليات الدخول، قفل الجلسات، تسليم الورديات، وتغييرات النظام بالوقت الدقيق.
            </p>
            <div className="mt-3 text-xs font-bold text-emerald-600 flex items-center gap-1">
              <span>سجل التدقيق (Audit Trail) ←</span>
            </div>
          </div>

        </div>
      </div>

      {/* Financial Health & Approved Aggregates */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3">الملخص المالي الكلي المعتمد بالتقارير المسلّمة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
            <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
              <span className="font-bold">إجمالي الإيرادات المعتمدة</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-700">
              +{formatCurrency(lifetimeIncome)} <span className="text-xs font-sans">ر.س</span>
            </div>
          </div>

          <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-xl">
            <div className="flex items-center justify-between text-xs text-rose-800 mb-1">
              <span className="font-bold">إجمالي المصروفات المعتمدة</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-black font-mono text-rose-700">
              -{formatCurrency(lifetimeExpenses)} <span className="text-xs font-sans">ر.س</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span className="font-bold text-emerald-400">إجمالي الأرصدة الصافية المسلّمة</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-400">
              {formatCurrency(lifetimeNet)} <span className="text-xs font-sans text-slate-300">ر.س</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      {selectedReportForPreview && (
        <PrintReportView
          report={selectedReportForPreview.report}
          transactions={selectedReportForPreview.transactions}
          onClose={() => setSelectedReportForPreview(null)}
        />
      )}

    </div>
  );
};
