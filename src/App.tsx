/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { MobileShell } from './components/layout/MobileShell';
import { MobileNavTab } from './components/layout/MobileBottomNav';
import { ActiveReportView } from './components/ActiveReportView';
import { HistoricalReportsView } from './components/HistoricalReportsView';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { UserManagerModal } from './components/UserManagerModal';
import { AuditLogsView } from './components/AuditLogsView';
import { ManagerDashboardView } from './components/ManagerDashboardView';
import { storageService } from './services/storage';

export type ExtendedTabType = 'till' | 'transactions' | 'handover' | 'reports' | 'managerHub' | 'categories' | 'users' | 'audit';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, currentUser, isManager, logout } = useAuth();
  const [activeNavTab, setActiveNavTab] = useState<MobileNavTab>(isManager ? 'reports' : 'till');
  const [adminTab, setAdminTab] = useState<'managerHub' | 'categories' | 'users' | 'audit' | null>(isManager ? 'managerHub' : null);
  
  const [tillBalance, setTillBalance] = useState<number>(0);
  const [transactionsCount, setTransactionsCount] = useState<number>(0);
  const [triggerAddTx, setTriggerAddTx] = useState<boolean>(false);
  const [triggerHandover, setTriggerHandover] = useState<boolean>(false);
  const [focusTxSection, setFocusTxSection] = useState<boolean>(false);

  // Sync initial till balance on user change
  useEffect(() => {
    if (currentUser) {
      storageService.getActiveReportForUser(currentUser.id).then(rep => {
        if (rep) {
          setTillBalance(rep.netBalance || 0);
        } else {
          setTillBalance(0);
        }
      });
    }
  }, [currentUser]);

  if (!isAuthenticated || !currentUser) {
    return <LoginView />;
  }

  const handleBalanceChange = (balance: number, txCount: number) => {
    setTillBalance(balance);
    setTransactionsCount(txCount);
  };

  const handleSelectNavTab = (tab: MobileNavTab) => {
    setActiveNavTab(tab);
    setAdminTab(null);

    if (tab === 'till') {
      setFocusTxSection(false);
    } else if (tab === 'transactions') {
      setFocusTxSection(true);
    } else if (tab === 'handover') {
      setTriggerHandover(true);
    } else if (tab === 'reports') {
      setFocusTxSection(false);
    }
  };

  const handleQuickTransaction = () => {
    if (activeNavTab !== 'till' && activeNavTab !== 'transactions') {
      setActiveNavTab('till');
    }
    setTriggerAddTx(true);
  };

  return (
    <MobileShell
      currentUser={currentUser}
      isManager={isManager}
      tillBalance={tillBalance}
      activeNavTab={activeNavTab}
      onSelectNavTab={handleSelectNavTab}
      onQuickTransaction={handleQuickTransaction}
      onLogout={logout}
      transactionsCount={transactionsCount}
    >
      {/* 1. Manager Dedicated Hub (if manager chooses hub or admin functions) */}
      {isManager && adminTab === 'managerHub' && (
        <ManagerDashboardView
          currentUser={currentUser}
          onNavigateTab={(tab) => {
            if (tab === 'history') {
              setActiveNavTab('reports');
              setAdminTab(null);
            } else if (tab === 'categories' || tab === 'users' || tab === 'audit') {
              setAdminTab(tab);
            } else if (tab === 'activeShift') {
              setActiveNavTab('till');
              setAdminTab(null);
            }
          }}
        />
      )}

      {/* 2. Admin Sub-Modals (Categories, Users, Audit) */}
      {isManager && adminTab === 'categories' && <CategoryManagerModal />}
      {isManager && adminTab === 'users' && <UserManagerModal />}
      {isManager && adminTab === 'audit' && <AuditLogsView />}

      {/* 3. Live Till & Transactions View (Active Shift Operations) */}
      {(!adminTab || !isManager) && (activeNavTab === 'till' || activeNavTab === 'transactions' || activeNavTab === 'handover') && (
        <ActiveReportView
          currentUser={currentUser}
          onBalanceChange={handleBalanceChange}
          externalTriggerAddTx={triggerAddTx}
          onResetExternalTriggerAddTx={() => setTriggerAddTx(false)}
          externalTriggerHandover={triggerHandover}
          onResetExternalTriggerHandover={() => setTriggerHandover(false)}
          focusTransactionsSection={focusTxSection}
        />
      )}

      {/* 4. Reports & Archive View */}
      {(!adminTab || !isManager) && activeNavTab === 'reports' && (
        <HistoricalReportsView 
          currentUser={currentUser} 
          onNavigateToActiveShift={() => {
            setActiveNavTab('till');
            setAdminTab(null);
          }}
        />
      )}
    </MobileShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
