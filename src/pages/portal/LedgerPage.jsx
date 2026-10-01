import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Calendar, Download, Printer, Filter } from 'lucide-react';

export default function LedgerPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Daily Book / General Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-entry daily cash book and customer debit/credit accounts ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Print export will be enabled in Reports Module.')}
            className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <Printer className="w-4 h-4" />
            Print Ledger
          </button>
          <button
            onClick={() => alert('PDF export will be enabled in Reports Module.')}
            className="px-3.5 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date & Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Opening Balance Today</span>
          <div className="text-xl font-bold text-slate-900 mt-1">₹ 45,200.00</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Today Net Inflow</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">+ ₹ 18,300.00</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Closing Cash Balance</span>
          <div className="text-xl font-bold text-brand-primary mt-1">₹ 63,500.00</div>
        </div>
      </div>

      {/* Ledger Table Placeholder */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Date: August 3, 2026</span>
          </div>
          <span className="text-xs text-slate-500">Live Entries: 4</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Particulars / Account</th>
                <th className="px-4 py-3">Ref No</th>
                <th className="px-4 py-3 text-right">Debit (Spent)</th>
                <th className="px-4 py-3 text-right">Credit (Received)</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">09:00 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Opening Balance Brought Forward</td>
                <td className="px-4 py-3 text-slate-400">-</td>
                <td className="px-4 py-3 text-right font-mono">-</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">₹ 45,200.00</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹ 45,200.00</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">09:45 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Payment received from Ramesh Transport</td>
                <td className="px-4 py-3 text-slate-400">UPI/998231</td>
                <td className="px-4 py-3 text-right font-mono">-</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">₹ 15,000.00</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹ 60,200.00</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">11:20 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Diesel Fuel expense (Vehicle KA-25-1020)</td>
                <td className="px-4 py-3 text-slate-400">CSH/1042</td>
                <td className="px-4 py-3 text-right font-mono text-rose-600">₹ 3,500.00</td>
                <td className="px-4 py-3 text-right font-mono">-</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹ 56,700.00</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">02:15 PM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Service collection from Patil Brothers</td>
                <td className="px-4 py-3 text-slate-400">UPI/771029</td>
                <td className="px-4 py-3 text-right font-mono">-</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">₹ 6,800.00</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹ 63,500.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
