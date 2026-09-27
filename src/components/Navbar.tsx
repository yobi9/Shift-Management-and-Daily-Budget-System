/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Clock, 
  History, 
  LogOut, 
  FolderKanban,
  Users,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { formatDateFull } from '../utils/dateFormatter';

export type TabType = 'managerHub' | 'activeShift' | 'history' | 'categories' | 'users' | 'audit';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, isManager, logout } = useAuth();

  const shiftLabel = currentUser?.shiftType === 'morning' 
    ? 'وردية صباحية' 
    : currentUser?.shiftType === 'evening' 
      ? 'وردية مسائية' 
      : 'عام';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Right side (RTL): Brand and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-base leading-tight">
                نظام إدارة الصندوق
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {formatDateFull(new Date())}
              </p>
            </div>
          </div>

          {/* Center: Simplified Clean Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            {isManager ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('managerHub')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'managerHub'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                  <span>لوحة الإشراف والمتابعة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span>أرشيف التقارير</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'categories'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 text-amber-600" />
                  <span>التصنيفات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>الموظفين</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'audit'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <span>سجل الأمان</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('activeShift')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'activeShift'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>الوردية الحالية (الصندوق)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span>أرشيف الورديات السابقة</span>
                </button>
              </>
            )}
          </nav>

          {/* Left Controls & User Profile */}
          <div className="flex items-center gap-3">
            {/* User Details */}
            <div className="text-left md:text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs font-bold text-slate-900">{currentUser?.displayName}</span>
                {isManager ? (
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.5 rounded-md">
                    مدير
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 font-medium px-1.5 py-0.5 rounded-md">
                    {shiftLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200"></div>

            {/* Logout button */}
            <button
              type="button"
              title="تسجيل الخروج"
              onClick={logout}
              className="py-1.5 px-3 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer border border-slate-200 hover:border-rose-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>

        </div>

        {/* Mobile Sub-Navigation */}
        <div className="md:hidden py-2 border-t border-slate-100 flex items-center justify-around gap-1">
          {isManager ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('managerHub')}
                className={`py-1 px-2 text-[11px] font-bold rounded-lg ${activeTab === 'managerHub' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                الإشراف
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`py-1 px-2 text-[11px] font-bold rounded-lg ${activeTab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                الأرشيف
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`py-1 px-2 text-[11px] font-bold rounded-lg ${activeTab === 'categories' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                التصنيفات
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`py-1 px-2 text-[11px] font-bold rounded-lg ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                الموظفين
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('activeShift')}
                className={`py-1 px-3 text-xs font-bold rounded-lg ${activeTab === 'activeShift' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                الوردية الحالية
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`py-1 px-3 text-xs font-bold rounded-lg ${activeTab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                سجل الورديات
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
