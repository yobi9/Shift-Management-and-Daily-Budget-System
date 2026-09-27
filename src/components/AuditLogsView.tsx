/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { storageService } from '../services/storage';
import { ShieldCheck, Clock, User } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await storageService.getAuditLogs();
        setLogs(list);
      } catch (e) {
        console.error('Failed loading audit logs', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">سجل الأنشطة والتدقيق الأمني (Audit Trail)</h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل سجل الأنشطة...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">لا توجد سجلات مسجلة بعد.</div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-40">التاريخ والوقت</th>
                  <th className="p-3 w-32">المستخدم</th>
                  <th className="p-3 w-32">نوع الإجراء</th>
                  <th className="p-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{log.userName}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
