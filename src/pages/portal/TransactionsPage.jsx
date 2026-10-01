import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Receipt, Search, Filter, Plus, Download } from 'lucide-react';

export default function TransactionsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Transaction Records
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and review all business transactions, payments, and receipts.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => alert('New Transaction creation form will be added in Module Phase.')}
            className="px-3.5 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Record Transaction
          </button>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, customer name, notes, reference..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
            <option>All Types (Income & Expense)</option>
            <option>Income Only</option>
            <option>Expense Only</option>
            <option>Pending Credit</option>
          </select>
          <select className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
            <option>All Payment Methods</option>
            <option>UPI</option>
            <option>Cash</option>
            <option>Bank Transfer</option>
            <option>Cheque</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Customer / Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">TXN-8801</td>
                <td className="px-4 py-3">03 Aug 2026, 09:45 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">Ramesh Transport Services</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">Material Purchase</span></td>
                <td className="px-4 py-3">UPI (GPay)</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">+ ₹ 15,000</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Paid
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">TXN-8802</td>
                <td className="px-4 py-3">03 Aug 2026, 11:20 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-900">HP Fuel Station</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">Fuel Expense</span></td>
                <td className="px-4 py-3">Cash</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">- ₹ 3,500</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Paid
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
