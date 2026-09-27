/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShiftReport, Transaction, Category, User, ShiftType, TransactionType, PaymentMethod, ReportSnapshot } from '../types';
import { storageService } from '../services/storage';
import { sha256 } from '../utils/crypto';
import { ShiftHandoverModal } from './ShiftHandoverModal';
import { PrintReportView } from './PrintReportView';
import { exportReportDataToPdf } from '../utils/pdfExport';
import { formatDate, formatTime, formatCurrency } from '../utils/dateFormatter';
import { soundManager } from '../utils/audioFeedback';
import { 
  PlusCircle, 
  MinusCircle,
  ArrowLeftRight, 
  Printer, 
  Trash2, 
  Clock, 
  CreditCard, 
  Banknote, 
  CheckCircle,
  AlertCircle,
  Download,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Edit3,
  X,
  Plus,
  KeyRound,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

interface ActiveReportViewProps {
  currentUser: User;
  onBalanceChange?: (balance: number, txCount: number) => void;
  externalTriggerAddTx?: boolean;
  onResetExternalTriggerAddTx?: () => void;
  externalTriggerHandover?: boolean;
  onResetExternalTriggerHandover?: () => void;
  focusTransactionsSection?: boolean;
}

export const ActiveReportView: React.FC<ActiveReportViewProps> = ({ 
  currentUser,
  onBalanceChange,
  externalTriggerAddTx = false,
  onResetExternalTriggerAddTx,
  externalTriggerHandover = false,
  onResetExternalTriggerHandover,
  focusTransactionsSection = false
}) => {
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Modals state
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditIncomeModal, setShowEditIncomeModal] = useState(false);

  // External trigger listeners from Mobile FAB & Bottom Navigation
  useEffect(() => {
    if (externalTriggerAddTx) {
      handleOpenAddTx('income');
      onResetExternalTriggerAddTx?.();
    }
  }, [externalTriggerAddTx]);

  useEffect(() => {
    if (externalTriggerHandover) {
      if (report && report.status === 'active') {
        setShowHandoverModal(true);
      }
      onResetExternalTriggerHandover?.();
    }
  }, [externalTriggerHandover, report]);

  useEffect(() => {
    if (focusTransactionsSection) {
      const el = document.getElementById('transactions-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [focusTransactionsSection]);

  // New Transaction Form State
  const [txType, setTxType] = useState<TransactionType>('income');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('cash');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Pending Handover Wizard & New Shift Initialization State (if no active shift)
  const [pendingReport, setPendingReport] = useState<ShiftReport | null>(null);
  const [wizardStep, setWizardStep] = useState<'select' | 'manual' | 'claim_pin'>('manual');
  const [claimPin, setClaimPin] = useState('');
  const [claimShiftType, setClaimShiftType] = useState<ShiftType>(currentUser.shiftType === 'evening' ? 'evening' : 'morning');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // New Shift Initialization State (if no active shift)
  const [initTodayIncome, setInitTodayIncome] = useState<string>('500');
  const [initShiftType, setInitShiftType] = useState<ShiftType>(currentUser.shiftType === 'evening' ? 'evening' : 'morning');

  // Edit Today's Income State
  const [tempTodayIncome, setTempTodayIncome] = useState<string>('0');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const loadActiveData = async () => {
    setIsLoading(true);
    try {
      const activeReport = await storageService.getActiveReportForUser(currentUser.id);
      const allCategories = await storageService.getCategories();
      setCategories(allCategories);

      if (activeReport) {
        setReport(activeReport);
        setPendingReport(null);
        const txList = await storageService.getTransactionsByReportId(activeReport.id);
        setTransactions(txList);
        await updateReportTotals(activeReport, txList);
      } else {
        setReport(null);
        setTransactions([]);
        onBalanceChange?.(0, 0);

        // Scan for pending handovers for this user
        const allReports = await storageService.getReports();
        const pending = allReports.find(r => 
          r.status === 'submitted' &&
          r.handover?.handedOverToUserId === currentUser.id &&
          !allReports.some(other => other.previousReportId === r.id)
        ) || null;

        setPendingReport(pending);
        setWizardStep(pending ? 'select' : 'manual');
        if (pending) {
          const suggestedShift: ShiftType = pending.shiftType === 'morning' ? 'evening' : 'morning';
          setClaimShiftType(currentUser.shiftType && currentUser.shiftType !== 'general' ? currentUser.shiftType : suggestedShift);
        }
      }
    } catch (error) {
      console.error('Failed loading active report data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveData();
  }, [currentUser]);

  // POS Keyboard Shortcuts (F2: Income, F4: Expense, F8: Handover, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'Escape') {
        setShowAddTxModal(false);
        setEditingTxId(null);
        setShowHandoverModal(false);
        setShowPrintModal(false);
        setShowEditIncomeModal(false);
        return;
      }

      if (isInput) return;

      if (report && report.status === 'active') {
        if (e.key === 'F2' || (e.altKey && (e.key === 'i' || e.key === 'I' || e.key === 'ه'))) {
          e.preventDefault();
          handleOpenAddTx('income');
        } else if (e.key === 'F4' || (e.altKey && (e.key === 'e' || e.key === 'E' || e.key === 'ث'))) {
          e.preventDefault();
          handleOpenAddTx('expense');
        } else if (e.key === 'F8' || (e.altKey && (e.key === 'h' || e.key === 'H' || e.key === 'ا'))) {
          e.preventDefault();
          setShowHandoverModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [report, categories]);

  const updateReportTotals = async (currentReport: ShiftReport, txList: Transaction[]) => {
    let inc = 0;
    let exp = 0;
    txList.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') inc += amt;
      if (t.type === 'expense') exp += amt;
    });

    const baseIncome = currentReport.carriedBalanceFromPrevious != null 
      ? Number(currentReport.carriedBalanceFromPrevious) 
      : Number(currentReport.todayIncome || 0);

    const net = baseIncome + inc - exp;

    const updated = {
      ...currentReport,
      totalIncomes: inc,
      totalExpenses: exp,
      netBalance: net,
      updatedAt: new Date().toISOString()
    };

    if (
      currentReport.totalIncomes !== inc ||
      currentReport.totalExpenses !== exp ||
      currentReport.netBalance !== net
    ) {
      await storageService.saveReport(updated, currentUser.id);
      setReport(updated);
    }
    onBalanceChange?.(net, txList.length);
  };

  const handleStartNewShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const incomeVal = parseFloat(initTodayIncome) || 0;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const reportNum = `SH-${dateStr.replace(/-/g, '')}-${initShiftType === 'morning' ? 'M' : initShiftType === 'evening' ? 'E' : 'N'}-${Math.floor(100 + Math.random() * 900)}`;

    const newReport: ShiftReport = {
      id: 'rep_' + Date.now(),
      reportNumber: reportNum,
      date: dateStr,
      shiftType: initShiftType,
      userId: currentUser.id,
      employeeName: currentUser.displayName,
      todayIncome: incomeVal,
      totalIncomes: 0,
      totalExpenses: 0,
      netBalance: incomeVal,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await storageService.saveReport(newReport, currentUser.id);
    await storageService.logAction(
      currentUser.id,
      currentUser.displayName,
      'افتتاح صندوق جديد',
      `تم افتتاح صندوق وردية جديدة برقم ${reportNum} ودخل يوم أساسي ${incomeVal} ر.س`
    );
    soundManager.playSuccess();
    setReport(newReport);
    setTransactions([]);
    setPendingReport(null);
    onBalanceChange?.(incomeVal, 0);
  };

  const handleConfirmClaimPendingReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingReport) return;
    setClaimError(null);

    if (!claimPin) {
      setClaimError('يرجى إدخال رمز PIN السري الخاص بك لتأكيد الاستلام');
      return;
    }

    setIsClaiming(true);
    try {
      // 1. Verify currentUser PIN
      const inputHash = await sha256(claimPin);
      if (inputHash !== currentUser.pinHash) {
        throw new Error('رمز PIN غير صحيح، يرجى المحاولة مرة أخرى.');
      }

      // 2. Fetch original transactions from the handed-over report for carbon-copy cloning
      const sourceTxs = await storageService.getTransactionsByReportId(pendingReport.id);

      // 3. Prepare new stage report context
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const nextStage = (pendingReport.stageNumber || 1) + 1;
      const continuousId = pendingReport.continuousReportId || pendingReport.reportNumber;
      const newReportNumber = `REP-${dateStr.replace(/-/g, '')}-0${nextStage}`;
      const newReportId = 'rep_' + Date.now();

      // Inherit the exact same "دخل اليوم الأساسي (الحوباني)" from the previous report
      const inheritedTodayIncome = Number(pendingReport.todayIncome || 0);

      // Calculate initial totals from original transactions
      let initialTotalIncomes = 0;
      let initialTotalExpenses = 0;
      for (const tx of sourceTxs) {
        if (tx.type === 'income') initialTotalIncomes += Number(tx.amount || 0);
        if (tx.type === 'expense') initialTotalExpenses += Number(tx.amount || 0);
      }

      // Calculate exact base balance
      const initialBase = pendingReport.carriedBalanceFromPrevious != null 
        ? Number(pendingReport.carriedBalanceFromPrevious) 
        : inheritedTodayIncome;
      const initialNet = initialBase + initialTotalIncomes - initialTotalExpenses;

      // 4. Create Received Snapshot for accountability
      const receivedSnapshot: ReportSnapshot = {
        snapshotType: 'received',
        generatedAt: now.toISOString(),
        userId: currentUser.id,
        employeeName: currentUser.displayName,
        reportNumber: newReportNumber,
        continuousReportId: continuousId,
        stageNumber: nextStage,
        shiftType: claimShiftType,
        date: dateStr,
        openingCash: initialBase,
        totalIncomes: initialTotalIncomes,
        totalExpenses: initialTotalExpenses,
        netBalance: initialNet,
        actualDrawerBalance: initialNet,
        discrepancy: 0,
        counterpartUserId: pendingReport.userId,
        counterpartName: pendingReport.employeeName,
        notes: `تم استلام ونسخ تقرير الوردية انشطارياً برقم ${pendingReport.reportNumber} من الزميل ${pendingReport.handover?.handedOverByName || pendingReport.employeeName} مع استنساخ ${sourceTxs.length} حركة بصافي رصيد ${formatCurrency(initialNet)} ر.س`,
        transactions: JSON.parse(JSON.stringify(sourceTxs))
      };

      // 5. Create Brand-New Cloned Report Object
      const newReport: ShiftReport = {
        id: newReportId,
        continuousReportId: continuousId,
        stageNumber: nextStage,
        reportNumber: newReportNumber,
        date: dateStr,
        shiftType: claimShiftType,
        userId: currentUser.id,
        employeeName: currentUser.displayName,
        status: 'active',
        todayIncome: inheritedTodayIncome,
        ...(pendingReport.carriedBalanceFromPrevious != null ? { carriedBalanceFromPrevious: pendingReport.carriedBalanceFromPrevious } : {}),
        previousReportId: pendingReport.id,
        totalIncomes: initialTotalIncomes,
        totalExpenses: initialTotalExpenses,
        netBalance: initialNet,
        receivedSnapshot: receivedSnapshot,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      // Save the new branched report
      await storageService.saveReport(newReport, currentUser.id);

      // 6. Deeply Clone All Transactions into independent database rows with overwritten ownership
      const clonedTransactions: Transaction[] = [];
      for (let i = 0; i < sourceTxs.length; i++) {
        const origTx = sourceTxs[i];
        const clonedTx: Transaction = {
          ...origTx,
          id: `tx_cloned_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          reportId: newReport.id,
          stageId: newReport.id,
          continuousReportId: continuousId,
          // OVERWRITE ownership metadata to grant full edit/delete authorization to current employee
          createdBy: currentUser.id,
          createdByName: currentUser.displayName,
          timestamp: origTx.timestamp || now.toISOString(),
          isCarriedOver: false // Unrestricted live shift row!
        };

        await storageService.saveTransaction(clonedTx, currentUser.id);
        clonedTransactions.push(clonedTx);
      }

      // Re-read report to guarantee perfect database sync
      const finalReport = await storageService.getReportById(newReport.id) || newReport;

      // 7. Audit log (Preserving historical record untouched in IndexedDB)
      await storageService.logAction(
        currentUser.id,
        currentUser.displayName,
        'استلام ونسخ تقرير انشطاري',
        `تم استلام تقرير الوردية ${pendingReport.reportNumber} للزميل ${pendingReport.handover?.handedOverByName || pendingReport.employeeName} ونسخه انشطارياً بالكامل بعدد ${clonedTransactions.length} حركة ورصيد ${formatCurrency(finalReport.netBalance)} ر.س`
      );

      soundManager.playSuccess();
      setReport(finalReport);
      setTransactions(clonedTransactions);
      setPendingReport(null);
      setClaimPin('');
      onBalanceChange?.(finalReport.netBalance, clonedTransactions.length);
    } catch (err: any) {
      setClaimError(err.message || 'فشل استلام التقرير المعلق');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSaveTodayIncome = async () => {
    if (!report) return;
    const val = parseFloat(tempTodayIncome) || 0;
    const updated: ShiftReport = {
      ...report,
      todayIncome: val,
      ...(report.carriedBalanceFromPrevious != null ? { carriedBalanceFromPrevious: val } : {}),
      netBalance: val + report.totalIncomes - report.totalExpenses,
      updatedAt: new Date().toISOString()
    };
    try {
      await storageService.saveReport(updated, currentUser.id);
      setReport(updated);
      onBalanceChange?.(updated.netBalance, transactions.length);
      soundManager.playSuccess();
      setShowEditIncomeModal(false);
    } catch (err: any) {
      console.error('Failed saving today income', err);
      alert(err.message || 'حدث خطأ أثناء تعديل المبلغ');
    }
  };

  const handleOpenAddTx = (type: TransactionType = 'income') => {
    setTxType(type);
    setTxAmount('');
    setTxDescription('');
    setTxPaymentMethod('cash');
    setEditingTxId(null);
    setShowAddTxModal(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxDescription(tx.description);
    setTxPaymentMethod(tx.paymentMethod);
    setShowAddTxModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    const amountVal = parseFloat(txAmount);
    if (!amountVal || amountVal <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const defaultDesc = txType === 'income' ? 'مبيعات نقدية' : 'مصروفات عامة';
    const finalDesc = txDescription.trim() || defaultDesc;

    // Find or create appropriate category
    const cat = categories.find(c => c.type === txType) || { id: 'cat_gen', name: txType === 'income' ? 'مبيعات' : 'مصروفات' };

    try {
      if (editingTxId) {
        const existing = transactions.find(t => t.id === editingTxId);
        if (!existing) return;
        const updatedTx: Transaction = {
          ...existing,
          type: txType,
          categoryId: cat.id,
          categoryName: cat.name,
          amount: amountVal,
          description: finalDesc,
          paymentMethod: txPaymentMethod,
        };

        await storageService.saveTransaction(updatedTx, currentUser.id);
        const updatedList = transactions.map(t => t.id === editingTxId ? updatedTx : t);
        setTransactions(updatedList);
        await updateReportTotals(report, updatedList);
      } else {
        const newTx: Transaction = {
          id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          reportId: report.id,
          stageId: report.id,
          continuousReportId: report.continuousReportId || report.reportNumber,
          type: txType,
          categoryId: cat.id,
          categoryName: cat.name,
          amount: amountVal,
          description: finalDesc,
          paymentMethod: txPaymentMethod,
          timestamp: new Date().toISOString(),
          createdBy: currentUser.id,
          createdByName: currentUser.displayName
        };

        await storageService.saveTransaction(newTx, currentUser.id);
        const updatedList = [...transactions, newTx];
        setTransactions(updatedList);
        await updateReportTotals(report, updatedList);
      }

      soundManager.playSuccess();
      setEditingTxId(null);
      setShowAddTxModal(false);
    } catch (err: any) {
      console.error('Failed saving transaction', err);
      alert(err.message || 'فشلت عملية الحفظ');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!report) return;
    if (window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      try {
        await storageService.deleteTransaction(id, currentUser.id);
        const updatedList = transactions.filter(t => t.id !== id);
        setTransactions(updatedList);
        await updateReportTotals(report, updatedList);
      } catch (err: any) {
        console.error('Failed deleting transaction', err);
        alert(err.message || 'فشلت عملية الحذف');
      }
    }
  };

  const handleExportCurrentPdf = async () => {
    if (!report) return;
    setIsExportingPdf(true);
    try {
      await exportReportDataToPdf(report, transactions);
    } catch (e) {
      console.error('Failed exporting active report PDF', e);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
        <p className="text-sm font-semibold">جاري فتح شاشة الصندوق...</p>
      </div>
    );
  }

  // 1. Initial State: No active shift - Dynamic Dual-Choice Wizard
  if (!report || report.status !== 'active') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl mb-3 shadow-xs border border-emerald-100">
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            افتتاح الصندوق وبدء الوردية
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            مرحباً بك <span className="font-bold text-slate-800">{currentUser.displayName}</span>. اختر آلية بدء العمل لتسجيل حركات الصندوق.
          </p>
        </div>

        {/* STEP 1: DUAL-CHOICE SELECTION CARDS (When pendingReport exists and step is 'select') */}
        {pendingReport && wizardStep === 'select' && (
          <div className="space-y-4">
            
            {/* CARD B: CLAIM PENDING REPORT (Top & Prominently Highlighted in Soft Emerald Container) */}
            <div className="relative bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-2 border-emerald-500/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-full shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>تقرير بانتظار استلامك</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-white/90 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {pendingReport.reportNumber}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-right">
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                  <span>استلام تقرير معلق وبدء الوردية</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  تم تسليم هذه الوردية لك بواسطة الزميل{' '}
                  <strong className="text-slate-900 font-bold">
                    {pendingReport.handover?.handedOverByName || pendingReport.employeeName}
                  </strong>
                  . سيتم استنساخ التقرير انشطارياً ونقل كافة حركاته لحسابك بصلاحية كاملة للتعديل والحذف (✏️/🗑️) لإصلاح أي أخطاء، مع بقاء تقرير زميلك التاريخي مجمداً دون تغيير.
                </p>
              </div>

              {/* Handed-over Amount highlight */}
              <div className="bg-white/95 border border-emerald-200/90 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-xs">
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    دخل اليوم الأساسي المرحّل (الحوباني)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    صافي رصيد الدرج المسلّم من الوردية السابقة
                  </span>
                </div>
                <div className="text-left font-mono font-black text-emerald-700 text-lg sm:text-xl">
                  {formatCurrency(pendingReport.netBalance)}{' '}
                  <span className="text-xs font-normal text-slate-400 font-sans">ر.س</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setClaimError(null);
                  setClaimPin('');
                  setWizardStep('claim_pin');
                }}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <FileCheck className="w-4 h-4" />
                <span>استلام التقرير وبدء الوردية ⭠</span>
              </button>
            </div>

            {/* CARD A: NEW MANUAL REPORT */}
            <div className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-3xl p-5 sm:p-6 shadow-xs transition-all text-right">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  افتتاح صندوق وبدء وردية بتقرير جديد
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                بدء يوم عمل مستقل أو وردية منفصلة وإدخال دخل اليوم الأساسي (الحوباني) يدوياً دون ربطه بالتقرير السابق.
              </p>
              <button
                type="button"
                onClick={() => setWizardStep('manual')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>متابعة إدخال تقرير جديد يدوياً</span>
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: CLAIM CONFIRMATION & PIN INTERFACE */}
        {pendingReport && wizardStep === 'claim_pin' && (
          <div className="bg-white border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    تأكيد استلام التقرير المعلق
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    رقم التقرير: <span className="font-mono font-bold text-slate-700">{pendingReport.reportNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWizardStep('select')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                ← رجوع
              </button>
            </div>

            {claimError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{claimError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmClaimPendingReport} className="space-y-4 text-right">
              {/* Report Inherited Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">الموظف المسلِّم:</span>
                  <span className="font-bold text-slate-800">{pendingReport.handover?.handedOverByName || pendingReport.employeeName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">دخل اليوم الأساسي المرحّل (الحوباني):</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">{formatCurrency(pendingReport.netBalance)} ر.س</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500">المرحلة الجديدة في التقرير:</span>
                  <span className="font-bold text-blue-700">المرحلة {(pendingReport.stageNumber || 1) + 1} (استكمال متسلسل)</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500">صلاحيات الحركات:</span>
                  <span className="font-bold text-emerald-700">نسخ انشطاري كامل مع صلاحية التعديل والحذف (✏️/🗑️)</span>
                </div>
              </div>

              {/* Shift Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع ورديتك الحالية *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClaimShiftType('morning')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      claimShiftType === 'morning'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    الوردية الصباحية
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimShiftType('evening')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      claimShiftType === 'evening'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    الوردية المسائية
                  </button>
                </div>
              </div>

              {/* Secure PIN Entry */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رمز PIN السري الخاص بك لتأكيد الاستلام *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={claimPin}
                    onChange={(e) => setClaimPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    autoFocus
                    className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-center font-mono tracking-widest text-lg font-bold text-slate-900 focus:outline-none"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أدخل رمز PIN لتسجيل لقطة الاستلام الرسمية وبدء ورديتك فوراً
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWizardStep('select')}
                  className="py-3 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isClaiming || !claimPin}
                  className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isClaiming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الاستلام وفتح الصندوق</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: MANUAL INITIALIZATION FORM (Default if no pending report, or chosen via Card A) */}
        {(!pendingReport || wizardStep === 'manual') && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            {pendingReport && (
              <div className="mb-5 p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">
                  يوجد تقرير معلق بانتظارك من الزميل{' '}
                  <strong>{pendingReport.handover?.handedOverByName || pendingReport.employeeName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setWizardStep('select')}
                  className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                >
                  خيارات الاستلام ←
                </button>
              </div>
            )}

            <form onSubmit={handleStartNewShift} className="space-y-5 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  دخل اليوم الأساسي (الحوباني) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={initTodayIncome}
                    onChange={(e) => setInitTodayIncome(e.target.value)}
                    className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xl font-mono font-black text-slate-900 focus:outline-none"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="absolute left-4 top-3.5 text-xs text-slate-400 font-bold">ر.س</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أدخل المبلغ الافتتاحي النقدي المتواجد في درج الصندوق
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع الوردية *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInitShiftType('morning')}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      initShiftType === 'morning'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    الوردية الصباحية
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitShiftType('evening')}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      initShiftType === 'evening'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    الوردية المسائية
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>فتح الصندوق وبدء العمل</span>
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Active Shift Calculations
  const incomeTxs = transactions.filter(t => t.type === 'income');
  const expenseTxs = transactions.filter(t => t.type === 'expense');
  const totalIncomes = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpenses = expenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const baseBalance = report.carriedBalanceFromPrevious != null 
    ? Number(report.carriedBalanceFromPrevious) 
    : Number(report.todayIncome || 0);

  // دخل اليوم الأساسي + المقبوضات - المصروفات = الصافي (الرصيد الحالي الفعلي في الصندوق)
  const netBalance = baseBalance + totalIncomes - totalExpenses;

  // Filtered transactions for simple display
  const displayedTxs = transactions.filter(t => {
    if (txFilter === 'income') return t.type === 'income';
    if (txFilter === 'expense') return t.type === 'expense';
    return true;
  });

  const shiftLabel = report.shiftType === 'morning' ? 'الوردية الصباحية' : 'الوردية المسائية';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* 1. Header Bar: Meta and Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-sm">{shiftLabel}</span>
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
              {report.reportNumber}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            المسؤول: <span className="font-semibold text-slate-800">{report.employeeName}</span> | التاريخ: {formatDate(report.date)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrentPdf}
            disabled={isExportingPdf}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="تحميل التقرير كملف PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>تحميل PDF</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="طباعة التقرير"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Cashbox Card: Big, Clean, Central */}
      <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        
        <span className="text-xs sm:text-sm font-bold text-slate-500 block mb-1">
          الصافي (الرصيد الحالي الفعلي في الصندوق)
        </span>

        {/* Big Balance Display */}
        <div className="flex items-baseline justify-center gap-2 my-2">
          <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${netBalance >= 0 ? 'text-slate-950' : 'text-rose-600'}`}>
            {formatCurrency(netBalance)}
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-600">ر.س</span>
        </div>

        {/* Mathematical formula badge */}
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl text-[11px] sm:text-xs text-slate-600 my-1 font-mono font-medium">
          <span>دخل اليوم الأساسي ({formatCurrency(baseBalance)})</span>
          <span className="text-emerald-600 font-bold">+</span>
          <span className="text-emerald-700">المقبوضات ({formatCurrency(totalIncomes)})</span>
          <span className="text-rose-600 font-bold">-</span>
          <span className="text-rose-700">المصروفات ({formatCurrency(totalExpenses)})</span>
          <span className="text-slate-400 font-bold">=</span>
          <span className="text-slate-950 font-black">{formatCurrency(netBalance)} ر.س</span>
        </div>

        {/* 3 Inline Pillars: Opening, Incomes, Expenses */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto my-5 pt-5 border-t border-slate-100 text-center">
          
          {/* Opening Cash / Today Base Income */}
          <div className="p-2 sm:p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col justify-between items-center">
            <span className="text-[10px] sm:text-xs text-slate-600 font-bold block mb-0.5">
              دخل اليوم الأساسي (الحوباني)
            </span>
            <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm my-0.5">
              {formatCurrency(baseBalance)} <span className="text-[10px] text-slate-400">ر.س</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempTodayIncome(baseBalance.toString());
                setShowEditIncomeModal(true);
              }}
              className="text-[10px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg mt-1 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
              title="تعديل وتحديث دخل اليوم الأساسي (الحوباني) أثناء جريان الوردية"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>تحديث المبلغ</span>
            </button>
          </div>

          {/* Incomes */}
          <div className="p-2 sm:p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/70">
            <span className="text-[10px] sm:text-xs text-emerald-800 font-semibold block mb-0.5">
              (+) المقبوضات
            </span>
            <div className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
              +{formatCurrency(totalIncomes)} <span className="text-[10px] text-emerald-600">ر.س</span>
            </div>
            <span className="text-[10px] text-emerald-600/90 font-medium block mt-1">
              ({incomeTxs.length} حركة)
            </span>
          </div>

          {/* Expenses */}
          <div className="p-2 sm:p-3 bg-rose-50/70 rounded-2xl border border-rose-200/70">
            <span className="text-[10px] sm:text-xs text-rose-800 font-semibold block mb-0.5">
              (-) المصروفات
            </span>
            <div className="font-mono font-bold text-rose-700 text-xs sm:text-sm">
              -{formatCurrency(totalExpenses)} <span className="text-[10px] text-rose-600">ر.س</span>
            </div>
            <span className="text-[10px] text-rose-600/90 font-medium block mt-1">
              ({expenseTxs.length} حركة)
            </span>
          </div>

        </div>

        {/* 3 Main Action Buttons: Big, Unmistakable, Friendly */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 max-w-2xl mx-auto">
          
          {/* Add Income */}
          <button
            onClick={() => handleOpenAddTx('income')}
            className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-emerald-200" />
            <span>تسجيل مقبوضات (دخل)</span>
          </button>

          {/* Add Expense */}
          <button
            onClick={() => handleOpenAddTx('expense')}
            className="py-3.5 px-4 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white rounded-2xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <MinusCircle className="w-5 h-5 text-rose-200" />
            <span>تسجيل مصروف (صرف)</span>
          </button>

          {/* Handover Shift */}
          <button
            onClick={() => setShowHandoverModal(true)}
            className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-2xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeftRight className="w-5 h-5 text-sky-400" />
            <span>تسليم الوردية وإغلاق</span>
          </button>

        </div>

      </div>

      {/* 3. Simple Transactions Table */}
      <div id="transactions-section" className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs scroll-mt-20">
        
        {/* Table Header & Quick Filter */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm">سجل حركات الوردية</h3>
            <p className="text-[11px] text-slate-500">
              إجمالي {transactions.length} حركة مسجلة خلال هذه الوردية
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                txFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({transactions.length})
            </button>
            <button
              onClick={() => setTxFilter('income')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                txFilter === 'income'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مقبوضات ({incomeTxs.length})
            </button>
            <button
              onClick={() => setTxFilter('expense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                txFilter === 'expense'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مصروفات ({expenseTxs.length})
            </button>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-bold w-12 text-center">النوع</th>
                <th className="py-3 px-4 font-bold">البيان والتفاصيل</th>
                <th className="py-3 px-4 font-bold w-28">طريقة الدفع</th>
                <th className="py-3 px-4 font-bold w-24 text-center">الوقت</th>
                <th className="py-3 px-4 font-bold w-32 text-left">المبلغ</th>
                <th className="py-3 px-4 font-bold w-20 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">لا توجد حركات مسجلة حتى الآن.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      اضغط على "تسجيل مقبوضات" أو "تسجيل مصروف" أعلاه لإضافة أول حركة.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedTxs.map((t) => {
                  const isInc = t.type === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {isInc ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{t.description}</span>
                        {t.categoryName && t.categoryName !== t.description && (
                          <span className="text-[10px] text-slate-400">{t.categoryName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                          {t.paymentMethod === 'cash' ? (
                            <>
                              <Banknote className="w-3 h-3 text-emerald-600" />
                              <span>نقدي</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 text-blue-600" />
                              <span>شبكة</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                        {formatTime(t.timestamp)}
                      </td>
                      <td className={`py-3 px-4 text-left font-mono font-black text-sm ${isInc ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isInc ? '+' : '-'}{formatCurrency(t.amount)} <span className="text-[10px] font-sans font-normal text-slate-400">ر.س</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditTx(t)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات أو مبلغ الحركة"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الحركة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: Simple Add Transaction Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-right">
            
            {/* Modal Header */}
            <div className={`p-5 flex items-center justify-between text-white ${txType === 'income' ? 'bg-emerald-700' : 'bg-rose-700'}`}>
              <div className="flex items-center gap-2">
                {txType === 'income' ? <PlusCircle className="w-6 h-6" /> : <MinusCircle className="w-6 h-6" />}
                <div>
                  <h3 className="font-black text-base">
                    {editingTxId 
                      ? 'تعديل الحركة المالية' 
                      : txType === 'income' 
                        ? 'تسجيل مقبوضات (دخل)' 
                        : 'تسجيل مصروف (صرف)'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {editingTxId ? 'تعديل بيانات أو مبلغ الحركة المسجلة بالصندوق' : 'إضافة حركة مالية جديدة للصندوق'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddTxModal(false);
                  setEditingTxId(null);
                }}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-black/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    txType === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟢 مقبوضات (دخل)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    txType === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔴 مصروف (صرف)
                </button>
              </div>

              {/* Amount Field (Large & Clear) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">المبلغ *</label>
                  {txAmount && (
                    <button
                      type="button"
                      onClick={() => setTxAmount('')}
                      className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      مسح (C)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    autoFocus
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-2xl font-mono font-black text-slate-900 focus:outline-none"
                  />
                  <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">ر.س</span>
                </div>

                {/* Quick Add Chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">سريع:</span>
                  {[10, 50, 100, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        soundManager.playChipClick();
                        const curr = parseFloat(txAmount) || 0;
                        setTxAmount((curr + val).toFixed(2).replace(/\.00$/, ''));
                      }}
                      className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-mono font-bold rounded-lg border border-slate-200 cursor-pointer"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description & Quick Suggestions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / الوصف</label>
                <input
                  type="text"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder={txType === 'income' ? 'مثال: مبيعات نقدية، خدمة...' : 'مثال: مشتريات، وقود، صيانة...'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                {/* Quick Suggestions Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(txType === 'income' 
                    ? ['مبيعات نقدية', 'خدمة عميل', 'طلبية'] 
                    : ['مشتريات بضاعة', 'وقود ومواصلات', 'صيانة ونظافة', 'ضيافة ونثريات']
                  ).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTxDescription(suggestion)}
                      className="py-0.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxPaymentMethod('cash')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      txPaymentMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>نقدي (كاش)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxPaymentMethod('card')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      txPaymentMethod === 'card'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>شبكة (مدى)</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-3 text-white text-sm font-black rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{editingTxId ? 'حفظ وتحديث التعديل' : 'حفظ وتأكيد العملية'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Today Income */}
      {showEditIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-right">
            <h3 className="font-black text-slate-900 text-sm mb-1">تحديث دخل اليوم الأساسي (الحوباني)</h3>
            <p className="text-xs text-slate-500 mb-4">
              يمكنك تعديل وتحديث دخل اليوم الأساسي أثناء جريان ورديتك ليتم تحديث رصيد الصندوق فوراً.
            </p>
            
            <div className="relative mb-4">
              <input
                type="number"
                step="any"
                min="0"
                value={tempTodayIncome}
                onChange={(e) => setTempTodayIncome(e.target.value)}
                className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-slate-900 focus:outline-none pl-12"
                placeholder="0"
                autoFocus
              />
              <span className="absolute left-3.5 top-3 text-xs text-slate-400 font-bold">ر.س</span>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowEditIncomeModal(false)}
                className="py-2 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveTodayIncome}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تأكيد وحفظ التحديث</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Shift Handover */}
      {showHandoverModal && (
        <ShiftHandoverModal
          report={report}
          currentUser={currentUser}
          onClose={() => setShowHandoverModal(false)}
          onHandoverSuccess={async () => {
            setShowHandoverModal(false);
            setReport(null);
            setTransactions([]);
            await loadActiveData();
          }}
        />
      )}

      {/* MODAL: Print Official A4 Report View */}
      {showPrintModal && (
        <PrintReportView
          report={report}
          transactions={transactions}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
};
