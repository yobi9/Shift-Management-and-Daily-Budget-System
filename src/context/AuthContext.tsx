/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { sha256 } from '../utils/crypto';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isManager: boolean;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  lockSession: () => void;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'shift_app_session_user_id';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes auto-lock

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Initialize DB and restore session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await storageService.init();
        const savedUserId = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedUserId && isMounted) {
          const user = await storageService.getUserById(savedUserId);
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Failed restoring auth session', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!isLockedOut) return;
    const interval = setInterval(() => {
      setLockoutRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsLockedOut(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut]);

  // Inactivity auto-lock
  useEffect(() => {
    if (!isAuthenticated) return;

    const onUserActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('mousemove', onUserActivity);
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('click', onUserActivity);
    window.addEventListener('touchstart', onUserActivity);

    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        console.warn('الجلسة أغلقت تلقائياً بسبب عدم النشاط.');
        lockSession();
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('click', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, lastActivity]);

  const refreshCurrentUser = useCallback(async () => {
    if (!currentUser) return;
    const updated = await storageService.getUserById(currentUser.id);
    if (updated) {
      setCurrentUser(updated);
    }
  }, [currentUser]);

  const login = async (username: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await storageService.init();
      const user = await storageService.getUserByUsername(username.trim().toLowerCase());
      if (!user) {
        return { success: false, error: 'اسم المستخدم غير صحيح' };
      }

      // Check if user is locked
      const now = Date.now();
      if (user.lockedUntil && user.lockedUntil > now) {
        const remaining = Math.ceil((user.lockedUntil - now) / 1000);
        setIsLockedOut(true);
        setLockoutRemainingSeconds(remaining);
        return { success: false, error: `الحساب مقفل مؤقتاً لحمايته من محاولات التخمين. يرجى الانتظار ${remaining} ثانية.` };
      }

      // Hash input PIN with SHA-256
      const hashedInput = await sha256(pin);

      if (hashedInput !== user.pinHash) {
        const attempts = (user.failedAttempts || 0) + 1;
        let lockUntil: number | null = null;
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          lockUntil = now + LOCKOUT_DURATION_MS;
          setIsLockedOut(true);
          setLockoutRemainingSeconds(60);
          await storageService.updateUserLockStatus(user.id, attempts, lockUntil);
          await storageService.logAction(user.id, user.displayName, 'قفل الحساب', 'تجاوز الحد الأقصى لمحاولات تسجيل الدخول');
          return {
            success: false,
            error: `تم إدخال رمز PIN خاطئ ${attempts} مرات. تم قفل الحساب مؤقتاً لمدة 60 ثانية.`
          };
        } else {
          await storageService.updateUserLockStatus(user.id, attempts, null);
          return {
            success: false,
            error: `رمز PIN غير صحيح. المحاولات المتبقية قبل القفل: ${MAX_FAILED_ATTEMPTS - attempts}`
          };
        }
      }

      // Successful login
      await storageService.updateUserLockStatus(user.id, 0, null);
      user.failedAttempts = 0;
      user.lockedUntil = null;

      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsLockedOut(false);
      localStorage.setItem(SESSION_STORAGE_KEY, user.id);

      await storageService.logAction(user.id, user.displayName, 'تسجيل دخول', 'تسجيل دخول ناجح إلى النظام');

      return { success: true };
    } catch (err: any) {
      console.error('Login error', err);
      return { success: false, error: err?.message || 'حدث خطأ أثناء المصادقة' };
    }
  };

  const logout = () => {
    if (currentUser) {
      storageService.logAction(currentUser.id, currentUser.displayName, 'تسجيل خروج', 'تسجيل خروج يدوي');
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const lockSession = () => {
    if (currentUser) {
      storageService.logAction(currentUser.id, currentUser.displayName, 'قفل الشاشة', 'قفل الشاشة المؤقت للجهاز المشترك');
    }
    setIsAuthenticated(false);
  };

  const isManager = currentUser?.role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isManager,
        isLockedOut,
        lockoutRemainingSeconds,
        login,
        logout,
        lockSession,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
