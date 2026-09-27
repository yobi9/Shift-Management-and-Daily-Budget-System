/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShiftReport, Transaction, User, ReportSnapshot } from '../types';
import { storageService } from '../services/storage';
import { PrintReportView } from './PrintReportView';
import { SnapshotDetailsModal } from './SnapshotDetailsModal';
import { exportReportDataToPdf } from '../utils/pdfExport';
import { formatDate, formatTime, formatDateTime, formatCurrency } from '../utils/dateFormatter';
import { 
  History, 
  Search, 
  Calendar, 
  FileText, 
  Printer, 
  Lock, 
  CheckCircle, 
  Clock, 
  ArrowLeftRight, 
  Archive,
  Download,
  Loader2,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  User as UserIcon,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';

interface HistoricalReportsViewProps {
  currentUser: User;
  onNavigateToActiveShift?: () => void;
}

type EmployeeTab = 'delivered' | 'received' | 'myHistory';

export const HistoricalReportsView: React.FC<HistoricalReportsViewProps> = ({ 
  currentUser,
  onNavigateToActiveShift
}) => {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ShiftReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Employee Specific 3-Tabs state
  const [employeeTab, setEmployeeTab] = useState<EmployeeTab>('delivered');

  // Snapshot modal state
  const [viewingSnapshot, setViewingSnapshot] = useState<ReportSnapshot | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  // PDF direct export state
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // Search & Filter controls
  const [searchDate, setSearchDate] = useState('');
  const [filterShiftType, setFilterShiftType] = useState<'all' | 'morning' | 'evening'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'archived' | 'active'>('all');

  const loadHistoricalReports = async () => {
    setIsLoading(true);
    try {
      await storageService.init();
      const allReports = await storageService.getReports();

      // Sort newest first
      const sorted = [...allReports].sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );

      // Access filter:
      // Manager sees everything.
      // Employee sees records concerning their own identity/handover.
      const accessibleReports = currentUser.role === 'manager'
        ? sorted
        : sorted.filter(r => 
            r.userId === currentUser.id || 
            r.handover?.handedOverToUserId === currentUser.id ||
            r.handover?.handedOverByUserId === currentUser.id
          );

      setReports(accessibleReports);

      // Preselect first if available
      if (accessibleReports.length > 0 && !selectedReport) {
        handleSelectReport(accessibleReports[0]);
      }
    } catch (err) {
      console.error('Failed loading reports', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistoricalReports();
  }, [currentUser]);

  // Filter based on employee tab or manager general filters
  useEffect(() => {
    let list = [...reports];

    if (currentUser.role === 'employee') {
      if (employeeTab === 'delivered') {
        // وردياتي المُسلّمة: Stages completed and handed over by this employee
        list = list.filter(r => 
          r.userId === currentUser.id && 
          (r.handover != null || r.deliveredSnapshot != null || r.status === 'submitted' || r.status === 'archived')
        );
      } else if (employeeTab === 'received') {
        // وردياتي المُستلَمة: Stages received by this employee from a previous shift
        list = list.filter(r => 
          (r.userId === currentUser.id && (r.receivedSnapshot != null || r.previousReportId != null || r.carriedBalanceFromPrevious != null)) ||
          r.handover?.handedOverToUserId === currentUser.id
        );
      } else if (employeeTab === 'myHistory') {
        // أرشيف الورديات والتسليم الخاص بي: All shifts touched by this employee
        list = list.filter(r => 
          r.userId === currentUser.id || 
          r.handover?.handedOverToUserId === currentUser.id ||
          r.handover?.handedOverByUserId === currentUser.id
        );
      }
    }

    if (searchDate) {
      list = list.filter(r => r.date.includes(searchDate));
    }

    if (filterShiftType !== 'all') {
      list = list.filter(r => r.shiftType === filterShiftType);
    }

    if (filterStatus !== 'all') {
      list = list.filter(r => r.status === filterStatus);
    }

    setFilteredReports(list);

    // Keep selected report valid
    if (selectedReport && !list.find(r => r.id === selectedReport.id)) {
      setSelectedReport(list.length > 0 ? list[0] : null);
    } else if (!selectedReport && list.length > 0) {
      handleSelectReport(list[0]);
    }
  }, [searchDate, filterShiftType, filterStatus, reports, employeeTab, currentUser.role]);

  const handleSelectReport = async (report: ShiftReport) => {
    setSelectedReport(report);

    // Priority: frozenSnapshot > transactions
    if (report.frozenSnapshot?.transactions) {
      setSelectedTransactions(report.frozenSnapshot.transactions);
    } else {
      const txs = await storageService.getTransactionsByReportId(report.id);
      setSelectedTransactions(txs);
    }
  };

  const handleDirectDownloadPdf = async (e: React.MouseEvent, report: ShiftReport) => {
    e.stopPropagation();
    setDownloadingReportId(report.id);
    try {
      let txs: Transaction[] = [];
      if (report.frozenSnapshot?.transactions) {
        txs = report.frozenSnapshot.transactions;
      } else {
        txs = await storageService.getTransactionsByReportId(report.id);
      }

      await exportReportDataToPdf(report, txs);
      setDownloadSuccessMsg(`تم تصدير تقرير ${report.reportNumber} بصيغة PDF بنجاح!`);
      setTimeout(() => setDownloadSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Direct PDF export error', err);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handleArchiveReport = async (reportId: string) => {
    if (!selectedReport) return;
    if (window.confirm('هل تريد اعتماد وأرشفة هذا التقرير نهائياً؟')) {
      const updated = {
        ...selectedReport,
        status: 'archived' as const,
        updatedAt: new Date().toISOString()
      };
      await storageService.saveReport(updated, currentUser.id);
      setSelectedReport(updated);
      loadHistoricalReports();
    }
  };

  // Pre-calculated counts for employee tabs
  const deliveredCount = reports.filter(r => 
    r.userId === currentUser.id && (r.handover != null || r.deliveredSnapshot != null || r.status === 'submitted')
  ).length;

  const receivedCount = reports.filter(r => 
    (r.userId === currentUser.id && (r.receivedSnapshot != null || r.previousReportId != null || r.carriedBalanceFromPrevious != null)) ||
    r.handover?.handedOverToUserId === currentUser.id
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            <span>
              {currentUser.role === 'manager' 
                ? 'أرشيف الورديات وسجلات التسليم التاريخية (الإدارة)' 
                : 'سجل مسؤوليتي ووردياتي والتسليم'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser.role === 'manager' 
              ? 'مراقبة وتدقيق شامل لكافة الورديات ومحاضر التسليم ولقطات الاستلام والتسليم لجميع الموظفين.'
              : 'استعراض دقيق لما استلمته (Received Snapshot)، وما سلّمته (Delivered Snapshot)، وتاريخ إخلاء ذمتك المالي.'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="border border-slate-200 bg-white text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="تصفية حسب التاريخ"
          />

          <select
            value={filterShiftType}
            onChange={(e) => setFilterShiftType(e.target.value as any)}
            className="border border-slate-200 bg-white text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">كافة الورديات</option>
            <option value="morning">الصباحية</option>
            <option value="evening">المسائية</option>
          </select>

          {currentUser.role === 'manager' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-slate-200 bg-white text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">كافة الحالات</option>
              <option value="submitted">مُسلّم ومؤكد</option>
              <option value="archived">مؤرشف نهائي</option>
              <option value="active">نشط حالي</option>
            </select>
          )}
        </div>
      </div>

      {/* Employee Specific Tabs (1. وردياتي المُسلّمة - 2. وردياتي المُستلَمة - 3. أرشيف الوردية الخاص بي) */}
      {currentUser.role === 'employee' && (
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            onClick={() => setEmployeeTab('delivered')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              employeeTab === 'delivered'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
            <span>1. وردياتي المُسلّمة ({deliveredCount})</span>
          </button>

          <button
            onClick={() => setEmployeeTab('received')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              employeeTab === 'received'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. وردياتي المُستلَمة ({receivedCount})</span>
          </button>

          <button
            onClick={() => setEmployeeTab('myHistory')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              employeeTab === 'myHistory'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>3. أرشيف الورديات والتسليم الخاص بي</span>
          </button>
        </div>
      )}

      {/* Success notification banner */}
      {downloadSuccessMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccessMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-sm">جاري جلب سجلات الأرشيف...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Reports List (4 Cols) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-bold text-slate-600 px-1 mb-2 flex items-center justify-between">
              <span>السجلات المتاحة ({filteredReports.length})</span>
              <span className="text-[10px] text-slate-400">انقر للعرض والتفاصيل</span>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                {currentUser.role === 'employee' && employeeTab === 'delivered' && 'لم تقم بتسليم أي ورديات سابقة حتى الآن.'}
                {currentUser.role === 'employee' && employeeTab === 'received' && 'لا توجد ورديات مستلمة مسجلة لك.'}
                {currentUser.role === 'employee' && employeeTab === 'myHistory' && 'لا توجد سجلات تاريخية مسجلة لحسابك.'}
                {currentUser.role === 'manager' && 'لا توجد تقارير مطابقة للشروط المحددة.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
                {filteredReports.map((rep) => {
                  const isSelected = selectedReport?.id === rep.id;
                  const isMorning = rep.shiftType === 'morning';
                  const isDownloadingThis = downloadingReportId === rep.id;
                  const isDeliveredByMe = rep.userId === currentUser.id && (rep.handover != null || rep.deliveredSnapshot != null);
                  const isReceivedByMe = rep.userId === currentUser.id && (rep.receivedSnapshot != null || rep.carriedBalanceFromPrevious != null);

                  return (
                    <div
                      key={rep.id}
                      onClick={() => handleSelectReport(rep)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-right relative group ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rep.reportNumber}
                          </span>
                          {rep.stageNumber && (
                            <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                              isSelected ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'
                            }`}>
                              المرحلة {rep.stageNumber}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            rep.status === 'submitted'
                              ? isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                              : rep.status === 'archived'
                                ? isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'
                                : isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {rep.status === 'submitted' ? 'مُسلّمة ومقفلة' : rep.status === 'archived' ? 'مؤرشف نهائي' : 'نشطة حالياً'}
                          </span>

                          {/* Quick PDF export icon */}
                          <button
                            type="button"
                            onClick={(e) => handleDirectDownloadPdf(e, rep)}
                            disabled={isDownloadingThis}
                            className={`p-1 rounded-lg transition-colors ${
                              isSelected
                                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-100'
                            }`}
                            title="تصدير وتحميل PDF سريع"
                          >
                            {isDownloadingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs mt-2">
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {isMorning ? 'الوردية الصباحية' : 'الوردية المسائية'}
                          </p>
                          <p className={`text-[11px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                            الموظف: {rep.employeeName}
                          </p>
                        </div>
                        <div className="text-left">
                          <span className={`text-[11px] block ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{formatDate(rep.date)}</span>
                          <span className={`font-mono font-bold text-sm ${isSelected ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {formatCurrency(rep.netBalance)} ر.س
                          </span>
                        </div>
                      </div>

                      {rep.handover && (
                        <div className={`mt-2 pt-2 border-t text-[10px] flex items-center justify-between ${
                          isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                        }`}>
                          <span>سُلّمت إلى: <strong>{rep.handover.handedOverToName}</strong></span>
                          <span>{formatTime(rep.handover.handedOverAt)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Report Snapshot Viewer (8 Cols) */}
          <div className="lg:col-span-8">
            {selectedReport ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                
                {/* Snapshot Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                          {selectedReport.reportNumber}
                        </span>
                        {selectedReport.continuousReportId && (
                          <span className="text-[11px] bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded">
                            السياق المستمر: {selectedReport.continuousReportId}
                          </span>
                        )}
                        {selectedReport.status !== 'active' && (
                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>مغلقة تاريخياً (Read-Only)</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">
                        تقرير {selectedReport.shiftType === 'morning' ? 'الوردية الصباحية' : 'الوردية المسائية'} - {formatDate(selectedReport.date)}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        مسؤول هذه المرحلة: <strong>{selectedReport.employeeName}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Direct PDF Export */}
                      <button
                        onClick={(e) => handleDirectDownloadPdf(e, selectedReport)}
                        disabled={downloadingReportId === selectedReport.id}
                        type="button"
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        {downloadingReportId === selectedReport.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري التصدير...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>تصدير PDF</span>
                          </>
                        )}
                      </button>

                      {/* Print View modal */}
                      <button
                        onClick={() => setShowPrintModal(true)}
                        type="button"
                        className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>معاينة وطباعة</span>
                      </button>

                      {/* Archive (Admin only) */}
                      {currentUser.role === 'manager' && selectedReport.status === 'submitted' && (
                        <button
                          onClick={() => handleArchiveReport(selectedReport.id)}
                          type="button"
                          className="py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-xl transition-colors border border-blue-200 flex items-center gap-1"
                          title="اعتماد نهائي وأرشفة"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>أرشفة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Snapshots Accountability Section: ماذا استلمت؟ وماذا سلّمت؟ */}
                <div className="m-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>محاضر المساءلة واللقطات المعتمدة (Snapshots)</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      محفوظة بشكل ثابت وغير قابلة للتعديل
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Received Snapshot Card */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-amber-600" />
                          <span>1. لقطة الاستلام (Received)</span>
                        </span>
                        {selectedReport.receivedSnapshot ? (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingSnapshot(selectedReport.receivedSnapshot || null);
                              setShowSnapshotModal(true);
                            }}
                            className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            معاينة اللقطة
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">افتتاح أساسي</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          دخل اليوم الأساسي (الحوباني):{' '}
                          <strong className="font-mono text-slate-900">
                            {formatCurrency(selectedReport.receivedSnapshot?.openingCash ?? selectedReport.carriedBalanceFromPrevious ?? selectedReport.todayIncome)} ر.س
                          </strong>
                        </p>
                        {selectedReport.receivedSnapshot?.counterpartName && (
                          <p className="text-[11px] text-slate-500">
                            مستلمة من الزميل: <strong>{selectedReport.receivedSnapshot.counterpartName}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2. Delivered Snapshot Card */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                          <span>2. لقطة التسليم (Delivered)</span>
                        </span>
                        {selectedReport.deliveredSnapshot ? (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingSnapshot(selectedReport.deliveredSnapshot || null);
                              setShowSnapshotModal(true);
                            }}
                            className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            معاينة اللقطة
                          </button>
                        ) : selectedReport.handover ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            مسلّمة بمحضر رسمي
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">قيد العمل</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        {selectedReport.handover ? (
                          <>
                            <p>
                              الرصيد الصافي المسلّم:{' '}
                              <strong className="font-mono text-slate-900">
                                {formatCurrency(selectedReport.netBalance)} ر.س
                              </strong>
                            </p>
                            <p className="text-[11px] text-slate-500">
                              سُلّمت إلى: <strong>{selectedReport.handover.handedOverToName}</strong> ({formatTime(selectedReport.handover.handedOverAt)})
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-400">لم يتم تسليم هذه الوردية بعد.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handover Official Verification Box if present */}
                {selectedReport.handover && (
                  <div className="mx-5 mb-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>محضر تسليم الوردية المعتمد برمز PIN السري</span>
                      </span>
                      <span className="font-mono text-emerald-700">
                        {formatDateTime(selectedReport.handover.handedOverAt)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                      <div>
                        <span className="text-slate-500 block text-[11px]">المسلّم:</span>
                        <strong className="text-slate-900">{selectedReport.handover.handedOverByName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">المستلم:</span>
                        <strong className="text-slate-900">{selectedReport.handover.handedOverToName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">الصافي المسلّم:</span>
                        <strong className="font-mono text-emerald-700">{formatCurrency(selectedReport.netBalance)} ر.س</strong>
                      </div>
                    </div>
                    {selectedReport.handover.handoverNotes && (
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-emerald-100">
                        <strong>ملاحظات التسليم: </strong>{selectedReport.handover.handoverNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Financial Overview (Integrated model: Net = todayIncome + Incomes - Expenses) */}
                <div className="px-5 mb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                    <div>
                      <span className="text-[11px] text-slate-500 block">دخل اليوم الأساسي (الحوباني)</span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {formatCurrency(selectedReport.carriedBalanceFromPrevious ?? selectedReport.todayIncome)} ر.س
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">إجمالي الإيرادات (+)</span>
                      <span className="text-sm font-bold font-mono text-emerald-600">+{formatCurrency(selectedReport.totalIncomes)} ر.س</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">إجمالي المصروفات (-)</span>
                      <span className="text-sm font-bold font-mono text-rose-600">-{formatCurrency(selectedReport.totalExpenses)} ر.س</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">الصافي بالدرج (=)</span>
                      <span className="text-sm font-black font-mono text-slate-900">{formatCurrency(selectedReport.netBalance)} ر.س</span>
                    </div>
                  </div>
                </div>

                {/* Frozen Transactions List */}
                <div className="px-5 pb-5">
                  <h3 className="text-xs font-bold text-slate-800 mb-2">
                    تفاصيل المعاملات المسجلة بهذه المرحلة ({selectedTransactions.length})
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-12 text-center">النوع</th>
                          <th className="p-2.5">البيان والوصف</th>
                          <th className="p-2.5">الموظف المسؤول</th>
                          <th className="p-2.5">الفئة</th>
                          <th className="p-2.5">طريقة الدفع</th>
                          <th className="p-2.5">الوقت</th>
                          <th className="p-2.5 text-left">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-slate-400">
                              لا توجد معاملات مسجلة
                            </td>
                          </tr>
                        ) : (
                          selectedTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 text-center">
                                <span className={`inline-block font-mono font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {tx.type === 'income' ? '+' : '-'}
                                </span>
                              </td>
                              <td className="p-2.5 font-medium text-slate-800">
                                <div>{tx.description}</div>
                                {tx.isCarriedOver && (
                                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded font-normal">
                                    مرحّلة مع العهدة
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-600 font-semibold text-[11px]">
                                {tx.createdByName || tx.createdBy}
                              </td>
                              <td className="p-2.5 text-slate-600">{tx.categoryName}</td>
                              <td className="p-2.5 text-slate-600">
                                {tx.paymentMethod === 'cash' ? 'نقدي' : tx.paymentMethod === 'card' ? 'شبكة' : tx.paymentMethod === 'transfer' ? 'تحويل' : 'أخرى'}
                              </td>
                              <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                                {formatTime(tx.timestamp)}
                              </td>
                              <td className="p-2.5 text-left font-mono font-bold">
                                <span className={tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}>
                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)} ر.س
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                اختر تقريراً من القائمة لمعاينة محتوياته وتفاصيل تسليم الوردية.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Printable Report Modal */}
      {showPrintModal && selectedReport && (
        <PrintReportView
          report={selectedReport}
          transactions={selectedTransactions}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Snapshot Details Modal */}
      {showSnapshotModal && viewingSnapshot && (
        <SnapshotDetailsModal
          isOpen={showSnapshotModal}
          snapshot={viewingSnapshot}
          onClose={() => {
            setShowSnapshotModal(false);
            setViewingSnapshot(null);
          }}
        />
      )}

    </div>
  );
};
