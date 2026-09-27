/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ShiftType, UserRole } from '../types';
import { storageService } from '../services/storage';
import { sha256 } from '../utils/crypto';
import { Users, KeyRound, Unlock, Plus, Check, ShieldAlert } from 'lucide-react';

export const UserManagerModal: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [shiftType, setShiftType] = useState<ShiftType>('morning');
  const [initialPin, setInitialPin] = useState('');

  const loadUsers = async () => {
    const list = await storageService.getUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleResetPin = async (userId: string) => {
    if (!newPin || newPin.length < 4) {
      alert('يرجى إدخال رمز PIN مكون من 4 أرقام على الأقل');
      return;
    }

    try {
      const hashedPin = await sha256(newPin);
      await storageService.updateUserPin(userId, hashedPin);
      setStatusMsg('تم تحديث رمز PIN بنجاح!');
      setEditingUserId(null);
      setNewPin('');
      loadUsers();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e) {
      alert('فشل تحديث رمز PIN');
    }
  };

  const handleUnlockUser = async (userId: string) => {
    await storageService.updateUserLockStatus(userId, 0, null);
    setStatusMsg('تم فك قفل الحساب بنجاح وإعادة تصفير محاولات الدخول.');
    loadUsers();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim() || !initialPin) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const existing = await storageService.getUserByUsername(username.trim().toLowerCase());
      if (existing) {
        alert('اسم المستخدم مسجل مسبقاً، اختر اسماً آخر');
        return;
      }

      const pinHash = await sha256(initialPin);
      const newUser: User = {
        id: 'usr_' + Date.now(),
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        role,
        shiftType,
        pinHash,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString()
      };

      await storageService.saveUser(newUser);
      setShowAddUser(false);
      setUsername('');
      setDisplayName('');
      setInitialPin('');
      setStatusMsg('تمت إضافة الموظف الجديد بنجاح!');
      loadUsers();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e) {
      alert('حدث خطأ أثناء إضافة الموظف');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">إدارة الموظفين ورموز الدخول (PIN)</h2>
          </div>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Add User Drawer */}
        {showAddUser && (
          <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">بيانات الموظف الجديد</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">اسم الدخول (Username) *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: sami"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">الاسم الكامل الظاهر *</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="سامي القحطاني"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">نوع الدور والصلاحية *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-slate-800"
                >
                  <option value="employee">موظف وردية (تشغيلي / كاشير)</option>
                  <option value="manager">مدير نظام (إداري إشرافي فقط)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">الوردية المعتادة</label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as any)}
                  disabled={role === 'manager'}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="morning">الصباحية</option>
                  <option value="evening">المسائية</option>
                  <option value="general">عامة</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">رمز PIN الافتراضي *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={initialPin}
                  onChange={(e) => setInitialPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="py-1 px-3 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="py-1 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                حفظ الموظف
              </button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">الموظف</th>
                <th className="p-3">اسم المستخدم</th>
                <th className="p-3">الدور</th>
                <th className="p-3">الوردية</th>
                <th className="p-3">حالة الأمان والحماية</th>
                <th className="p-3 text-center">إدارة PIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const isLocked = u.lockedUntil && u.lockedUntil > Date.now();

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900">{u.displayName}</td>
                    <td className="p-3 font-mono text-slate-600">{u.username}</td>
                    <td className="p-3 text-slate-600">
                      {u.role === 'manager' ? 'مدير عام / مشرف' : 'موظف وردية'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {u.shiftType === 'morning' ? 'صباحية' : u.shiftType === 'evening' ? 'مسائية' : 'عامة'}
                    </td>
                    <td className="p-3">
                      {isLocked ? (
                        <div className="flex items-center gap-2">
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-semibold text-[10px] flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            <span>مقفل مؤقتاً</span>
                          </span>
                          <button
                            onClick={() => handleUnlockUser(u.id)}
                            className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>فك القفل</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-700 text-[11px]">
                          نشط ({u.failedAttempts || 0} محاولات فاشلة)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editingUserId === u.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="جديد"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                            className="w-20 border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs"
                          />
                          <button
                            onClick={() => handleResetPin(u.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingUserId(null); setNewPin(''); }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingUserId(u.id); setNewPin(''); }}
                          className="py-1 px-2.5 text-[11px] text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>تعيين PIN</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
