/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from '../../types';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav, MobileNavTab } from './MobileBottomNav';

interface MobileShellProps {
  currentUser: User;
  isManager: boolean;
  tillBalance: number;
  branchName?: string;
  activeNavTab: MobileNavTab;
  onSelectNavTab: (tab: MobileNavTab) => void;
  onQuickTransaction: () => void;
  onLogout: () => void;
  transactionsCount?: number;
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  currentUser,
  isManager,
  tillBalance,
  branchName,
  activeNavTab,
  onSelectNavTab,
  onQuickTransaction,
  onLogout,
  transactionsCount = 0,
  children
}) => {
  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-x-hidden overflow-y-hidden flex flex-col bg-slate-100/60 text-slate-800 antialiased font-sans select-none">
      
      {/* 1. Sticky Information Header (Fixed 56px, Read-only visual data, zero interactive inputs) */}
      <MobileHeader
        currentUser={currentUser}
        isManager={isManager}
        tillBalance={tillBalance}
        branchName={branchName}
        onLogout={onLogout}
      />

      {/* 2. Scrollable Ergonomic Viewport Body */}
      {/* Enforces overflow-x: hidden and defensive bottom padding (pb-24 = 96px) to protect inputs from bottom nav */}
      <main 
        id="mobile-main-viewport"
        className="flex-1 overflow-y-auto overflow-x-hidden pt-14 pb-24 px-3 sm:px-6 w-full max-w-5xl mx-auto"
        tabIndex={-1}
      >
        <div className="py-3">
          {children}
        </div>
      </main>

      {/* 3. Thumb-Optimized Fixed Footer (Fixed bottom: 0, 48px target rows + Center Oversized FAB) */}
      <MobileBottomNav
        activeTab={activeNavTab}
        onSelectTab={onSelectNavTab}
        onQuickTransaction={onQuickTransaction}
        transactionsCount={transactionsCount}
      />

    </div>
  );
};
