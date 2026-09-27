/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../../types';
import { formatCurrency } from '../../utils/dateFormatter';
import { 
  Building2, 
  LogOut, 
  MapPin, 
  ChevronDown, 
  User as UserIcon,
  Shield,
  Clock
} from 'lucide-react';

interface MobileHeaderProps {
  currentUser: User;
  isManager: boolean;
  tillBalance: number;
  branchName?: string;
  onLogout: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentUser,
  isManager,
  tillBalance,
  branchName = 'فرع الرياض الرئيسي #101',
  onLogout
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const shiftLabel = currentUser.shiftType === 'morning' ? 'وردية صباحية' : 'وردية مسائية';

  return (
    <>
      {/* Sticky Fixed Header: 56px fixed compact height with subtle elevation */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 z-40 shadow-xs px-4 select-none">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-2">
          
          {/* Left / Start: User Profile Avatar & Branch Indicator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(prev => !prev)}
              aria-expanded={showProfileMenu}
              aria-label="خيارات الحساب والفرع"
              className="flex items-center gap-2 p-1 -m-1 rounded-xl hover:bg-slate-100/80 active:bg-slate-200/70 transition-colors cursor-pointer min-h-[44px]"
            >
              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-slate-200/80">
                {currentUser.displayName ? currentUser.displayName.charAt(0) : <UserIcon className="w-4 h-4" />}
              </div>

              {/* Branch & User Indicator */}
              <div className="text-right leading-tight hidden xs:block sm:block">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <span>{currentUser.displayName}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </div>
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                  <span className="truncate max-w-[120px]">{branchName}</span>
                </div>
              </div>
            </button>

            {/* Quick Profile / Branch / Session Sheet Dropdown */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-right"
              >
                <div className="pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{currentUser.displayName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                      {isManager ? 'مدير' : shiftLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{branchName}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-[11px] text-slate-600 rounded-lg bg-slate-50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>نوع الوردية</span>
                    </span>
                    <span className="font-bold text-slate-800">{shiftLabel}</span>
                  </div>

                  <div className="px-2 py-1.5 text-[11px] text-slate-600 rounded-lg bg-slate-50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>الصلاحية</span>
                    </span>
                    <span className="font-bold text-slate-800">{currentUser.role === 'manager' ? 'مدير نظام' : 'أمين صندوق'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج من الجهاز</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Center Brand Marker (Compact & clean) */}
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs pointer-events-none">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">نظام الصندوق السريع</span>
          </div>

          {/* Right / End: Live Till Balance Widget (Read-Only Visual Pill) */}
          <div className="flex items-center gap-1.5">
            <div 
              aria-label={`رصيد الصندوق المباشر ${formatCurrency(tillBalance)} ريال`}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-2xs transition-colors ${
                tillBalance >= 0 
                  ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-900' 
                  : 'bg-rose-50/90 border-rose-300/80 text-rose-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-800/80 font-bold hidden xs:inline">الدرج:</span>
              <span className="text-xs sm:text-sm font-black font-mono tracking-tight">
                {formatCurrency(tillBalance)}
              </span>
              <span className="text-[10px] font-sans font-bold opacity-80">ر.س</span>
            </div>
          </div>

        </div>
      </header>

      {/* Backdrop overlay for profile menu */}
      {showProfileMenu && (
        <div 
          onClick={() => setShowProfileMenu(false)}
          className="fixed inset-0 z-35 bg-black/10 backdrop-blur-2xs"
          aria-hidden="true"
        />
      )}
    </>
  );
};
