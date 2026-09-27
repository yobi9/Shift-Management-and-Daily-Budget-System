/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { Shield, KeyRound, UserCheck, AlertCircle, Clock, Lock, CheckCircle2, RotateCcw } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, isLockedOut, lockoutRemainingSeconds } = useAuth();
  const [username, setUsername] = useState('ahmed');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !pin) {
      setError('يرجى إدخال اسم المستخدم ورمز PIN');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await login(username, pin);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'فشل تسجيل الدخول');
      setPin('');
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  const quickFill = (user: string, userPin: string) => {
    setUsername(user);
    setPin(userPin);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">نظام إدارة الورديات والميزانية</h1>
          <p className="text-sm text-slate-400 mt-1">تسجيل الدخول لجهاز الوردية المشترك</p>
        </div>

        {/* Lockout Warning */}
        {isLockedOut && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 flex items-start gap-3">
            <Clock className="w-5 h-5 mt-0.5 shrink-0 animate-pulse text-rose-400" />
            <div>
              <p className="text-sm font-semibold">الحساب مقفل مؤقتاً لحمايته من التخمين</p>
              <p className="text-xs text-rose-200/80 mt-1">
                يرجى الانتظار <span className="font-bold text-white font-mono">{lockoutRemainingSeconds}</span> ثانية قبل المحاولة مجدداً.
              </p>
            </div>
          </div>
        )}

        {/* Normal Error */}
        {error && !isLockedOut && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الموظف أو المستخدم</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم..."
                disabled={isLockedOut || isLoading}
                className="w-full bg-slate-900/90 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              رمز المرور السري (PIN)
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                disabled={isLockedOut || isLoading}
                className="w-full bg-slate-900/90 border border-slate-700 text-white text-center text-xl tracking-widest font-mono rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Numeric Keypad for fast touch screen POS entry */}
          <div className="pt-2">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isLockedOut || isLoading}
                  onClick={() => handlePinDigit(num)}
                  className="h-11 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-mono text-lg font-bold transition-all active:scale-95 disabled:opacity-40"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={isLockedOut || isLoading}
                onClick={handlePinClear}
                className="h-11 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 text-xs font-medium transition-all active:scale-95 disabled:opacity-40"
              >
                مسح
              </button>
              <button
                type="button"
                disabled={isLockedOut || isLoading}
                onClick={() => handlePinDigit('0')}
                className="h-11 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-mono text-lg font-bold transition-all active:scale-95 disabled:opacity-40"
              >
                0
              </button>
              <button
                type="button"
                disabled={isLockedOut || isLoading}
                onClick={handlePinBackspace}
                className="h-11 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 text-xs font-medium transition-all active:scale-95 disabled:opacity-40"
              >
                ⌫
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLockedOut || isLoading || !pin || !username}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>دخول النظام وتفعيل الجلسة</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <p className="text-xs text-slate-400 mb-2.5 font-medium flex items-center justify-between">
            <span>الحسابات التجريبية السريعة (Demo):</span>
            <span className="text-[10px] text-emerald-400 font-mono">انقر للملء الفوري</span>
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill('ahmed', '1111')}
              className="p-2 bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-right transition-colors"
            >
              <div className="font-semibold text-slate-200 truncate">أحمد (صباحي)</div>
              <div className="text-[10px] text-slate-400 font-mono">PIN: 1111</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill('khalid', '2222')}
              className="p-2 bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-right transition-colors"
            >
              <div className="font-semibold text-slate-200 truncate">خالد (مسائي)</div>
              <div className="text-[10px] text-slate-400 font-mono">PIN: 2222</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill('admin', '1234')}
              className="p-2 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-700/40 rounded-lg text-right transition-colors"
            >
              <div className="font-semibold text-emerald-300 truncate">المدير العام</div>
              <div className="text-[10px] text-emerald-400 font-mono">PIN: 1234</div>
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-700/40 text-center">
            <button
              type="button"
              onClick={async () => {
                try {
                  await storageService.resetAllData();
                  window.location.reload();
                } catch (e) {
                  console.error('Reset error', e);
                }
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="إعادة تهيئة سيناريو التجربة بالكامل (تسليم أحمد المنصور الوردية لخالد السعيد)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة تهيئة سيناريو التجربة (تسليم أحمد ⭠ خالد)</span>
            </button>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="mt-5 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>نظام مشفر ومحمي بخوارزمية SHA-256 مع حظر المحاولات المتكررة</span>
        </div>
      </div>
    </div>
  );
};
