import React from 'react';
import { ShieldCheck, Lock, Eye, AlertTriangle } from 'lucide-react';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Security & System Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin security log tracking user logins, transaction edits, and system changes.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 font-bold text-xs">
          Admin Confidential
        </span>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Event / Action</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-center">Security Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">03 Aug 2026, 10:30 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Shrishail (Owner)</td>
                <td className="px-4 py-3">User session authenticated successfully</td>
                <td className="px-4 py-3 font-mono text-slate-500">103.21.14.92</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">03 Aug 2026, 09:45 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Shrishail (Owner)</td>
                <td className="px-4 py-3">Created transaction entry TXN-8801</td>
                <td className="px-4 py-3 font-mono text-slate-500">103.21.14.92</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
