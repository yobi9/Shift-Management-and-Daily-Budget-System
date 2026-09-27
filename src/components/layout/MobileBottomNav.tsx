/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Wallet, 
  Receipt, 
  ArrowLeftRight, 
  FileText, 
  Plus
} from 'lucide-react';

export type MobileNavTab = 'till' | 'transactions' | 'handover' | 'reports';

interface MobileBottomNavProps {
  activeTab: MobileNavTab;
  onSelectTab: (tab: MobileNavTab) => void;
  onQuickTransaction: () => void;
  transactionsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onQuickTransaction,
  transactionsCount = 0
}) => {
  return (
    <nav 
      aria-label="التنقل السفلي الرئيسي"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] select-none"
    >
      <div className="max-w-lg mx-auto relative h-16 flex items-center justify-between px-3">
        
        {/* Tab 1: Live Till (Home) */}
        <button
          type="button"
          onClick={() => onSelectTab('till')}
          aria-label="الدرج والصندوق المباشر"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] h-full py-1 transition-all rounded-xl cursor-pointer ${
            activeTab === 'till'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <div className="relative">
            <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'till' ? 'scale-110 text-emerald-600' : ''}`} />
            {activeTab === 'till' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">الصندوق</span>
        </button>

        {/* Tab 2: Transactions */}
        <button
          type="button"
          onClick={() => onSelectTab('transactions')}
          aria-label="سجل الحركات والمعاملات"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] h-full py-1 transition-all rounded-xl cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <div className="relative">
            <Receipt className={`w-5 h-5 transition-transform ${activeTab === 'transactions' ? 'scale-110 text-emerald-600' : ''}`} />
            {transactionsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-slate-900 text-white text-[9px] font-mono font-bold px-1 rounded-full min-w-[14px] text-center">
                {transactionsCount}
              </span>
            )}
            {activeTab === 'transactions' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">الحركات</span>
        </button>

        {/* CENTER FLOATING ACTION BUTTON (FAB): Quick Transaction (+ / -) */}
        <div className="relative flex-none w-16 flex items-center justify-center">
          <div className="absolute -top-6">
            <button
              type="button"
              onClick={onQuickTransaction}
              aria-label="تسجيل حركة مالية سريعة جديدة (إيراد أو مصروف)"
              title="تسجيل حركة سريعة (+ / -)"
              className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-90 text-white shadow-xl shadow-slate-900/30 ring-4 ring-white flex flex-col items-center justify-center transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-slate-300 -mt-0.5">
                حركة
              </span>
            </button>
          </div>
        </div>

        {/* Tab 3: Handover */}
        <button
          type="button"
          onClick={() => onSelectTab('handover')}
          aria-label="تسليم الوردية للزميل"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] h-full py-1 transition-all rounded-xl cursor-pointer ${
            activeTab === 'handover'
              ? 'text-sky-700 font-bold'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <div className="relative">
            <ArrowLeftRight className={`w-5 h-5 transition-transform ${activeTab === 'handover' ? 'scale-110 text-sky-600' : ''}`} />
            {activeTab === 'handover' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">تسليم</span>
        </button>

        {/* Tab 4: Reports */}
        <button
          type="button"
          onClick={() => onSelectTab('reports')}
          aria-label="التقارير وسجل الأرشيف"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] h-full py-1 transition-all rounded-xl cursor-pointer ${
            activeTab === 'reports'
              ? 'text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <div className="relative">
            <FileText className={`w-5 h-5 transition-transform ${activeTab === 'reports' ? 'scale-110 text-blue-600' : ''}`} />
            {activeTab === 'reports' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">التقارير</span>
        </button>

      </div>
    </nav>
  );
};
