/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Edit3 } from 'lucide-react';
import { formatCurrency } from '../utils/dateFormatter';

interface QuickBudgetBarProps {
  todayIncome: number;
  carriedBalanceFromPrevious?: number;
  totalIncomes: number;
  totalExpenses: number;
  netBalance: number;
  isEditable?: boolean;
  onEditTodayIncome?: () => void;
}

export const QuickBudgetBar: React.FC<QuickBudgetBarProps> = ({
  todayIncome,
  carriedBalanceFromPrevious,
  totalIncomes,
  totalExpenses,
  netBalance,
  isEditable = false,
  onEditTodayIncome
}) => {
  const baseIncome = carriedBalanceFromPrevious != null && carriedBalanceFromPrevious > 0 
    ? carriedBalanceFromPrevious 
    : todayIncome;
  
  const totalRevenue = baseIncome + totalIncomes;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      
      {/* 1. دخل اليوم الأساسي */}
      <div className="bg-emerald-50/70 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>دخل اليوم الأساسي</span>
          </span>
          {isEditable && onEditTodayIncome && (
            <button
              onClick={onEditTodayIncome}
              type="button"
              className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold flex items-center gap-1 hover:underline"
              title="تعديل دخل اليوم الأساسي"
            >
              <Edit3 className="w-3 h-3" />
              <span>تعديل</span>
            </button>
          )}
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-950">
            {formatCurrency(baseIncome)}
          </div>
          <span className="text-xs text-emerald-800 font-bold font-sans">ر.س</span>
        </div>
        <div className="text-[11px] text-emerald-700 font-medium mt-1">
          المبلغ الأساسي المعتمد في رأس التقرير
        </div>
      </div>

      {/* 2. إجمالي الإيرادات والواردات */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-bold text-emerald-700 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>إجمالي الواردات الإضافية (+)</span>
          </span>
          <span className="text-[11px] text-emerald-600 font-mono font-bold">مقبوضات</span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 tracking-tight">
            +{formatCurrency(totalIncomes)}
          </div>
          <span className="text-xs text-slate-500 font-bold font-sans">ر.س</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          مجموع الإيرادات المسجلة بالوردية
        </div>
      </div>

      {/* 3. إجمالي المصروفات والمدفوعات */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-bold text-rose-700 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <span>إجمالي المصروفات والمدفوعات (-)</span>
          </span>
          <span className="text-[11px] text-rose-600 font-mono font-bold">مدفوعات</span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 tracking-tight">
            -{formatCurrency(totalExpenses)}
          </div>
          <span className="text-xs text-slate-500 font-bold font-sans">ر.س</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          مجموع المصروفات المخصومة
        </div>
      </div>

      {/* 4. الصافي / الباقي المتبقي بالصندوق */}
      <div className="bg-sky-50 border-2 border-sky-400 rounded-2xl p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-black text-sky-950 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-sky-700" />
            <span>الصافي / الباقي المتبقي</span>
          </span>
          <span className="text-[10px] bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded-full font-bold">
            رصيد الصندوق
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${netBalance >= 0 ? 'text-sky-950' : 'text-rose-600'}`}>
            {formatCurrency(netBalance)}
          </div>
          <span className="text-xs text-sky-800 font-bold font-sans">ر.س</span>
        </div>
        <div className="text-[11px] text-sky-800 font-medium mt-1">
          دخل اليوم الأساسي + الواردات - المصروفات
        </div>
      </div>

    </div>
  );
};
